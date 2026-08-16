'use client';

import { formatSeconds, SNIPPET_STEPS } from '@/lib/game/types';

interface SnippetBarProps {
  /** Segundos ja liberados. */
  unlocked: number;
  /** Segundos ja tocados do trecho atual. */
  elapsed: number;
}

const TOTAL = SNIPPET_STEPS[SNIPPET_STEPS.length - 1] ?? 15;

/** Posicao na barra, linear no tempo: a fatia mostra quanto da musica voce ouve. */
const toPercent = (seconds: number): number => Math.min(100, Math.max(0, (seconds / TOTAL) * 100));

/**
 * Barra do modo Trecho: liberado em roxo, bloqueado em cinza, playhead por cima
 * e um marcador indicando o trecho atual.
 *
 * A escala e linear (0,2s ocupa mesmo pouquissimo espaco de 15s), por isso o
 * bloco de audio usa `wide-bleed`: com largura suficiente, os primeiros passos
 * aparecem como fatias finas em vez de sumirem.
 */
export function SnippetBar({ unlocked, elapsed }: SnippetBarProps) {
  const unlockedPct = toPercent(unlocked);
  const elapsedPct = Math.min(unlockedPct, toPercent(elapsed));

  return (
    <div className="w-full">
      {/* Marcador do trecho atual, no estilo do Songless. */}
      <div className="relative mb-1 h-9">
        <div
          className="absolute flex -translate-x-1/2 flex-col items-center"
          style={{ left: `clamp(1.75rem, ${unlockedPct}%, calc(100% - 1.75rem))` }}
        >
          <span className="whitespace-nowrap text-sm font-bold tabular-nums">
            {formatSeconds(unlocked)}
          </span>
          <span
            aria-hidden="true"
            className="mt-0.5 h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent"
            style={{ borderTopColor: 'rgb(var(--text))' }}
          />
        </div>
      </div>

      <div
        className="relative h-5 w-full overflow-hidden rounded-md"
        style={{ backgroundColor: 'rgb(var(--border))' }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={TOTAL}
        aria-valuenow={unlocked}
        aria-valuetext={`${formatSeconds(unlocked)} de ${formatSeconds(TOTAL)}`}
        aria-label={`${formatSeconds(unlocked)} de ${formatSeconds(TOTAL)} liberados`}
      >
        <div
          className="absolute inset-y-0 left-0 bg-grape-600/45"
          style={{ width: `${unlockedPct}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-neon-500 transition-[width] duration-100 ease-linear"
          style={{ width: `${elapsedPct}%` }}
        />
        {SNIPPET_STEPS.slice(0, -1).map((step) => (
          <span
            key={step}
            aria-hidden="true"
            className="absolute inset-y-0 w-px bg-black/30 dark:bg-white/35"
            style={{ left: `${toPercent(step)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
