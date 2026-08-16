'use client';

import { useState } from 'react';
import { RotateCcw, SkipForward, Swords, Trophy } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { AttemptList } from '@/components/AttemptList';
import { AudioDeck } from '@/components/AudioDeck';
import { CoverArt } from '@/components/CoverArt';
import { DuelSetup } from '@/components/DuelSetup';
import { FullTrackPlayer } from '@/components/FullTrackPlayer';
import { GuessInput } from '@/components/GuessInput';
import { HowToModal } from '@/components/HowToModal';
import { Podium } from '@/components/Podium';
import { Scoreboard } from '@/components/Scoreboard';
import { useSnippetPlayer } from '@/lib/audio/useSnippetPlayer';
import { getSong, songUsesStems } from '@/lib/game/catalog';
import { canAdvance, currentPlayer, ranking } from '@/lib/game/duel';
import { pointsForLevel } from '@/lib/game/score';
import { formatSeconds, SNIPPET_STEPS } from '@/lib/game/types';
import { useDuelStore } from '@/store/useDuelStore';
import { useSettings, useStrings } from '@/store/useSettings';

const FULL_DURATION = SNIPPET_STEPS[SNIPPET_STEPS.length - 1] ?? 16;

/** "6 pontos" / "1 ponto" — o singular aparece justo no degrau de 15s. */
const plural = (value: number, one: string, many: string): string =>
  `${value} ${value === 1 ? one : many}`;

export function DuelScreen() {
  const strings = useStrings();
  const markHowToSeen = useSettings((state) => state.markHowToSeen);
  const [showHowTo, setShowHowTo] = useState(false);

  const duel = useDuelStore((state) => state.duel);
  const nonce = useDuelStore((state) => state.nonce);
  const start = useDuelStore((state) => state.start);
  const guess = useDuelStore((state) => state.guess);
  const skip = useDuelStore((state) => state.skip);
  const next = useDuelStore((state) => state.next);
  const reset = useDuelStore((state) => state.reset);

  const round = duel?.round;
  const answer = round ? getSong(round.answerId) : undefined;
  const over = round?.status === 'over';

  const player = useSnippetPlayer({
    song: answer ?? null,
    mode: duel?.mode ?? 'trecho',
    level: round?.level ?? 0,
    seed: round?.number ?? 0,
    revealed: over ?? false,
  });

  if (!duel || !round || !answer) {
    return (
      <>
        <AppHeader backHref="/" onHowTo={() => setShowHowTo(true)} />
        <DuelSetup onStart={start} />
        <HowToModal
          open={showHowTo}
          onClose={() => {
            setShowHowTo(false);
            markHowToSeen();
          }}
        />
      </>
    );
  }

  const turn = currentPlayer(duel);
  const nameOf = (id: string | null): string =>
    duel.players.find((entry) => entry.id === id)?.name ?? '';
  const finished = duel.status === 'finished' && over;
  const table = ranking(duel);
  const tie = table.length > 1 && table[0]?.score === table[1]?.score;

  return (
    <>
      <AppHeader backHref="/" onHowTo={() => setShowHowTo(true)} />

      <main className="flex flex-1 flex-col gap-5">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <Swords size={22} aria-hidden="true" className="text-grape-500" />
            {strings.duelName}
          </h1>
          <span className="text-sm muted">
            {strings.round} {round.number}/{duel.totalRounds}
          </span>
        </div>

        <Scoreboard rows={duel.players} activeId={over ? null : turn?.id} crownLeader={finished} />

        {!over && turn && (
          <p className="text-center text-sm">
            <span className="font-display text-lg font-extrabold">
              {strings.turnOf} {turn.name}
            </span>
            <span className="muted">
              {' · '}
              {strings.worthPoints.replace(
                '{points}',
                plural(pointsForLevel(round.level), strings.point, strings.points),
              )}
            </span>
          </p>
        )}

        <AudioDeck
          player={player}
          song={answer}
          mode={duel.mode}
          interactive={songUsesStems(answer) || !over}
        />

        <AttemptList
          attempts={round.attempts}
          authors={round.attempts.map((attempt) => nameOf(attempt.playerId))}
          shakeNonce={nonce}
        />

        {over ? (
          <section className="surface animate-pop-in space-y-4 p-4" aria-live="polite">
            <p
              className={`flex items-center justify-center gap-2 text-center font-display text-lg font-bold ${
                round.winnerId ? 'text-neon-500' : ''
              }`}
            >
              {round.winnerId && <Trophy size={20} aria-hidden="true" />}
              {round.winnerId
                ? strings.roundWinner
                    .replace('{name}', nameOf(round.winnerId))
                    .replace(
                      '{points}',
                      plural(
                        round.attempts[round.attempts.length - 1]?.points ?? 0,
                        strings.point,
                        strings.points,
                      ),
                    )
                : strings.roundNobody}
            </p>

            <div className="flex items-center gap-4">
              <CoverArt song={answer} size={88} />
              <div className="min-w-0 flex-1">
                {!round.winnerId && <p className="text-xs muted">{strings.answerWas}</p>}
                <p className="truncate text-lg font-bold">{answer.title}</p>
                <p className="truncate text-sm muted">
                  {answer.artist} · {answer.year}
                </p>
              </div>
            </div>

            <FullTrackPlayer song={answer} />

            {finished ? (
              <>
                <h2 className="text-center text-xs font-bold uppercase tracking-wider muted">
                  {strings.finalScore}
                </h2>
                <p className="text-center font-display text-xl font-extrabold">
                  {tie
                    ? strings.duelTie
                    : strings.duelWinner.replace('{name}', table[0]?.name ?? '')}
                </p>
                <Podium rows={table} />
                <button type="button" className="btn-primary w-full" onClick={reset} autoFocus>
                  <RotateCcw size={18} aria-hidden="true" />
                  {strings.playAgain}
                </button>
              </>
            ) : (
              canAdvance(duel) && (
                <button type="button" className="btn-primary w-full" onClick={next} autoFocus>
                  {strings.nextRound}
                  <SkipForward size={18} aria-hidden="true" />
                </button>
              )
            )}
          </section>
        ) : (
          <GuessInput
            disabled={false}
            onGuess={guess}
            onSkip={skip}
            skipLabel={
              duel.mode === 'trecho'
                ? `${strings.skip} (+${formatSeconds(nextStepGain(round.level))})`
                : strings.skip
            }
          />
        )}
      </main>

      <HowToModal
        open={showHowTo}
        onClose={() => {
          setShowHowTo(false);
          markHowToSeen();
        }}
      />
    </>
  );
}

/** Quantos segundos o proximo degrau entrega a quem rouba a vez. */
function nextStepGain(level: number): number {
  const current = SNIPPET_STEPS[Math.min(level, SNIPPET_STEPS.length - 1)] ?? FULL_DURATION;
  const next = SNIPPET_STEPS[Math.min(level + 1, SNIPPET_STEPS.length - 1)] ?? FULL_DURATION;
  // Arredonda: 0.5 - 0.2 daria 0.30000000000000004 em ponto flutuante.
  return Math.max(0, Math.round((next - current) * 10) / 10);
}
