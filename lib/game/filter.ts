import type { Song } from '@/lib/game/types';

/**
 * Filtro do sorteio: genero, epoca e artista.
 *
 * Cada lista vazia significa "nao restringe". Guardar assim, e nao com um valor
 * especial tipo "todos", faz o caso comum (nada marcado) ser o estado natural e
 * evita o filtro que nao filtra nada mas parece que filtra.
 */
export interface CatalogFilter {
  genres: string[];
  eras: EraId[];
  artists: string[];
}

export const EMPTY_FILTER: CatalogFilter = { genres: [], eras: [], artists: [] };

/**
 * Epocas.
 *
 * Antes de 1990 vira um balde so de proposito: o catalogo tem 4 musicas dos
 * anos 60 e 27 dos 70, entao decadas separadas ali dariam salas que repetem a
 * mesma musica em duas rodadas.
 */
export const ERAS = ['ate1989', '1990', '2000', '2010', '2020'] as const;

export type EraId = (typeof ERAS)[number];

export function eraOf(year: number): EraId {
  if (year < 1990) return 'ate1989';
  if (year < 2000) return '1990';
  if (year < 2010) return '2000';
  if (year < 2020) return '2010';
  return '2020';
}

/**
 * Quantas musicas o filtro precisa deixar para uma partida valer a pena.
 *
 * Abaixo disso as rodadas comecam a repetir musica, que estraga justamente a
 * graca de escolher um nicho.
 */
export const MIN_FILTER_SONGS = 20;

/** Abaixo disso nem da para jogar: a partida seria a mesma musica varias vezes. */
export const BLOCK_FILTER_SONGS = 8;

const matchesList = (list: readonly string[], value: string | undefined): boolean =>
  list.length === 0 || (value !== undefined && list.includes(value));

/**
 * Aplica o filtro. Combinacao vazia devolve tudo.
 *
 * Diferente do `filterByGenre` antigo, isto NAO cai para o catalogo inteiro
 * quando o resultado fica pequeno: quem escolheu k-pop dos anos 80 precisa ver
 * que nao existe, e nao receber rock sem entender por que.
 */
export function filterSongs(songs: readonly Song[], filter: CatalogFilter): Song[] {
  return songs.filter(
    (song) =>
      matchesList(filter.genres, song.genre) &&
      matchesList(filter.eras, eraOf(song.year)) &&
      matchesList(filter.artists, song.artist),
  );
}

export const countFiltered = (songs: readonly Song[], filter: CatalogFilter): number =>
  filterSongs(songs, filter).length;

/** Da para comecar uma partida com este filtro? */
export const filterPlayable = (songs: readonly Song[], filter: CatalogFilter): boolean =>
  countFiltered(songs, filter) >= BLOCK_FILTER_SONGS;

/** Poucas musicas: da para jogar, mas vai repetir. */
export const filterIsThin = (songs: readonly Song[], filter: CatalogFilter): boolean => {
  const total = countFiltered(songs, filter);
  return total >= BLOCK_FILTER_SONGS && total < MIN_FILTER_SONGS;
};

export const isEmptyFilter = (filter: CatalogFilter): boolean =>
  filter.genres.length === 0 && filter.eras.length === 0 && filter.artists.length === 0;

/** Liga/desliga um item da lista, para os botoes de marcar. */
export function toggle(list: readonly string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/** Artistas do catalogo com pelo menos `minimo` musicas, em ordem alfabetica. */
export function availableArtists(songs: readonly Song[], minimo = 1): string[] {
  const counts = new Map<string, number>();
  for (const song of songs) counts.set(song.artist, (counts.get(song.artist) ?? 0) + 1);

  return [...counts.entries()]
    .filter(([, total]) => total >= minimo)
    .map(([artist]) => artist)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Limpa o filtro do que nao existe mais.
 *
 * O filtro viaja pela rede e pode ficar guardado; se o catalogo mudar, um
 * genero ou artista que sumiu deixaria a sala sem musica nenhuma sem explicar
 * por que.
 */
export function pruneFilter(songs: readonly Song[], filter: CatalogFilter): CatalogFilter {
  const genres = new Set(songs.map((song) => song.genre).filter(Boolean) as string[]);
  const artists = new Set(songs.map((song) => song.artist));

  return {
    genres: filter.genres.filter((genre) => genres.has(genre)),
    eras: filter.eras.filter((era) => ERAS.includes(era)),
    artists: filter.artists.filter((artist) => artists.has(artist)),
  };
}
