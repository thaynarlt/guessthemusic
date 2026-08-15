'use client';

import { useEffect, useState } from 'react';
import { SkipForward, Trophy } from 'lucide-react';
import { CoverArt } from '@/components/CoverArt';
import { GuessDistribution, type DistributionHighlight } from '@/components/GuessDistribution';
import { PlayButton } from '@/components/PlayButton';
import { ShareButton } from '@/components/ShareButton';
import { Countdown } from '@/components/Countdown';
import { FullTrackPlayer } from '@/components/FullTrackPlayer';
import { resultFromState, type Stats } from '@/lib/game/stats';
import {
  fetchGlobalDistribution,
  topPercent,
  type GlobalDistribution,
} from '@/lib/stats/global';
import type { FreeScore } from '@/store/useGameStore';
import type { GameState, Song } from '@/lib/game/types';
import { useStrings } from '@/store/useSettings';

interface ResultCardProps {
  state: GameState;
  song: Song;
  playing: boolean;
  loading: boolean;
  onTogglePlay: () => void;
  /** Presente apenas no modo livre: segue para a proxima musica. */
  onNext?: () => void;
  score?: FreeScore;
  /** Estatisticas locais do modo — base do grafico quando nao ha dados globais. */
  stats?: Stats;
}

/** Tela final: revela a musica em tom neutro, com o clipe completo liberado. */
export function ResultCard({
  state,
  song,
  playing,
  loading,
  onTogglePlay,
  onNext,
  score,
  stats,
}: ResultCardProps) {
  const strings = useStrings();
  const won = state.status === 'won';
  const isDaily = onNext === undefined;

  const [global, setGlobal] = useState<GlobalDistribution | null>(null);

  // O resultado ja foi enviado ao terminar a partida; aqui so buscamos o
  // agregado do dia. Sem backend a resposta e nula e o grafico cai no local.
  useEffect(() => {
    if (!isDaily) return;
    let active = true;
    void fetchGlobalDistribution(state.mode, state.puzzleNumber).then((result) => {
      if (active) setGlobal(result);
    });
    return () => {
      active = false;
    };
  }, [isDaily, state.mode, state.puzzleNumber]);

  const highlight: DistributionHighlight = won ? state.attempts.length : 'x';
  const percent = global ? topPercent(global, resultFromState(state)) : null;

  // Com backend: como foi a galera hoje. Sem backend: o seu proprio historico.
  const chart = global
    ? { values: global.distribution, losses: global.losses, total: global.players }
    : stats
      ? {
          values: stats.distribution,
          losses: Math.max(0, stats.played - stats.wins),
          total: stats.played,
        }
      : null;

  return (
    <section className="surface animate-pop-in space-y-4 p-4" aria-live="polite">
      <p
        className={`flex items-center justify-center gap-2 text-center font-display text-lg font-bold ${
          won ? 'text-neon-500' : ''
        }`}
      >
        {won && <Trophy size={20} aria-hidden="true" />}
        {won ? strings.won : strings.lost}
      </p>

      <div className="flex items-center gap-4">
        <CoverArt song={song} size={88} />
        <div className="min-w-0 flex-1">
          {!won && <p className="text-xs muted">{strings.answerWas}</p>}
          <p className="truncate text-lg font-bold">{song.title}</p>
          <p className="truncate text-sm muted">
            {song.artist} · {song.year}
          </p>
        </div>
        <PlayButton playing={playing} loading={loading} onToggle={onTogglePlay} size="md" />
      </div>

      {isDaily && chart && chart.total > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-baseline justify-between gap-2 text-xs font-bold uppercase tracking-wide muted">
            {global ? strings.statsGlobalDistribution : strings.statsDistribution}
            {global && (
              <span className="font-semibold normal-case tracking-normal">
                {global.players} {strings.statsPlayers}
              </span>
            )}
          </h3>
          <GuessDistribution
            values={chart.values}
            losses={chart.losses}
            highlight={highlight}
          />
          {percent !== null && (
            <p className="pt-1 text-center text-sm font-semibold">
              {strings.statsTopPercent.replace('{pct}', String(percent))}
            </p>
          )}
        </section>
      )}

      <FullTrackPlayer song={song} />

      {onNext ? (
        <>
          <button type="button" className="btn-primary w-full" onClick={onNext} autoFocus>
            {strings.nextSong}
            <SkipForward size={18} aria-hidden="true" />
          </button>
          {score && score.rounds > 0 && (
            <p className="text-center text-sm muted">
              {strings.sessionScore}: {score.wins}/{score.rounds}
            </p>
          )}
          <ShareButton state={state} song={song} variant="livre" />
        </>
      ) : (
        <>
          <ShareButton state={state} song={song} variant="diario" />
          <Countdown />
        </>
      )}
    </section>
  );
}
