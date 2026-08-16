'use client';

import { Crown } from 'lucide-react';

export interface ScoreRow {
  id: string;
  name: string;
  score: number;
  /** Ainda jogando a rodada (sala online). */
  pending?: boolean;
}

interface ScoreboardProps {
  rows: ScoreRow[];
  /** Quem esta com a vez (duelo) ou quem e voce (sala). */
  activeId?: string | null;
  /** Coroa o primeiro colocado — so no placar final. */
  crownLeader?: boolean;
}

/** Placar horizontal, usado durante a partida e no fim dela. */
export function Scoreboard({ rows, activeId, crownLeader = false }: ScoreboardProps) {
  const best = Math.max(...rows.map((row) => row.score), 0);

  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {rows.map((row) => {
        const active = row.id === activeId;
        const leader = crownLeader && row.score === best && best > 0;

        return (
          <li
            key={row.id}
            className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-1.5 transition ${
              active ? 'border-transparent bg-grape-600 text-white' : ''
            } ${row.pending ? 'opacity-50' : ''}`}
            style={active ? undefined : { borderColor: 'rgb(var(--border))' }}
          >
            {leader && <Crown size={16} className="text-amber-400" aria-hidden="true" />}
            <span className="max-w-[10rem] truncate text-sm font-semibold">{row.name}</span>
            <span className="font-display text-lg font-extrabold tabular-nums">{row.score}</span>
          </li>
        );
      })}
    </ul>
  );
}
