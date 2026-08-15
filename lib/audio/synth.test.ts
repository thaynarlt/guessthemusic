import { describe, expect, it } from 'vitest';
import { renderMix, renderStem, SYNTH_DURATION } from '@/lib/audio/synth';
import { STEM_ORDER, type SynthSpec } from '@/lib/game/types';

/** Taxa reduzida: o teste checa conteudo do sinal, nao fidelidade. */
const SAMPLE_RATE = 16_000;

const spec: SynthSpec = {
  bpm: 100,
  root: 45,
  mode: 'minor',
  progression: [0, 8, 3, 10],
  seed: 4242,
};

function rms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += (samples[i] ?? 0) ** 2;
  return Math.sqrt(sum / samples.length);
}

describe('renderStem', () => {
  it('cobre a duracao necessaria para o trecho de 16s', () => {
    const samples = renderStem(spec, 'drums', SAMPLE_RATE);
    expect(samples.length).toBeGreaterThanOrEqual(16 * SAMPLE_RATE);
    expect(samples.length).toBe(Math.ceil(SYNTH_DURATION * SAMPLE_RATE));
  });

  it('gera sinal audivel em todas as trilhas', () => {
    for (const stem of STEM_ORDER) {
      const samples = renderStem(spec, stem, SAMPLE_RATE);
      expect(rms(samples), `trilha ${stem} saiu em silencio`).toBeGreaterThan(0.001);
    }
  });

  it('nao estoura a faixa [-1, 1]', () => {
    for (const stem of STEM_ORDER) {
      const samples = renderStem(spec, stem, SAMPLE_RATE);
      let peak = 0;
      for (let i = 0; i < samples.length; i += 1) peak = Math.max(peak, Math.abs(samples[i] ?? 0));
      expect(peak).toBeLessThanOrEqual(1);
    }
  });

  it('e deterministico para a mesma spec', () => {
    const a = renderStem(spec, 'bass', SAMPLE_RATE);
    const b = renderStem(spec, 'bass', SAMPLE_RATE);
    expect(Array.from(a.slice(0, 2000))).toEqual(Array.from(b.slice(0, 2000)));
  });

  it('muda quando a semente muda', () => {
    const a = renderStem(spec, 'other', SAMPLE_RATE);
    const b = renderStem({ ...spec, seed: spec.seed + 1 }, 'other', SAMPLE_RATE);
    expect(Array.from(a.slice(0, 4000))).not.toEqual(Array.from(b.slice(0, 4000)));
  });

  it('trilhas diferentes soam diferente', () => {
    const drums = renderStem(spec, 'drums', SAMPLE_RATE);
    const keys = renderStem(spec, 'keys', SAMPLE_RATE);
    expect(Array.from(drums.slice(0, 4000))).not.toEqual(Array.from(keys.slice(0, 4000)));
  });

  it('comeca a tocar no instante zero', () => {
    // O modo Trecho corta o primeiro segundo: nao pode ser silencio.
    const mix = renderMix(spec, SAMPLE_RATE);
    expect(rms(mix.slice(0, SAMPLE_RATE))).toBeGreaterThan(0.001);
  });
});

describe('renderMix', () => {
  it('soma as trilhas sem clipar', () => {
    const mix = renderMix(spec, SAMPLE_RATE);
    let peak = 0;
    for (let i = 0; i < mix.length; i += 1) peak = Math.max(peak, Math.abs(mix[i] ?? 0));
    expect(peak).toBeGreaterThan(0.05);
    expect(peak).toBeLessThanOrEqual(1);
  });

  it('tem mais energia que uma trilha isolada', () => {
    expect(rms(renderMix(spec, SAMPLE_RATE))).toBeGreaterThan(
      rms(renderStem(spec, 'keys', SAMPLE_RATE)),
    );
  });
});
