import { renderMix, renderStem, SYNTH_DURATION } from '@/lib/audio/synth';
import type { Song, StemName } from '@/lib/game/types';

/**
 * Provedor de audio plugavel. Trocar a fonte do audio (arquivos locais, previas
 * de API ou geracao procedural) e trocar a implementacao desta interface —
 * nem a UI nem o motor de reproducao mudam.
 */
export interface AudioProvider {
  readonly name: string;
  /** Clipe completo usado no modo Trecho. */
  loadClip(song: Song, ctx: BaseAudioContext): Promise<AudioBuffer>;
  /** Trilha isolada do modo Banda. `null` quando a fonte nao tem stems. */
  loadStem(song: Song, stem: StemName, ctx: BaseAudioContext): Promise<AudioBuffer | null>;
}

function toAudioBuffer(ctx: BaseAudioContext, samples: Float32Array): AudioBuffer {
  const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
  buffer.copyToChannel(samples, 0);
  return buffer;
}

async function decode(ctx: BaseAudioContext, url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao baixar audio (${response.status}): ${url}`);
  return ctx.decodeAudioData(await response.arrayBuffer());
}

/** Gera as faixas na hora, sem nenhum arquivo externo. */
export class SynthProvider implements AudioProvider {
  readonly name = 'synth';

  async loadClip(song: Song, ctx: BaseAudioContext): Promise<AudioBuffer> {
    if (!song.synth) throw new Error(`Musica "${song.id}" nao tem spec de sintese`);
    return toAudioBuffer(ctx, renderMix(song.synth, ctx.sampleRate));
  }

  async loadStem(song: Song, stem: StemName, ctx: BaseAudioContext): Promise<AudioBuffer | null> {
    if (!song.synth) return null;
    return toAudioBuffer(ctx, renderStem(song.synth, stem, ctx.sampleRate));
  }
}

/** Le arquivos de /public/audio. */
export class LocalFileProvider implements AudioProvider {
  readonly name = 'local';

  async loadClip(song: Song, ctx: BaseAudioContext): Promise<AudioBuffer> {
    if (!song.clip) throw new Error(`Musica "${song.id}" nao tem clipe local`);
    return decode(ctx, song.clip);
  }

  async loadStem(song: Song, stem: StemName, ctx: BaseAudioContext): Promise<AudioBuffer | null> {
    const url = song.stems?.[stem];
    return url ? decode(ctx, url) : null;
  }
}

/**
 * Previas oficiais de 30s (Deezer / iTunes), resolvidas pelo Route Handler
 * `/api/preview` para evitar CORS e nao expor chaves no cliente.
 *
 * Previas nao tem trilhas isoladas: este provedor nao serve o modo Banda.
 */
export class PreviewApiProvider implements AudioProvider {
  readonly name = 'preview';

  /**
   * Baixa a previa direto do CDN, que aceita CORS. So se isso falhar e que o
   * audio passa pelo proxy — sem essa distincao, todo o trafego de audio
   * atravessaria o nosso servidor.
   */
  private async decodeWithFallback(
    ctx: BaseAudioContext,
    direct: string | undefined,
    proxied: string,
  ): Promise<AudioBuffer> {
    if (direct) {
      try {
        return await decode(ctx, direct);
      } catch {
        /* CDN sem CORS ou fora do ar: cai no proxy */
      }
    }
    return decode(ctx, proxied);
  }

  async loadClip(song: Song, ctx: BaseAudioContext): Promise<AudioBuffer> {
    // URL fixa (iTunes) pode ser usada direto; a do Deezer expira e vem por `ref`.
    if (song.clip && /^https?:\/\//.test(song.clip)) {
      return this.decodeWithFallback(
        ctx,
        song.clip,
        `/api/preview/stream?src=${encodeURIComponent(song.clip)}`,
      );
    }

    const query = new URLSearchParams({ artist: song.artist, title: song.title });
    if (song.previewId) query.set('ref', song.previewId);
    const response = await fetch(`/api/preview?${query.toString()}`);
    if (!response.ok) throw new Error(`Previa indisponivel para "${song.title}"`);

    const data = (await response.json()) as { url?: string; stream?: string };
    if (!data.stream) throw new Error(`Nenhuma previa encontrada para "${song.title}"`);
    return this.decodeWithFallback(ctx, data.url, data.stream);
  }

  async loadStem(): Promise<AudioBuffer | null> {
    return null;
  }
}

/** Escolhe o provedor musica a musica, respeitando o override de ambiente. */
export class CompositeProvider implements AudioProvider {
  readonly name = 'auto';

  private readonly providers: Record<Song['source'], AudioProvider> = {
    synth: new SynthProvider(),
    local: new LocalFileProvider(),
    preview: new PreviewApiProvider(),
  };

  private pick(song: Song): AudioProvider {
    return this.providers[song.source] ?? this.providers.synth;
  }

  loadClip(song: Song, ctx: BaseAudioContext): Promise<AudioBuffer> {
    return this.pick(song).loadClip(song, ctx);
  }

  loadStem(song: Song, stem: StemName, ctx: BaseAudioContext): Promise<AudioBuffer | null> {
    return this.pick(song).loadStem(song, stem, ctx);
  }
}

/** Provedor ativo, definido por NEXT_PUBLIC_AUDIO_PROVIDER. */
export function createProvider(): AudioProvider {
  switch (process.env.NEXT_PUBLIC_AUDIO_PROVIDER) {
    case 'local':
      return new LocalFileProvider();
    case 'preview':
      return new PreviewApiProvider();
    case 'synth':
      return new SynthProvider();
    default:
      return new CompositeProvider();
  }
}

/** Duracao esperada do clipe, usada pela barra de progresso antes do carregamento. */
export function expectedClipDuration(song: Song): number {
  return song.source === 'synth' ? SYNTH_DURATION : 30;
}
