import type { AudioProvider } from '@/lib/audio/provider';
import { createProvider } from '@/lib/audio/provider';
import type { Song, StemName } from '@/lib/game/types';

/** Fade aplicado no inicio e no fim de cada trecho, para nao estalar. */
export const FADE_SECONDS = 0.08;

/** Folga de agendamento: garante que todas as trilhas comecem no mesmo instante. */
const SCHEDULE_LOOKAHEAD = 0.06;

export interface PlayTrack {
  id: string;
  buffer: AudioBuffer;
  muted?: boolean;
  /** Recorte de frequencia opcional (modo Banda sobre musica sem stems). */
  band?: { low: number | null; high: number | null };
}

export interface PlayRequest {
  tracks: PlayTrack[];
  /** Trecho liberado, em segundos. */
  duration: number;
  onEnded?: () => void;
}

interface ActiveTrack {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

type AudioContextConstructor = new () => AudioContext;

/** Categoria de audio do WebKit (Safari 16.4+). */
interface AudioSession {
  type: 'auto' | 'playback' | 'transient' | 'transient-solo' | 'ambient' | 'play-and-record';
}

/**
 * Faz o som ignorar a chave de silencioso do aparelho.
 *
 * No iOS, o Web Audio sai por padrao na categoria "ambient", que o botao de
 * silencioso corta — mesmo com o volume no maximo. Um <audio> comum tocaria,
 * o AudioContext nao. Declarar a categoria "playback" resolve; em navegadores
 * sem a API, nao faz nada.
 */
function claimPlaybackSession(): void {
  const session = (navigator as Navigator & { audioSession?: AudioSession }).audioSession;
  if (session) session.type = 'playback';
}

function resolveAudioContext(): AudioContextConstructor {
  const w = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) throw new Error('Web Audio API indisponivel neste navegador');
  return Ctor;
}

/**
 * Motor de reproducao. Usa Web Audio (e nao <audio>) porque o jogo precisa de
 * corte exato no milissegundo, fade sem clique e varias trilhas em sincronia.
 */
/** Ganho inicial: previas comerciais chegam muito altas em volume cheio. */
const DEFAULT_GAIN = 0.36;

export class AudioEngine {
  private context: AudioContext | null = null;
  /** Envelope de fade de cada trecho. */
  private master: GainNode | null = null;
  /** Volume escolhido pelo usuario — separado do fade para um nao apagar o outro. */
  private output: GainNode | null = null;
  private volume = DEFAULT_GAIN;
  private active: Map<string, ActiveTrack> = new Map();
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private startedAt = 0;
  private playingDuration = 0;
  private readonly cache = new Map<string, AudioBuffer>();

  constructor(private readonly provider: AudioProvider = createProvider()) {}

  /** O AudioContext so nasce em resposta a um gesto do usuario. */
  getContext(): AudioContext {
    if (!this.context) {
      claimPlaybackSession();
      const Ctor = resolveAudioContext();
      this.context = new Ctor();

      this.output = this.context.createGain();
      this.output.gain.value = this.volume;
      this.output.connect(this.context.destination);

      this.master = this.context.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.output);
    }
    return this.context;
  }

  /**
   * Volume geral (0 a 1). Aplica na hora se ja houver som tocando e vale para
   * as proximas reproducoes. Nao cria o AudioContext: sem gesto do usuario o
   * navegador deixaria o contexto suspenso.
   */
  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value));
    if (!this.context || !this.output) return;
    this.output.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.02);
  }

  getVolume(): number {
    return this.volume;
  }

  /**
   * Retoma o contexto. Precisa ser chamado dentro do gesto do usuario, senao
   * o navegador mantem o audio suspenso. No iOS o estado tambem pode virar
   * "interrupted" (ligacao, outro app tocando), e dai o resume e necessario
   * de novo.
   */
  async resume(): Promise<void> {
    const ctx = this.getContext();
    if (ctx.state !== 'running') await ctx.resume();
  }

  /** Estado do contexto, para a interface conseguir explicar o silencio. */
  get state(): AudioContextState | 'uninitialized' {
    return this.context?.state ?? 'uninitialized';
  }

  private async cached(key: string, load: () => Promise<AudioBuffer | null>) {
    const hit = this.cache.get(key);
    if (hit) return hit;
    const buffer = await load();
    if (buffer) this.cache.set(key, buffer);
    return buffer;
  }

  async loadClip(song: Song): Promise<AudioBuffer> {
    const ctx = this.getContext();
    const buffer = await this.cached(`${song.id}:clip`, () => this.provider.loadClip(song, ctx));
    if (!buffer) throw new Error(`Sem audio para "${song.title}"`);
    return buffer;
  }

  /**
   * Carrega as trilhas do modo Banda. Devolve o mapa completo antes de tocar,
   * para que todas comecem juntas — e cede o event loop entre uma e outra para
   * a UI conseguir animar o carregamento.
   */
  async loadStems(
    song: Song,
    stems: readonly StemName[],
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<Map<StemName, AudioBuffer>> {
    const ctx = this.getContext();
    const result = new Map<StemName, AudioBuffer>();

    for (const [i, stem] of stems.entries()) {
      const buffer = await this.cached(`${song.id}:${stem}`, () =>
        this.provider.loadStem(song, stem, ctx),
      );
      if (buffer) result.set(stem, buffer);
      onProgress?.(i + 1, stems.length);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return result;
  }

  get isPlaying(): boolean {
    return this.active.size > 0;
  }

  /** Segundos ja tocados do trecho atual. */
  getElapsed(): number {
    if (!this.context || !this.isPlaying) return 0;
    return Math.min(this.playingDuration, Math.max(0, this.context.currentTime - this.startedAt));
  }

  play({ tracks, duration, onEnded }: PlayRequest): void {
    this.stop();
    if (tracks.length === 0 || duration <= 0) return;

    const ctx = this.getContext();
    const master = this.master;
    if (!master) return;

    const startAt = ctx.currentTime + SCHEDULE_LOOKAHEAD;
    const endAt = startAt + duration;
    const fade = Math.min(FADE_SECONDS, duration / 2);

    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0, startAt);
    master.gain.linearRampToValueAtTime(1, startAt + fade);
    master.gain.setValueAtTime(1, endAt - fade);
    master.gain.linearRampToValueAtTime(0, endAt);

    for (const track of tracks) {
      const source = ctx.createBufferSource();
      source.buffer = track.buffer;

      const gain = ctx.createGain();
      gain.gain.value = track.muted ? 0 : 1;

      // Q de Butterworth: as bandas somadas remontam o espectro sem ressonancia.
      let node: AudioNode = source;
      if (track.band?.low) {
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = track.band.low;
        highpass.Q.value = Math.SQRT1_2;
        node = node.connect(highpass);
      }
      if (track.band?.high) {
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = track.band.high;
        lowpass.Q.value = Math.SQRT1_2;
        node = node.connect(lowpass);
      }

      node.connect(gain).connect(master);
      // Mesmo `startAt` para todas as trilhas => mixagem em sincronia perfeita.
      source.start(startAt, 0, Math.min(duration, track.buffer.duration));
      source.stop(endAt + 0.02);

      this.active.set(track.id, { source, gain });
    }

    this.startedAt = startAt;
    this.playingDuration = duration;
    this.stopTimer = setTimeout(
      () => {
        this.clearTracks();
        onEnded?.();
      },
      (duration + SCHEDULE_LOOKAHEAD) * 1000,
    );
  }

  /** Liga/desliga uma trilha ja tocando, sem cortar a reproducao. */
  setMuted(id: string, muted: boolean): void {
    const track = this.active.get(id);
    if (!track || !this.context) return;
    const now = this.context.currentTime;
    track.gain.gain.cancelScheduledValues(now);
    track.gain.gain.setValueAtTime(track.gain.gain.value, now);
    track.gain.gain.linearRampToValueAtTime(muted ? 0 : 1, now + 0.04);
  }

  stop(): void {
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    if (!this.context || this.active.size === 0) {
      this.clearTracks();
      return;
    }

    const ctx = this.context;
    const now = ctx.currentTime;
    if (this.master) {
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0, now + 0.05);
    }

    for (const { source } of this.active.values()) {
      try {
        source.stop(now + 0.06);
      } catch {
        /* ja parou */
      }
    }
    this.clearTracks();
  }

  private clearTracks(): void {
    this.active.clear();
    this.startedAt = 0;
    this.playingDuration = 0;
  }
}

let singleton: AudioEngine | null = null;

export function getEngine(): AudioEngine {
  if (!singleton) singleton = new AudioEngine();
  return singleton;
}
