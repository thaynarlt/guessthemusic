'use client';

import { useState } from 'react';
import { AudioLines, Headphones, Plus, Swords, X } from 'lucide-react';
import { CatalogFilterPicker } from '@/components/CatalogFilterPicker';
import { songs } from '@/lib/game/catalog';
import { MAX_PLAYERS, MIN_PLAYERS, ROUND_OPTIONS } from '@/lib/game/duel';
import { EMPTY_FILTER, filterPlayable, type CatalogFilter } from '@/lib/game/filter';
import type { GameMode } from '@/lib/game/types';
import { useStrings } from '@/store/useSettings';

interface DuelSetupProps {
  onStart: (mode: GameMode, names: string[], rounds: number, filter: CatalogFilter) => void;
}

/** Nome padrao de quem nao digitou nada — o duelo nunca trava por campo vazio. */
const fallbackName = (template: string, index: number): string =>
  template.replace('{n}', String(index + 1));

export function DuelSetup({ onStart }: DuelSetupProps) {
  const strings = useStrings();
  const [names, setNames] = useState<string[]>(['', '']);
  const [rounds, setRounds] = useState<number>(5);
  const [mode, setMode] = useState<GameMode>('trecho');
  const [filter, setFilter] = useState<CatalogFilter>(EMPTY_FILTER);

  const rename = (index: number, value: string) =>
    setNames((current) => current.map((name, i) => (i === index ? value : name)));

  const start = () =>
    onStart(
      mode,
      names.map((name, index) => name.trim() || fallbackName(strings.playerNumber, index)),
      rounds,
      filter,
    );

  return (
    <main className="flex flex-1 flex-col gap-6">
      <div className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-3xl font-extrabold tracking-tight">
          <Swords size={26} aria-hidden="true" className="text-grape-500" />
          {strings.duelName}
        </h1>
        <p className="mt-1 text-sm muted">{strings.duelPitch}</p>
      </div>

      <p className="surface p-3 text-center text-sm muted">{strings.scoringPitch}</p>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider muted">{strings.players}</h2>
        {names.map((name, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={name}
              maxLength={16}
              placeholder={fallbackName(strings.playerNumber, index)}
              aria-label={fallbackName(strings.playerNumber, index)}
              onChange={(event) => rename(index, event.target.value)}
              className="tap min-h-[44px] w-full rounded-xl border bg-transparent px-3 text-base outline-none"
              style={{ borderColor: 'rgb(var(--border))' }}
            />
            {names.length > MIN_PLAYERS && (
              <button
                type="button"
                className="btn-ghost px-3"
                aria-label={`${strings.removePlayer}: ${name || fallbackName(strings.playerNumber, index)}`}
                onClick={() => setNames((current) => current.filter((_, i) => i !== index))}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}

        {names.length < MAX_PLAYERS && (
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => setNames((current) => [...current, ''])}
          >
            <Plus size={16} aria-hidden="true" />
            {strings.addPlayer}
          </button>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider muted">{strings.menuTitle}</h2>
        <div className="grid grid-cols-2 gap-2">
          {(['trecho', 'banda'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => setMode(option)}
              className={`tap flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition ${
                mode === option ? 'border-transparent bg-grape-600 text-white' : ''
              }`}
              style={mode === option ? undefined : { borderColor: 'rgb(var(--border))' }}
            >
              {option === 'trecho' ? (
                <Headphones size={18} aria-hidden="true" />
              ) : (
                <AudioLines size={18} aria-hidden="true" />
              )}
              {option === 'trecho' ? strings.modeTrechoName : strings.modeBandaName}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider muted">{strings.rounds}</h2>
        <div className="grid grid-cols-3 gap-2">
          {ROUND_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={rounds === option}
              onClick={() => setRounds(option)}
              className={`tap rounded-xl border px-3 py-3 text-sm font-bold transition ${
                rounds === option ? 'border-transparent bg-grape-600 text-white' : ''
              }`}
              style={rounds === option ? undefined : { borderColor: 'rgb(var(--border))' }}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <CatalogFilterPicker value={filter} onChange={setFilter} />

      <button
        type="button"
        className="btn-primary w-full disabled:opacity-40"
        disabled={!filterPlayable(songs, filter)}
        onClick={start}
      >
        <Swords size={18} aria-hidden="true" />
        {strings.startDuel}
      </button>
    </main>
  );
}
