'use client';

import { SkipForward, Trophy } from 'lucide-react';
import { CoverArt } from '@/components/CoverArt';
import { PlayButton } from '@/components/PlayButton';
import { ShareButton } from '@/components/ShareButton';
import { Countdown } from '@/components/Countdown';
import { FullTrackPlayer } from '@/components/FullTrackPlayer';
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
}: ResultCardProps) {
  const strings = useStrings();
  const won = state.status === 'won';

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
        </>
      ) : (
        <>
          <ShareButton state={state} song={song} />
          <Countdown />
        </>
      )}
    </section>
  );
}
