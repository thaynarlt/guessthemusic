'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { songs } from '@/lib/game/catalog';
import {
  availableArtists,
  countFiltered,
  ERAS,
  filterIsThin,
  filterPlayable,
  isEmptyFilter,
  toggle,
  type CatalogFilter,
  type EraId,
} from '@/lib/game/filter';
import { availableGenres, genreLabel, ALL_GENRES } from '@/lib/game/genres';
import { normalize } from '@/lib/game/normalize';
import { useStrings } from '@/store/useSettings';

/** Artista com menos que isto no catalogo nao rende uma sala inteira. */
const MIN_SONGS_PER_ARTIST = 5;

/** Quantos artistas listar de uma vez: a lista inteira nao cabe na tela. */
const ARTIST_PAGE = 24;

interface CatalogFilterPickerProps {
  value: CatalogFilter;
  onChange: (filter: CatalogFilter) => void;
  /** Some com o seletor de artistas — util quando o espaco e curto. */
  compact?: boolean;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`tap rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
        active ? 'border-transparent bg-grape-600 text-white' : 'hover:bg-grape-500/10'
      }`}
      style={active ? undefined : { borderColor: 'rgb(var(--border))' }}
    >
      {children}
    </button>
  );
}

/**
 * Escolha do que pode cair no sorteio: generos, epocas e artistas.
 *
 * Tudo e multipla escolha, e nada marcado significa "tudo liberado" — e o
 * estado natural de quem nao quer pensar nisso. A contagem ao vivo existe
 * porque cruzar dois filtros esvazia o catalogo rapido: k-pop antes de 1990 sao
 * zero musicas, e descobrir isso jogando seria bem pior.
 */
export function CatalogFilterPicker({ value, onChange, compact }: CatalogFilterPickerProps) {
  const strings = useStrings();
  const [artistQuery, setArtistQuery] = useState('');

  const genres = useMemo(() => availableGenres(songs).filter((g) => g !== ALL_GENRES), []);
  const artists = useMemo(() => availableArtists(songs, MIN_SONGS_PER_ARTIST), []);

  const shownArtists = useMemo(() => {
    const query = normalize(artistQuery);
    const pool = query ? artists.filter((name) => normalize(name).includes(query)) : artists;
    return pool.slice(0, ARTIST_PAGE);
  }, [artists, artistQuery]);

  const total = countFiltered(songs, value);
  const blocked = !filterPlayable(songs, value);
  const thin = filterIsThin(songs, value);

  const set = (patch: Partial<CatalogFilter>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider muted">{strings.genre}</h3>
        <div className="flex flex-wrap gap-1.5">
          {genres.map((genre) => (
            <Chip
              key={genre}
              active={value.genres.includes(genre)}
              onClick={() => set({ genres: toggle(value.genres, genre) })}
            >
              {genreLabel(genre, strings.genres)}
            </Chip>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider muted">{strings.era}</h3>
        <div className="flex flex-wrap gap-1.5">
          {ERAS.map((era) => (
            <Chip
              key={era}
              active={value.eras.includes(era)}
              onClick={() => set({ eras: toggle(value.eras, era) as EraId[] })}
            >
              {strings.eras[era]}
            </Chip>
          ))}
        </div>
      </section>

      {!compact && (
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider muted">{strings.artists}</h3>

          {/* Os escolhidos primeiro: com 198 artistas na lista, achar de novo o
              que voce marcou seria uma cacada. */}
          {value.artists.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {value.artists.map((artist) => (
                <button
                  key={artist}
                  type="button"
                  onClick={() => set({ artists: toggle(value.artists, artist) })}
                  className="tap flex items-center gap-1 rounded-full bg-grape-600 px-3 py-1.5 text-sm font-semibold text-white"
                  aria-label={`${strings.removePlayer}: ${artist}`}
                >
                  {artist}
                  <X size={14} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted"
            />
            <input
              type="text"
              value={artistQuery}
              placeholder={strings.searchArtist}
              aria-label={strings.searchArtist}
              onChange={(event) => setArtistQuery(event.target.value)}
              className="tap min-h-[44px] w-full rounded-xl border bg-transparent py-2 pl-9 pr-3 text-base outline-none"
              style={{ borderColor: 'rgb(var(--border))' }}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {shownArtists
              .filter((artist) => !value.artists.includes(artist))
              .map((artist) => (
                <Chip
                  key={artist}
                  active={false}
                  onClick={() => set({ artists: toggle(value.artists, artist) })}
                >
                  {artist}
                </Chip>
              ))}
          </div>
        </section>
      )}

      <p
        className={`text-center text-sm ${
          blocked ? 'font-semibold text-red-500' : thin ? 'text-amber-500' : 'muted'
        }`}
        role="status"
      >
        {blocked
          ? strings.filterTooNarrow
          : isEmptyFilter(value)
            ? strings.filterAll.replace('{n}', String(total))
            : strings.filterCount.replace('{n}', String(total))}
        {thin && ` ${strings.filterThin}`}
      </p>

      {!isEmptyFilter(value) && (
        <button
          type="button"
          className="btn-ghost mx-auto"
          onClick={() => onChange({ genres: [], eras: [], artists: [] })}
        >
          {strings.filterClear}
        </button>
      )}
    </div>
  );
}
