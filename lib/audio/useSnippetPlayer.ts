'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getEngine, type PlayTrack } from '@/lib/audio/engine';
import { FREQUENCY_LAYERS } from '@/lib/audio/layers';
import { snippetStart, startSeed } from '@/lib/audio/startPoint';
import { songUsesStems } from '@/lib/game/catalog';
import {
  MAX_ATTEMPTS,
  SNIPPET_STEPS,
  STEM_ORDER,
  type GameMode,
  type Song,
  type StemName,
} from '@/lib/game/types';

const FULL_DURATION = SNIPPET_STEPS[SNIPPET_STEPS.length - 1] ?? 16;

export type AudioStatus = 'idle' | 'loading' | 'ready' | 'error' | 'blocked';

export interface SnippetPlayerOptions {
  song: Song | null;
  mode: GameMode;
  /** Nivel liberado: 0 = 0,2s, 5 = 15s. Ignorado quando `revealed`. */
  level: number;
  /**
   * Semente do ponto de partida. Mesma musica + mesma semente = mesmo trecho,
   * entao o sorteio nao muda entre tentativas nem entre jogadores da sala.
   */
  seed: number | string;
  /** Partida encerrada: toca a musica inteira, sem corte e sem filtro. */
  revealed: boolean;
  /** Espaco toca/para. Desligue em telas com mais de um player. */
  spaceToPlay?: boolean;
}

export interface SnippetPlayer {
  status: AudioStatus;
  playing: boolean;
  /** Segundos ja tocados, para o playhead da barra. */
  elapsed: number;
  muted: Set<string>;
  /** Duracao liberada agora, em segundos. */
  unlocked: number;
  /** Camadas liberadas no modo Banda (trilhas ou faixas de frequencia). */
  unlockedCount: number;
  toggle: () => void;
  toggleTrack: (id: string) => void;
  play: () => void;
  stop: () => void;
}

/**
 * Reproducao de um trecho: carrega, corta no ponto sorteado e revela camadas.
 *
 * Vive fora das telas porque os tres modos (diario/livre, duelo e sala) mostram
 * layouts diferentes em cima exatamente do mesmo comportamento de audio.
 */
export function useSnippetPlayer({
  song,
  mode,
  level,
  seed,
  revealed,
  spaceToPlay = true,
}: SnippetPlayerOptions): SnippetPlayer {
  const [status, setStatus] = useState<AudioStatus>('idle');
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const frame = useRef<number | null>(null);

  const unlocked = revealed ? FULL_DURATION : (SNIPPET_STEPS[level] ?? FULL_DURATION);
  const unlockedCount = revealed ? MAX_ATTEMPTS : Math.min(level + 1, MAX_ATTEMPTS);

  const stop = useCallback(() => {
    getEngine().stop();
    setPlaying(false);
    setElapsed(0);
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  // Toda jogada (e toda troca de musica) corta o audio.
  useEffect(() => {
    stop();
    setMuted(new Set());
  }, [level, song?.id, revealed, stop]);

  const trackElapsed = useCallback(() => {
    setElapsed(getEngine().getElapsed());
    frame.current = requestAnimationFrame(trackElapsed);
  }, []);

  const play = useCallback(async () => {
    if (!song) return;
    const engine = getEngine();

    setStatus('loading');
    try {
      await engine.resume();

      // Se o contexto nao entrou em "running", nao adianta seguir: sairia
      // silencio sem explicacao. Acontece quando o navegador exige um gesto
      // novo ou quando o iOS interrompeu o audio (ligacao, outro app).
      if (engine.state !== 'running') {
        setStatus('blocked');
        return;
      }

      let tracks: PlayTrack[];
      let duration: number;

      // Ponto de partida sorteado uma vez por partida: sem isso todo trecho
      // comecaria no refrao, que e onde as previas ja vem cortadas.
      const start = startSeed(song.id, seed);
      let offset = 0;

      if (mode === 'trecho') {
        const buffer = await engine.loadClip(song);
        offset = snippetStart(buffer, start, FULL_DURATION);
        tracks = [{ id: 'clip', buffer }];
        duration = Math.min(unlocked, buffer.duration - offset);
      } else if (songUsesStems(song)) {
        const open = STEM_ORDER.slice(0, unlockedCount) as StemName[];
        const buffers = await engine.loadStems(song, open);
        if (buffers.size === 0) throw new Error('sem trilhas para esta musica');
        tracks = [...buffers.entries()].map(([stem, buffer]) => ({
          id: stem,
          buffer,
          muted: muted.has(stem),
        }));
        // A mixagem inteira sai do mesmo ponto: basta medir uma trilha.
        const reference = tracks[0]?.buffer;
        offset = reference ? snippetStart(reference, start, FULL_DURATION) : 0;
        duration = Math.min(FULL_DURATION, (reference?.duration ?? FULL_DURATION) - offset);
      } else {
        // Sem trilhas isoladas: revela o espectro em camadas.
        const buffer = await engine.loadClip(song);
        const open = FREQUENCY_LAYERS.slice(0, unlockedCount);

        // Na revelacao final toca o clipe inteiro, sem filtro nenhum.
        tracks = revealed
          ? [{ id: 'full', buffer }]
          : open.map((layer) => ({
              id: layer.id,
              buffer,
              muted: muted.has(layer.id),
              band: { low: layer.low, high: layer.high },
            }));
        offset = snippetStart(buffer, start, FULL_DURATION);
        duration = Math.min(FULL_DURATION, buffer.duration - offset);
      }

      setStatus('ready');
      setPlaying(true);
      engine.play({ tracks, duration, offset, onEnded: stop });
      frame.current = requestAnimationFrame(trackElapsed);
    } catch {
      setStatus('error');
      setPlaying(false);
    }
  }, [song, mode, seed, unlocked, unlockedCount, revealed, muted, stop, trackElapsed]);

  const toggle = useCallback(() => {
    if (playing) {
      stop();
      return;
    }
    void play();
  }, [playing, play, stop]);

  // Espaco toca/para, desde que o foco nao esteja em um campo de texto.
  useEffect(() => {
    if (!spaceToPlay) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      event.preventDefault();
      toggle();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle, spaceToPlay]);

  const toggleTrack = useCallback((id: string) => {
    setMuted((current) => {
      const next = new Set(current);
      const willMute = !next.has(id);
      if (willMute) next.add(id);
      else next.delete(id);
      getEngine().setMuted(id, willMute);
      return next;
    });
  }, []);

  return {
    status,
    playing,
    elapsed,
    muted,
    unlocked,
    unlockedCount,
    toggle,
    toggleTrack,
    play: () => void play(),
    stop,
  };
}
