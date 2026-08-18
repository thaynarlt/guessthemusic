import { describe, expect, it } from 'vitest';
import { songs } from '@/lib/game/catalog';
import { mulberry32 } from '@/lib/game/random';
import { HISTORY_LIMIT, pickFresh, remember, type PlayedSong } from '@/lib/game/rotation';
import type { Song } from '@/lib/game/types';

/** Catalogo sintetico: 40 musicas de 8 artistas, 5 de cada. */
const fake: Song[] = Array.from({ length: 40 }, (_, i) => ({
  id: `fake-${String(i).padStart(2, '0')}`,
  title: `Musica ${i}`,
  artist: `Artista ${i % 8}`,
  year: 2000,
  source: 'preview',
}));

/** Uma sessao inteira, com gerador semeado: o teste nao pode depender de sorte. */
function play(pool: readonly Song[], rounds: number, seed = 7): Song[] {
  const random = mulberry32(seed);
  let history: PlayedSong[] = [];
  const order: Song[] = [];

  for (let i = 0; i < rounds; i += 1) {
    const song = pickFresh(pool, history, random);
    order.push(song);
    history = remember(history, song);
  }
  return order;
}

/** Menor intervalo (em rodadas) entre duas aparicoes da mesma chave. */
function shortestGap(order: readonly Song[], key: (song: Song) => string): number {
  const lastSeen = new Map<string, number>();
  let gap = Infinity;

  order.forEach((song, round) => {
    const previous = lastSeen.get(key(song));
    if (previous !== undefined) gap = Math.min(gap, round - previous);
    lastSeen.set(key(song), round);
  });
  return gap;
}

describe('remember', () => {
  it('poe a rodada nova na frente', () => {
    const history = remember(remember([], fake[0] as Song), fake[1] as Song);
    expect(history.map((play) => play.id)).toEqual([fake[1]?.id, fake[0]?.id]);
  });

  it('guarda o artista junto, para o historico valer depois da troca de filtro', () => {
    expect(remember([], fake[3] as Song)[0]?.artist).toBe('Artista 3');
  });

  it('nao cresce sem limite', () => {
    let history: PlayedSong[] = [];
    for (let i = 0; i < HISTORY_LIMIT * 2; i += 1) {
      history = remember(history, fake[i % fake.length] as Song);
    }
    expect(history).toHaveLength(HISTORY_LIMIT);
  });
});

describe('pickFresh', () => {
  it('deixa a musica descansar muitas rodadas antes de voltar', () => {
    // Pool de 40 => quarentena de 16 rodadas. O historico antigo, de 8 musicas,
    // deixava a mesma voltar na nona.
    expect(shortestGap(play(fake, 300), (song) => song.id)).toBeGreaterThan(16);
  });

  it('espaca o mesmo artista', () => {
    expect(shortestGap(play(fake, 300), (song) => song.artist)).toBeGreaterThan(1);
  });

  it('percorre o catalogo inteiro ao longo da sessao', () => {
    expect(new Set(play(fake, 300).map((song) => song.id)).size).toBe(fake.length);
  });

  it('nao trava quando o filtro deixa um artista so', () => {
    const soloArtist = fake.filter((song) => song.artist === 'Artista 0');
    const order = play(soloArtist, 40);
    expect(order).toHaveLength(40);
    expect(new Set(order.map((song) => song.id)).size).toBe(soloArtist.length);
  });

  it('nao trava com uma musica so no pool', () => {
    const only = fake.slice(0, 1);
    expect(play(only, 5).map((song) => song.id)).toEqual(Array(5).fill(only[0]?.id));
  });

  it('respeita o gerador injetado', () => {
    expect(pickFresh(fake, [], () => 0).id).toBe(fake[0]?.id);
  });

  it('nao estoura no limite superior do gerador', () => {
    expect(() => pickFresh(fake, [], () => 0.999999999)).not.toThrow();
  });

  it('rejeita catalogo vazio', () => {
    expect(() => pickFresh([], [])).toThrow();
  });

  it('segura a mesma musica por mais de cem rodadas no catalogo real', () => {
    expect(shortestGap(play(songs, 300), (song) => song.id)).toBeGreaterThan(100);
  });

  it('segura o mesmo artista por varias rodadas no catalogo real', () => {
    // Antes, com 12 musicas de Michael Jackson no catalogo, ele podia sair duas
    // rodadas seguidas — a queixa que originou este modulo.
    expect(shortestGap(play(songs, 300), (song) => song.artist)).toBeGreaterThan(8);
  });
});
