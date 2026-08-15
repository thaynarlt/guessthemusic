import { describe, expect, it } from 'vitest';
import { FREQUENCY_LAYERS } from '@/lib/audio/layers';
import { dictionaries } from '@/lib/i18n/strings';
import { MAX_ATTEMPTS } from '@/lib/game/types';

describe('FREQUENCY_LAYERS', () => {
  it('tem uma camada por tentativa', () => {
    expect(FREQUENCY_LAYERS).toHaveLength(MAX_ATTEMPTS);
  });

  it('cobre o espectro inteiro, das pontas ao meio', () => {
    expect(FREQUENCY_LAYERS[0]?.low).toBeNull();
    expect(FREQUENCY_LAYERS[FREQUENCY_LAYERS.length - 1]?.high).toBeNull();
  });

  it('nao deixa buraco entre as bandas', () => {
    for (let i = 0; i < FREQUENCY_LAYERS.length - 1; i += 1) {
      const atual = FREQUENCY_LAYERS[i];
      const proxima = FREQUENCY_LAYERS[i + 1];
      expect(atual?.high, `banda ${i} sem corte superior`).not.toBeNull();
      expect(proxima?.low, `banda ${i + 1} nao encosta na anterior`).toBe(atual?.high);
    }
  });

  it('sobe em frequencia, sem repetir corte', () => {
    const cortes = FREQUENCY_LAYERS.map((layer) => layer.high).filter(
      (value): value is number => value !== null,
    );
    expect(cortes).toEqual([...cortes].sort((a, b) => a - b));
    expect(new Set(cortes).size).toBe(cortes.length);
  });

  it('fica dentro da faixa audivel', () => {
    for (const layer of FREQUENCY_LAYERS) {
      if (layer.low !== null) expect(layer.low).toBeGreaterThan(20);
      if (layer.high !== null) expect(layer.high).toBeLessThan(20_000);
    }
  });

  it('tem ids unicos e traduzidos nos dois idiomas', () => {
    const ids = FREQUENCY_LAYERS.map((layer) => layer.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const id of ids) {
      expect(dictionaries['pt-BR'].layers[id], `pt-BR sem rotulo para ${id}`).toBeTruthy();
      expect(dictionaries.en.layers[id], `en sem rotulo para ${id}`).toBeTruthy();
    }
  });
});
