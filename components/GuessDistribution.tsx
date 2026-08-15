'use client';

import { MAX_ATTEMPTS } from '@/lib/game/types';
import { useStrings } from '@/store/useSettings';

/** Linha destacada: o numero da tentativa em que voce acertou, ou "x" na derrota. */
export type DistributionHighlight = number | 'x' | null;

interface GuessDistributionProps {
  /** values[i] = acertos na tentativa i+1. */
  values: number[];
  /** Derrotas. Quando definido, ganha a linha "X" no fim. */
  losses?: number;
  highlight?: DistributionHighlight;
}

interface Row {
  key: string;
  label: string;
  count: number;
  active: boolean;
}

/**
 * Barras de "em qual tentativa a galera acertou". A sua linha fica em verde,
 * para voce se achar no grafico sem contar as barras.
 */
export function GuessDistribution({ values, losses, highlight = null }: GuessDistributionProps) {
  const strings = useStrings();

  const rows: Row[] = values.slice(0, MAX_ATTEMPTS).map((count, index) => ({
    key: String(index + 1),
    label: String(index + 1),
    count,
    active: highlight === index + 1,
  }));

  if (losses !== undefined) {
    rows.push({ key: 'x', label: 'X', count: losses, active: highlight === 'x' });
  }

  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <ul className="space-y-1">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center gap-2 text-sm">
          <span
            className={`w-3 text-center tabular-nums ${row.active ? 'font-bold text-neon-600 dark:text-neon-400' : 'muted'}`}
          >
            {row.label}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-grape-500/15">
            <div
              className={`flex h-full items-center justify-end rounded px-2 text-xs font-semibold transition-all ${
                row.active ? 'bg-neon-500 text-ink-950' : 'bg-grape-500 text-white'
              }`}
              style={{ width: `${Math.max(8, (row.count / max) * 100)}%` }}
            >
              {row.count}
            </div>
          </div>
          {row.key === 'x' && <span className="sr-only">{strings.statsMissed}</span>}
        </li>
      ))}
    </ul>
  );
}
