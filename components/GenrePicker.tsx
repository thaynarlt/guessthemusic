'use client';

import { songs } from '@/lib/game/catalog';
import { availableGenres, genreLabel } from '@/lib/game/genres';
import { useStrings } from '@/store/useSettings';

interface GenrePickerProps {
  value: string;
  onChange: (genre: string) => void;
}

/** Abas de genero do modo livre. A lista sai do catalogo, nao de uma constante. */
export function GenrePicker({ value, onChange }: GenrePickerProps) {
  const strings = useStrings();
  const genres = availableGenres(songs);

  if (genres.length <= 1) return null;

  return (
    <div
      role="tablist"
      aria-label={strings.genre}
      className="flex flex-wrap justify-center gap-1.5"
    >
      {genres.map((genre) => {
        const active = genre === value;
        return (
          <button
            key={genre}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(genre)}
            className={`tap rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              active ? 'border-transparent bg-grape-600 text-white' : 'hover:bg-grape-500/10'
            }`}
            style={active ? undefined : { borderColor: 'rgb(var(--border))' }}
          >
            {genreLabel(genre, strings.genres)}
          </button>
        );
      })}
    </div>
  );
}
