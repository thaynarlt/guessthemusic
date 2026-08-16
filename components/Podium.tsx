'use client';

import { Crown, Medal } from 'lucide-react';
import { useStrings } from '@/store/useSettings';

export interface PodiumRow {
  id: string;
  name: string;
  score: number;
}

/** Altura relativa de cada degrau: o 1o lugar no meio, como em podio de verdade. */
const STEPS = [
  { place: 2, height: 'h-16', order: 'order-1' },
  { place: 1, height: 'h-24', order: 'order-2' },
  { place: 3, height: 'h-12', order: 'order-3' },
] as const;

const MEDALS: Record<number, string> = {
  1: 'text-amber-400',
  2: 'text-slate-400',
  3: 'text-amber-700',
};

interface PodiumProps {
  /** Ja ordenado do maior para o menor. */
  rows: readonly PodiumRow[];
  /** Destaca quem esta olhando a tela. */
  meId?: string | null;
}

/**
 * Podio dos tres primeiros, com o resto listado abaixo.
 *
 * Empate em pontos herda a ordem que chegou — o desempate por tempo ja
 * aconteceu em `roomRanking`, entao aqui e so desenho.
 */
export function Podium({ rows, meId }: PodiumProps) {
  const strings = useStrings();
  const top = rows.slice(0, 3);
  const rest = rows.slice(3);

  if (top.length === 0) return null;

  return (
    <div className="space-y-3">
      <ol className="flex items-end justify-center gap-2">
        {STEPS.filter((step) => top.length >= step.place).map((step) => {
          const row = top[step.place - 1];
          if (!row) return null;
          const isMe = row.id === meId;

          return (
            <li
              key={row.id}
              className={`flex w-24 flex-col items-center gap-1 ${step.order}`}
              aria-label={`${step.place}: ${row.name}, ${row.score}`}
            >
              {step.place === 1 ? (
                <Crown size={22} className="text-amber-400" aria-hidden="true" />
              ) : (
                <Medal size={18} className={MEDALS[step.place]} aria-hidden="true" />
              )}

              <span className="max-w-full truncate text-sm font-bold" title={row.name}>
                {row.name}
              </span>
              <span className="font-display text-xl font-extrabold tabular-nums">{row.score}</span>

              <div
                className={`flex w-full items-start justify-center rounded-t-xl pt-1 font-display text-lg font-extrabold ${step.height} ${
                  isMe ? 'bg-grape-600 text-white' : 'bg-grape-500/25'
                }`}
              >
                {step.place}
              </div>
            </li>
          );
        })}
      </ol>

      {rest.length > 0 && (
        <ol className="space-y-1 text-sm" start={4}>
          {rest.map((row, index) => (
            <li
              key={row.id}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${
                row.id === meId ? 'bg-grape-500/15 font-semibold' : ''
              }`}
            >
              <span className="w-5 tabular-nums muted">{index + 4}</span>
              <span className="flex-1 truncate">{row.name}</span>
              <span className="tabular-nums">{row.score}</span>
            </li>
          ))}
        </ol>
      )}

      <p className="sr-only">{strings.finalScore}</p>
    </div>
  );
}
