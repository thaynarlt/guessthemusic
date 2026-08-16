'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { AttemptList } from '@/components/AttemptList';
import { AudioDeck } from '@/components/AudioDeck';
import { GenrePicker } from '@/components/GenrePicker';
import { GuessInput } from '@/components/GuessInput';
import { HowToModal } from '@/components/HowToModal';
import { ResultCard } from '@/components/ResultCard';
import { StatsModal } from '@/components/StatsModal';
import { useSnippetPlayer } from '@/lib/audio/useSnippetPlayer';
import { songUsesStems } from '@/lib/game/catalog';
import { attemptsRemaining, unlockedLevel } from '@/lib/game/machine';
import {
  formatSeconds,
  sessionId,
  SNIPPET_STEPS,
  type GameMode,
  type GameVariant,
  type Song,
} from '@/lib/game/types';
import { freeRound, genreFilter, resolveDaily } from '@/lib/puzzle/today';
import { useGameStore } from '@/store/useGameStore';
import { useAutoHowTo, useSettings, useStrings } from '@/store/useSettings';

const FULL_DURATION = SNIPPET_STEPS[SNIPPET_STEPS.length - 1] ?? 16;

/** Quantas musicas guardar no historico para nao repetir no modo livre. */
const RECENT_MEMORY = 8;

interface GameScreenProps {
  mode: GameMode;
  variant?: GameVariant;
}

export function GameScreen({ mode, variant = 'diario' }: GameScreenProps) {
  const strings = useStrings();
  const markHowToSeen = useSettings((state) => state.markHowToSeen);
  const freeGenre = useSettings((state) => state.freeGenre);
  const setFreeGenre = useSettings((state) => state.setFreeGenre);
  const autoHowTo = useAutoHowTo();

  const session = sessionId(variant, mode);
  const game = useGameStore((state) => state.games[session]);
  const stats = useGameStore((state) => state.stats[mode]);
  const freeScore = useGameStore((state) => state.free[session]);
  const feedback = useGameStore((state) => state.lastFeedback);
  const startDaily = useGameStore((state) => state.startDaily);
  const startFree = useGameStore((state) => state.startFree);
  const guess = useGameStore((state) => state.guess);
  const skip = useGameStore((state) => state.skip);

  const [answer, setAnswer] = useState<Song | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const recent = useRef<string[]>([]);

  const isFree = variant === 'livre';

  // A resposta depende da data (ou de um sorteio): resolver so no cliente evita
  // divergencia de hidratacao com o HTML gerado no servidor.
  useEffect(() => {
    let active = true;

    if (isFree) {
      const song = freeRound(mode, recent.current, genreFilter(freeGenre));
      recent.current = [song.id, ...recent.current].slice(0, RECENT_MEMORY);
      setAnswer(song);
      setLabel(`#${round}`);
      startFree(mode, round, song.id);
      return;
    }

    void resolveDaily(mode).then((daily) => {
      if (!active) return;
      setAnswer(daily.song);
      setLabel(`#${daily.puzzleNumber}`);
      startDaily(mode, daily.puzzleNumber, daily.song.id);
    });

    return () => {
      active = false;
    };
  }, [mode, isFree, round, freeGenre, startDaily, startFree]);

  useEffect(() => {
    if (autoHowTo) setShowHowTo(true);
  }, [autoHowTo]);

  const player = useSnippetPlayer({
    song: answer,
    mode,
    level: game ? unlockedLevel(game) : 0,
    seed: game?.puzzleNumber ?? 0,
    revealed: game !== undefined && game.status !== 'playing',
  });

  const { stop } = player;

  const onGuess = useCallback(
    (song: Song) => {
      if (answer) guess(variant, mode, song, answer);
    },
    [guess, variant, mode, answer],
  );

  const nextRound = useCallback(() => {
    stop();
    setRound((current) => current + 1);
  }, [stop]);

  const modeName = mode === 'trecho' ? strings.modeTrechoName : strings.modeBandaName;

  if (!answer || !game) {
    return (
      <>
        <AppHeader backHref="/" onHowTo={() => setShowHowTo(true)} />
        <div className="surface h-64 animate-pulse" aria-label={strings.loadingAudio} />
      </>
    );
  }

  const finished = game.status !== 'playing';
  const last = game.attempts[game.attempts.length - 1];
  const resultLabel = last
    ? last.result === 'correct'
      ? strings.resultCorrect
      : last.result === 'artist'
        ? strings.resultArtist
        : last.result === 'skipped'
          ? strings.resultSkipped
          : strings.resultWrong
    : '';

  return (
    <>
      <AppHeader
        backHref="/"
        onHowTo={() => setShowHowTo(true)}
        onStats={isFree ? undefined : () => setShowStats(true)}
      />

      <main className="flex flex-1 flex-col gap-5">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-2xl font-extrabold">
            {modeName}
            {isFree && (
              <span className="ml-2 rounded-full bg-neon-500/20 px-2 py-0.5 align-middle text-xs font-bold text-neon-600 dark:text-neon-400">
                {strings.freeMode}
              </span>
            )}
          </h1>
          <span className="text-sm muted">{label}</span>
        </div>

        {isFree && (
          <GenrePicker
            value={freeGenre}
            onChange={(genre) => {
              setFreeGenre(genre);
              // Troca de genero comeca uma musica nova na hora.
              setRound((current) => current + 1);
            }}
          />
        )}

        <AudioDeck
          player={player}
          song={answer}
          mode={mode}
          interactive={songUsesStems(answer) || !finished}
        />

        <p aria-live="polite" className="sr-only">
          {resultLabel && `${resultLabel}. ${attemptsRemaining(game)} ${strings.attemptsLeft}.`}
        </p>

        <AttemptList
          attempts={game.attempts}
          shakeNonce={feedback?.session === session ? feedback.nonce : 0}
        />

        {finished ? (
          <ResultCard
            state={game}
            song={answer}
            playing={player.playing}
            loading={player.status === 'loading'}
            onTogglePlay={player.toggle}
            {...(isFree
              ? { onNext: nextRound, score: freeScore ?? { rounds: 0, wins: 0 } }
              : { stats })}
          />
        ) : (
          <>
            <p className="text-center text-sm muted">
              {attemptsRemaining(game)} {strings.attemptsLeft}
              {isFree && freeScore && freeScore.rounds > 0 && (
                <span>
                  {' · '}
                  {strings.sessionScore}: {freeScore.wins}/{freeScore.rounds}
                </span>
              )}
            </p>
            <GuessInput
              disabled={finished}
              onGuess={onGuess}
              onSkip={() => skip(variant, mode)}
              skipLabel={
                mode === 'trecho'
                  ? `${strings.skip} (+${formatSeconds(nextStepGain(game.attempts.length))})`
                  : strings.skip
              }
            />
          </>
        )}
      </main>

      <HowToModal
        open={showHowTo}
        onClose={() => {
          setShowHowTo(false);
          markHowToSeen();
        }}
      />
      <StatsModal
        open={showStats}
        onClose={() => setShowStats(false)}
        mode={mode}
        stats={stats}
        puzzleNumber={game.puzzleNumber}
      />
    </>
  );
}

/** Quantos segundos o proximo passo adiciona ao trecho. */
function nextStepGain(attempts: number): number {
  const current = SNIPPET_STEPS[Math.min(attempts, SNIPPET_STEPS.length - 1)] ?? FULL_DURATION;
  const next = SNIPPET_STEPS[Math.min(attempts + 1, SNIPPET_STEPS.length - 1)] ?? FULL_DURATION;
  // Arredonda: 0.5 - 0.2 daria 0.30000000000000004 em ponto flutuante.
  return Math.max(0, Math.round((next - current) * 10) / 10);
}
