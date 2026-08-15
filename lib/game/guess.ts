import { matchesAllTerms, normalize } from '@/lib/game/normalize';
import type { GuessResult, Song } from '@/lib/game/types';

export interface CatalogEntry {
  song: Song;
  /** "Artista - Titulo" pronto para exibicao. */
  label: string;
  /** Texto normalizado usado na busca (inclui aliases). */
  haystack: string;
}

/** Monta o indice de busca do catalogo. */
export function buildIndex(songs: readonly Song[]): CatalogEntry[] {
  return songs
    .map((song) => ({
      song,
      label: `${song.artist} - ${song.title}`,
      haystack: normalize(
        [song.artist, song.title, String(song.year), ...(song.aliases ?? [])].join(' '),
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Sugestoes do autocomplete, priorizando quem comeca pelo termo digitado. */
export function search(index: readonly CatalogEntry[], query: string, limit = 8): CatalogEntry[] {
  const normalized = normalize(query);
  if (normalized.length === 0) return [];

  const matches = index.filter((entry) => matchesAllTerms(entry.haystack, query));
  return matches
    .slice()
    .sort((a, b) => {
      const aStarts = a.haystack.startsWith(normalized) ? 0 : 1;
      const bStarts = b.haystack.startsWith(normalized) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.label.localeCompare(b.label);
    })
    .slice(0, limit);
}

/** Classifica um palpite contra a resposta do dia. */
export function evaluateGuess(guess: Song, answer: Song): GuessResult {
  if (guess.id === answer.id) return 'correct';
  if (normalize(guess.artist) === normalize(answer.artist)) return 'artist';
  return 'wrong';
}
