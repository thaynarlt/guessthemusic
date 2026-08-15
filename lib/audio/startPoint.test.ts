import { describe, expect, it } from 'vitest';
import { snippetStart, startSeed, type SampledAudio } from '@/lib/audio/startPoint';

const RATE = 8_000;

/** Faixa fake: `loud` lista os intervalos (em segundos) com som. */
function track(duration: number, loud: Array<[number, number]>): SampledAudio {
  const samples = new Float32Array(Math.round(duration * RATE));
  for (const [from, to] of loud) {
    const start = Math.round(from * RATE);
    const end = Math.min(samples.length, Math.round(to * RATE));
    // Onda simples: o que importa aqui e a energia, nao o timbre.
    for (let i = start; i < end; i += 1) samples[i] = Math.sin(i / 12) * 0.8;
  }
  return { duration, sampleRate: RATE, getChannelData: () => samples };
}

const NEEDED = 15;

describe('snippetStart', () => {
  it('comeca do zero quando a faixa nao tem folga', () => {
    const short = track(15, [[0, 15]]);
    expect(snippetStart(short, 1, NEEDED)).toBe(0);
  });

  it('deixa os segundos pedidos depois do ponto escolhido', () => {
    const song = track(30, [[0, 30]]);
    for (let seed = 0; seed < 40; seed += 1) {
      const at = snippetStart(song, seed, NEEDED);
      expect(at).toBeGreaterThanOrEqual(0);
      expect(at).toBeLessThanOrEqual(song.duration - NEEDED);
    }
  });

  it('e deterministico: mesma semente, mesmo ponto', () => {
    const song = track(30, [[0, 30]]);
    const seed = startSeed('deezer-4709950', 227);
    expect(snippetStart(song, seed, NEEDED)).toBe(snippetStart(song, seed, NEEDED));
  });

  it('varia com a semente', () => {
    const song = track(30, [[0, 30]]);
    const pontos = new Set(
      Array.from({ length: 40 }, (_, seed) => snippetStart(song, seed, NEEDED)),
    );
    expect(pontos.size).toBeGreaterThan(3);
  });

  it('nao comeca no silencio do inicio', () => {
    // 8s mudos na frente: nenhum candidato de la pode ser escolhido.
    const song = track(30, [[8, 30]]);
    for (let seed = 0; seed < 40; seed += 1) {
      expect(snippetStart(song, seed, NEEDED)).toBeGreaterThanOrEqual(8);
    }
  });

  it('cai no trecho mais forte quando a faixa toda e fraca', () => {
    const song = track(30, [[12, 13]]);
    const at = snippetStart(song, 7, NEEDED);
    expect(at).toBeGreaterThan(10);
    expect(at).toBeLessThanOrEqual(13);
  });

  it('a semente muda com o puzzle e com a musica', () => {
    expect(startSeed('a', 1)).not.toBe(startSeed('a', 2));
    expect(startSeed('a', 1)).not.toBe(startSeed('b', 1));
  });
});
