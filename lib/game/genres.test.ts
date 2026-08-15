import { describe, expect, it } from 'vitest';
import { ALL_GENRES, availableGenres, filterByGenre, genreLabel } from '@/lib/game/genres';
import { songs } from '@/lib/game/catalog';
import { dictionaries } from '@/lib/i18n/strings';
import type { Song } from '@/lib/game/types';

const song = (id: string, genre?: string): Song => ({
  id,
  title: `Musica ${id}`,
  artist: `Artista ${id}`,
  year: 2020,
  source: 'preview',
  ...(genre ? { genre } : {}),
});

describe('availableGenres', () => {
  it('sempre comeca por "todos"', () => {
    expect(availableGenres(songs)[0]).toBe(ALL_GENRES);
  });

  it('lista os generos do catalogo sem repetir e em ordem', () => {
    const lista = availableGenres([song('a', 'rock'), song('b', 'pop'), song('c', 'rock')]);
    expect(lista).toEqual([ALL_GENRES, 'pop', 'rock']);
  });

  it('ignora musicas sem genero', () => {
    expect(availableGenres([song('a'), song('b')])).toEqual([ALL_GENRES]);
  });

  it('encontra os generos do catalogo real', () => {
    expect(availableGenres(songs)).toEqual([
      ALL_GENRES,
      'eletronica',
      'hiphop',
      'kpop',
      'pop',
      'rock',
    ]);
  });

  it('todo genero do catalogo tem rotulo nos dois idiomas', () => {
    for (const genero of availableGenres(songs)) {
      expect(dictionaries['pt-BR'].genres[genero], `pt-BR sem rotulo para ${genero}`).toBeTruthy();
      expect(dictionaries.en.genres[genero], `en sem rotulo para ${genero}`).toBeTruthy();
    }
  });
});

describe('filterByGenre', () => {
  const catalogo = [song('a', 'rock'), song('b', 'pop'), song('c', 'rock')];

  it('devolve tudo em "todos"', () => {
    expect(filterByGenre(catalogo, ALL_GENRES)).toHaveLength(3);
  });

  it('filtra pelo genero pedido', () => {
    expect(filterByGenre(catalogo, 'rock').map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('cai para o catalogo inteiro se o genero nao existir', () => {
    // Melhor jogar com tudo do que travar numa tela sem musica.
    expect(filterByGenre(catalogo, 'jazz')).toHaveLength(3);
  });

  it('nao altera o array recebido', () => {
    filterByGenre(catalogo, 'rock').pop();
    expect(catalogo).toHaveLength(3);
  });

  it('cada genero do catalogo real tem musicas de sobra', () => {
    for (const genero of availableGenres(songs)) {
      expect(filterByGenre(songs, genero).length, genero).toBeGreaterThan(10);
    }
  });
});

describe('genreLabel', () => {
  const labels = { todos: 'Todos', kpop: 'K-pop' };

  it('usa o rotulo traduzido quando existe', () => {
    expect(genreLabel('kpop', labels)).toBe('K-pop');
  });

  it('capitaliza generos sem traducao', () => {
    expect(genreLabel('sertanejo', labels)).toBe('Sertanejo');
  });
});
