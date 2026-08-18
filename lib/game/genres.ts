import type { Song } from '@/lib/game/types';

/** Valor especial do filtro: nao restringe nada. */
export const ALL_GENRES = 'todos';

/**
 * Generos presentes no catalogo, em ordem alfabetica, sempre com "todos" na
 * frente. Sai dos dados: importar um genero novo ja o faz aparecer no filtro.
 */
export function availableGenres(songs: readonly Song[]): string[] {
  const found = new Set<string>();
  for (const song of songs) {
    for (const genre of song.genres ?? []) found.add(genre);
  }
  return [ALL_GENRES, ...[...found].sort((a, b) => a.localeCompare(b))];
}

/** Filtra por genero. Devolve tudo se o genero for "todos" ou nao existir. */
export function filterByGenre(songs: readonly Song[], genre: string): Song[] {
  if (genre === ALL_GENRES) return [...songs];
  const matches = songs.filter((song) => song.genres?.includes(genre));
  return matches.length > 0 ? matches : [...songs];
}

/** Rotulo amigavel; generos desconhecidos viram capitalizados. */
export function genreLabel(genre: string, labels: Record<string, string>): string {
  return labels[genre] ?? genre.charAt(0).toUpperCase() + genre.slice(1);
}
