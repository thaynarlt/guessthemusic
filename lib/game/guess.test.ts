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
  // O titulo nao denuncia a participacao — e exatamente o caso do "Sua Cara".
  { ...song('e', 'The Loop Cats', 'Sua Cara'), featuring: ['Neon Cassete', 'Pabllo Vittar'] },
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

  it('encontra pela participacao que nao aparece no titulo', () => {
    expect(search(index, 'pabllo').map((h) => h.song.id)).toEqual(['e']);
  });

  it('a participacao nao atrapalha a busca pelo artista principal', () => {
    expect(search(index, 'loop cats sua cara').map((h) => h.song.id)).toEqual(['e']);
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

  it('chutar a convidada da resposta conta como artista certo', () => {
    const comFeat = catalog[4] as Song;
    // "Neon Cassete" e convidada em "Sua Cara": quem chutou a musica dela
    // reconheceu a voz, entao leva o amarelo.
    expect(evaluateGuess(catalog[2] as Song, comFeat)).toBe('artist');
  });

  it('vale na direcao contraria tambem', () => {
    const comFeat = catalog[4] as Song;
    expect(evaluateGuess(comFeat, catalog[2] as Song)).toBe('artist');
  });

  it('participacao diferente nao aproxima duas musicas', () => {
    const outra: Song = { ...song('f', 'Outro Artista', 'Outra'), featuring: ['Alguem Mais'] };
    expect(evaluateGuess(outra, catalog[4] as Song)).toBe('wrong');
  });

  it('acerto exato continua valendo mais que o artista', () => {
    const comFeat = catalog[4] as Song;
    expect(evaluateGuess(comFeat, comFeat)).toBe('correct');
  });
});
