import { describe, expect, it } from 'vitest';
import {
  availableArtists,
  BLOCK_FILTER_SONGS,
  countFiltered,
  EMPTY_FILTER,
  eraOf,
  filterIsThin,
  filterPlayable,
  filterSongs,
  isEmptyFilter,
  MIN_FILTER_SONGS,
  pruneFilter,
  toggle,
  type CatalogFilter,
} from '@/lib/game/filter';
import type { Song } from '@/lib/game/types';

const song = (id: string, artist: string, year: number, genre?: string): Song => ({
  id,
  title: `Musica ${id}`,
  artist,
  year,
  source: 'synth',
  ...(genre ? { genres: genre.split('+') } : {}),
});

const catalog: Song[] = [
  song('a', 'Queen', 1975, 'rock'),
  song('b', 'Queen', 1985, 'rock'),
  song('c', 'Nirvana', 1991, 'rock'),
  song('d', 'Britney', 2004, 'pop'),
  song('e', 'BTS', 2020, 'kpop'),
  song('f', 'BTS', 2022, 'kpop'),
  song('g', 'Anitta', 2022, 'pop'),
  song('h', 'Sem Genero', 2015),
  song('i', 'Rose', 2024, 'kpop+pop'),
];

const filter = (over: Partial<CatalogFilter> = {}): CatalogFilter => ({
  ...EMPTY_FILTER,
  ...over,
});

describe('epocas', () => {
  it('junta tudo antes de 1990 num balde so', () => {
    expect(eraOf(1965)).toBe('ate1989');
    expect(eraOf(1989)).toBe('ate1989');
  });

  it('separa as decadas a partir de 1990', () => {
    expect(eraOf(1990)).toBe('1990');
    expect(eraOf(1999)).toBe('1990');
    expect(eraOf(2000)).toBe('2000');
    expect(eraOf(2010)).toBe('2010');
    expect(eraOf(2020)).toBe('2020');
    expect(eraOf(2026)).toBe('2020');
  });
});

describe('filtrar', () => {
  it('filtro vazio devolve tudo', () => {
    expect(filterSongs(catalog, EMPTY_FILTER)).toHaveLength(catalog.length);
    expect(isEmptyFilter(EMPTY_FILTER)).toBe(true);
  });

  it('aceita mais de um genero', () => {
    const hits = filterSongs(catalog, filter({ genres: ['rock', 'kpop'] }));
    expect(hits.map((s) => s.id).sort()).toEqual(['a', 'b', 'c', 'e', 'f', 'i']);
  });

  it('musica de dois generos entra por qualquer um deles', () => {
    // O disco solo de uma cantora de K-pop e pop ocidental: quem filtra por um
    // ou por outro tem de encontrar a mesma musica.
    expect(filterSongs(catalog, filter({ genres: ['kpop'] })).map((s) => s.id)).toContain('i');
    expect(filterSongs(catalog, filter({ genres: ['pop'] })).map((s) => s.id)).toContain('i');
  });

  it('nao conta a musica duas vezes por ter dois generos', () => {
    expect(countFiltered(catalog, filter({ genres: ['kpop', 'pop'] }))).toBe(5);
  });

  it('filtra por epoca', () => {
    expect(filterSongs(catalog, filter({ eras: ['ate1989'] })).map((s) => s.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('cruza genero com epoca', () => {
    const hits = filterSongs(catalog, filter({ genres: ['rock'], eras: ['1990'] }));
    expect(hits.map((s) => s.id)).toEqual(['c']);
  });

  it('cruzamento sem resultado devolve vazio, e nao o catalogo inteiro', () => {
    // Quem escolheu k-pop dos anos 80 precisa ver que nao existe, em vez de
    // receber rock sem entender por que.
    expect(filterSongs(catalog, filter({ genres: ['kpop'], eras: ['ate1989'] }))).toEqual([]);
  });

  it('filtra por artista', () => {
    expect(filterSongs(catalog, filter({ artists: ['BTS'] })).map((s) => s.id)).toEqual(['e', 'f']);
  });

  it('musica sem genero so aparece quando nao ha filtro de genero', () => {
    expect(filterSongs(catalog, filter({ genres: ['pop'] })).map((s) => s.id)).toEqual([
      'd',
      'g',
      'i',
    ]);
    expect(filterSongs(catalog, filter({ eras: ['2010'] })).map((s) => s.id)).toEqual(['h']);
  });

  it('conta o que sobrou', () => {
    expect(countFiltered(catalog, filter({ genres: ['kpop'] }))).toBe(3);
  });
});

describe('filtro magro demais', () => {
  const muitas = Array.from({ length: 40 }, (_, i) => song(`x${i}`, 'Varios', 2015, 'rock'));

  it('libera quando ha musica suficiente', () => {
    expect(filterPlayable(muitas, EMPTY_FILTER)).toBe(true);
    expect(filterIsThin(muitas, EMPTY_FILTER)).toBe(false);
  });

  it('avisa quando da para jogar mas vai repetir', () => {
    const poucas = muitas.slice(0, MIN_FILTER_SONGS - 1);
    expect(filterPlayable(poucas, EMPTY_FILTER)).toBe(true);
    expect(filterIsThin(poucas, EMPTY_FILTER)).toBe(true);
  });

  it('trava quando nao da para jogar', () => {
    const quase = muitas.slice(0, BLOCK_FILTER_SONGS - 1);
    expect(filterPlayable(quase, EMPTY_FILTER)).toBe(false);
    expect(filterIsThin(quase, EMPTY_FILTER)).toBe(false);
  });
});

describe('marcar e desmarcar', () => {
  it('liga o que estava desligado e vice-versa', () => {
    expect(toggle([], 'rock')).toEqual(['rock']);
    expect(toggle(['rock'], 'pop')).toEqual(['rock', 'pop']);
    expect(toggle(['rock', 'pop'], 'rock')).toEqual(['pop']);
  });

  it('nao altera a lista recebida', () => {
    const original = ['rock'];
    toggle(original, 'pop');
    expect(original).toEqual(['rock']);
  });
});

describe('artistas disponiveis', () => {
  it('lista em ordem alfabetica, sem repetir', () => {
    // localeCompare compara "Britney" e "BTS" pela terceira letra ignorando a
    // caixa, entao "r" vem antes de "T" — e nao a ordem de tabela ASCII.
    expect(availableArtists(catalog)).toEqual([
      'Anitta',
      'Britney',
      'BTS',
      'Nirvana',
      'Queen',
      'Rose',
      'Sem Genero',
    ]);
  });

  it('respeita o minimo de musicas por artista', () => {
    expect(availableArtists(catalog, 2)).toEqual(['BTS', 'Queen']);
  });
});

describe('limpar o filtro do que sumiu', () => {
  it('descarta genero e artista que nao existem mais', () => {
    const sujo = filter({ genres: ['rock', 'sertanejo'], artists: ['Queen', 'Fantasma'] });
    expect(pruneFilter(catalog, sujo)).toEqual({
      genres: ['rock'],
      eras: [],
      artists: ['Queen'],
    });
  });

  it('descarta epoca invalida vinda de fora', () => {
    const sujo = { ...EMPTY_FILTER, eras: ['1990', '1800'] } as CatalogFilter;
    expect(pruneFilter(catalog, sujo).eras).toEqual(['1990']);
  });

  it('filtro limpo passa intacto', () => {
    const bom = filter({ genres: ['pop'], eras: ['2020'], artists: ['Anitta'] });
    expect(pruneFilter(catalog, bom)).toEqual(bom);
  });
});
