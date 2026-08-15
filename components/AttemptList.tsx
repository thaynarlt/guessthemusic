'use client';

import type { ReactNode } from 'react';
import { Check, Minus, UserRoundCheck, X } from 'lucide-react';
import { MAX_ATTEMPTS, type Attempt, type GuessResult } from '@/lib/game/types';
import { useStrings } from '@/store/useSettings';

const ICONS: Record<GuessResult, ReactNode> = {
  correct: <Check size={16} aria-hidden="true" />,
  artist: <UserRoundCheck size={16} aria-hidden="true" />,
  wrong: <X size={16} aria-hidden="true" />,
  skipped: <Minus size={16} aria-hidden="true" />,
};

/** Cor do marcador: verde acertou, ambar artista certo, vermelho errou. */
const COLORS: Record<GuessResult, string> = {
  correct: 'text-neon-500',
  artist: 'text-amber-500',
  wrong: 'text-red-500',
  skipped: '',
};

/** Historico de tentativas, sempre com as 6 linhas visiveis. */
export function AttemptList({ attempts, shakeNonce }: { attempts: Attempt[]; shakeNonce: number }) {
  const strings = useStrings();
  const labels: Record<GuessResult, string> = {
    correct: strings.resultCorrect,
    artist: strings.resultArtist,
    wrong: strings.resultWrong,
    skipped: strings.resultSkipped,
  };

  const rows = Array.from({ length: MAX_ATTEMPTS }, (_, index) => attempts[index] ?? null);
  const lastIndex = attempts.length - 1;

  return (
    <ol className="space-y-1.5">
      {rows.map((attempt, index) => {
        const isLast = index === lastIndex;
        const shouldShake = isLast && shakeNonce > 0 && attempt?.result === 'wrong';

        return (
          <li
            key={index}
            className={`flex min-h-[44px] items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
              shouldShake ? 'animate-shake' : ''
            }`}
            style={{
              borderColor: 'rgb(var(--border))',
              backgroundColor: attempt ? 'rgb(var(--surface-raised) / 0.6)' : 'transparent',
            }}
          >
            {attempt ? (
              <>
                <span className={COLORS[attempt.result] || 'muted'}>{ICONS[attempt.result]}</span>
                <span className="flex-1 truncate">
                  {attempt.result === 'skipped' ? (
                    <span className="muted italic">{labels.skipped}</span>
                  ) : (
                    attempt.label
                  )}
                </span>
                <span className="sr-only">{labels[attempt.result]}</span>
              </>
            ) : (
              <span className="muted" aria-hidden="true">
                &middot;
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
