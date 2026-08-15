import { describe, expect, it } from 'vitest';
import { normalize } from '@/lib/game/normalize';
import { buildIndex, evaluateGuess, search } from '@/lib/game/guess';
import type { Song } from '@/lib/game/types';

const song = (id: string, artist: string, title: string, aliases?: string[]): Song => ({
  id,
  title,
  artist,
  year: 2020,
  source: 'synth',
  ...(aliases ? { aliases } : {}),
});

const catalog: Song[] = [
  song('a', 'Sofia Marés', 'Tarde de Vinil', ['sofia mares']),
  song('b', 'Sofia Marés', 'Café Frio'),
  song('c', 'Neon Cassete', 'Modem à Meia-Noite'),
  song('d', 'The Loop Cats', 'Paper Airplane'),
];

const index = buildIndex(catalog);

describe('normalize', () => {
  it('remove acentos, pontuacao e caixa', () => {
    expect(normalize('Modem à Meia-Noite')).toBe('modem a meia noite');
    expect(normalize('  Café   FRIO!! ')).toBe('cafe frio');
    expect(normalize('Sofia Marés')).toBe(normalize('sofia mares'));
  });

  it('trata & como "e"', () => {
    expect(normalize('Simon & Garfunkel')).toBe('simon e garfunkel');
  });

  it('devolve string vazia para entrada so de simbolos', () => {
    expect(normalize('--- !!! ')).toBe('');
  });
});

describe('search', () => {
  it('nao sugere nada com consulta vazia', () => {
    expect(search(index, '   ')).toHaveLength(0);
  });

  it('encontra ignorando acentos', () => {
    const hits = search(index, 'cafe');
    expect(hits.map((h) => h.song.id)).toEqual(['b']);
  });

  it('aceita termos fora de ordem', () => {
    const hits = search(index, 'vinil sofia');
    expect(hits.map((h) => h.song.id)).toEqual(['a']);
  });

  it('encontra por alias', () => {
    expect(search(index, 'sofia mares tarde').map((h) => h.song.id)).toEqual(['a']);
  });

  it('respeita o limite', () => {
    expect(search(index, 'a', 2).length).toBeLessThanOrEqual(2);
  });
});

describe('evaluateGuess', () => {
  const answer = catalog[0] as Song;

  it('acerta a musica exata', () => {
    expect(evaluateGuess(answer, answer)).toBe('correct');
  });

  it('marca artista certo com musica errada', () => {
    expect(evaluateGuess(catalog[1] as Song, answer)).toBe('artist');
  });

  it('marca palpite totalmente errado', () => {
    expect(evaluateGuess(catalog[2] as Song, answer)).toBe('wrong');
  });
});
