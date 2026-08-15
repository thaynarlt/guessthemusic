'use client';

import { useMemo, useRef, useState } from 'react';
import { Search, Send, SkipForward, X } from 'lucide-react';
import { search, type CatalogEntry } from '@/lib/game/guess';
import { catalogIndex } from '@/lib/game/catalog';
import type { Song } from '@/lib/game/types';
import { useStrings } from '@/store/useSettings';

interface GuessInputProps {
  disabled: boolean;
  onGuess: (song: Song) => void;
  onSkip: () => void;
  /** Rotulo do botao de pular, com o custo da jogada. */
  skipLabel: string;
}

/** Combobox acessivel: so aceita palpites que existem no catalogo. */
export function GuessInput({ disabled, onGuess, onSkip, skipLabel }: GuessInputProps) {
  const strings = useStrings();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [highlight, setHighlight] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 12 e nao 8: artistas populares tem mais de dez musicas no catalogo, e a
  // lista rola — cortar cedo demais esconderia justamente a que se procura.
  const suggestions = useMemo(
    () => (selected ? [] : search(catalogIndex, query, 12)),
    [query, selected],
  );
  const showList = open && !selected && suggestions.length > 0;

  const choose = (entry: CatalogEntry) => {
    setSelected(entry);
    setQuery(entry.label);
    setOpen(false);
    setHighlight(-1);
    inputRef.current?.focus();
  };

  const reset = () => {
    setQuery('');
    setSelected(null);
    setHighlight(-1);
    setOpen(false);
  };

  const submit = () => {
    if (disabled) return;
    const entry = selected ?? (suggestions.length === 1 ? suggestions[0] : null);
    if (!entry) return;
    onGuess(entry.song);
    reset();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!showList) return;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setHighlight((current) => {
        const next = current + delta;
        if (next < 0) return suggestions.length - 1;
        if (next >= suggestions.length) return 0;
        return next;
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const highlighted = showList && highlight >= 0 ? suggestions[highlight] : null;
      if (highlighted) {
        choose(highlighted);
        return;
      }
      submit();
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls="guess-listbox"
          aria-autocomplete="list"
          aria-activedescendant={
            showList && highlight >= 0 ? `guess-option-${highlight}` : undefined
          }
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={strings.guessPlaceholder}
          aria-label={strings.guessPlaceholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
            setHighlight(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="tap w-full rounded-xl border bg-transparent py-3 pl-10 pr-11 text-base outline-none disabled:opacity-50"
          style={{ borderColor: 'rgb(var(--border))' }}
        />

        {query.length > 0 && !disabled && (
          <button
            type="button"
            onClick={reset}
            aria-label={strings.close}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg muted hover:bg-grape-500/10"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}

        {showList && (
          <ul
            id="guess-listbox"
            role="listbox"
            className="surface absolute bottom-full z-20 mb-2 max-h-80 w-full overflow-auto p-1 shadow-xl"
          >
            {suggestions.map((entry, index) => (
              <li key={entry.song.id} role="none">
                <button
                  type="button"
                  id={`guess-option-${index}`}
                  role="option"
                  aria-selected={index === highlight}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(entry)}
                  className={`tap w-full rounded-lg px-3 py-2 text-left text-sm ${
                    index === highlight ? 'bg-grape-500/20' : ''
                  }`}
                >
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-ghost flex-1"
          onClick={onSkip}
          disabled={disabled}
          title={strings.skip}
        >
          <SkipForward size={16} aria-hidden="true" />
          {skipLabel}
        </button>
        <button
          type="button"
          className="btn-primary flex-1 disabled:opacity-40"
          onClick={submit}
          disabled={disabled || (!selected && suggestions.length !== 1)}
        >
          <Send size={16} aria-hidden="true" />
          {strings.submit}
        </button>
      </div>
    </div>
  );
}
