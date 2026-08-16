import { afterEach, describe, expect, it } from 'vitest';
import {
  MAX_SFX_SECONDS,
  playSfx,
  setSfxEnabled,
  sfxEnabled,
  sfxForResult,
  SFX,
  type SfxName,
} from '@/lib/audio/sfx';

const names = Object.keys(SFX) as SfxName[];

/** Quando o ultimo toque do efeito termina. */
const lengthOf = (name: SfxName): number =>
  Math.max(...SFX[name].map((tone) => tone.at + tone.duration));

afterEach(() => setSfxEnabled(true));

describe('desenho dos efeitos', () => {
  it('todo efeito tem pelo menos um toque', () => {
    for (const name of names) expect(SFX[name].length).toBeGreaterThan(0);
  });

  it('nenhum efeito passa do teto de duracao', () => {
    // Passar disso significaria cobrir a musica que a pessoa esta tentando ouvir.
    for (const name of names) expect(lengthOf(name)).toBeLessThanOrEqual(MAX_SFX_SECONDS);
  });

  it('nenhum toque comeca antes do efeito nem dura zero', () => {
    for (const name of names) {
      for (const tone of SFX[name]) {
        expect(tone.at).toBeGreaterThanOrEqual(0);
        expect(tone.duration).toBeGreaterThan(0);
      }
    }
  });

  it('as frequencias ficam na faixa audivel e util', () => {
    for (const name of names) {
      for (const tone of SFX[name]) {
        expect(tone.freq).toBeGreaterThan(100);
        expect(tone.freq).toBeLessThan(4000);
      }
    }
  });

  it('os ganhos ficam entre 0 e 1', () => {
    for (const name of names) {
      for (const tone of SFX[name]) {
        const gain = tone.gain ?? 1;
        expect(gain).toBeGreaterThan(0);
        expect(gain).toBeLessThanOrEqual(1);
      }
    }
  });

  it('o acerto sobe e o erro desce', () => {
    const correct = SFX.correct.map((tone) => tone.freq);
    expect([...correct].sort((a, b) => a - b)).toEqual(correct);

    const wrong = SFX.wrong.map((tone) => tone.freq);
    expect([...wrong].sort((a, b) => b - a)).toEqual(wrong);
  });

  it('os avisos repetidos sao mais discretos que os de jogada', () => {
    const discreto = (name: SfxName) => Math.max(...SFX[name].map((tone) => tone.gain ?? 1));
    for (const name of ['tick', 'chat', 'join'] as const) {
      expect(discreto(name)).toBeLessThan(discreto('correct'));
    }
  });
});

describe('som de cada jogada', () => {
  it('vencer toca a fanfarra, em qualquer tentativa', () => {
    expect(sfxForResult('correct', true, true)).toBe('victory');
  });

  it('perder na ultima tentativa toca a revelacao, nao o erro', () => {
    // A tela ja diz que acabou; repetir o som de erro seria esfregar.
    expect(sfxForResult('wrong', true, false)).toBe('reveal');
  });

  it('errar no meio da partida toca erro', () => {
    expect(sfxForResult('wrong', false, false)).toBe('wrong');
    expect(sfxForResult('artist', false, false)).toBe('wrong');
  });

  it('pular tem som proprio', () => {
    expect(sfxForResult('skipped', false, false)).toBe('skip');
  });

  it('sem tentativa nenhuma nao inventa fanfarra', () => {
    expect(sfxForResult(undefined, false, false)).toBe('wrong');
  });
});

describe('tocar sem audio disponivel', () => {
  it('nao quebra quando nao ha Web Audio', () => {
    for (const name of names) expect(() => playSfx(name)).not.toThrow();
  });

  it('respeita o desligamento', () => {
    setSfxEnabled(false);
    expect(sfxEnabled()).toBe(false);
    expect(() => playSfx('correct')).not.toThrow();

    setSfxEnabled(true);
    expect(sfxEnabled()).toBe(true);
  });
});
