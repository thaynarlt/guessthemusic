import { describe, expect, it } from 'vitest';
import {
  dateKey,
  msUntilNextPuzzle,
  pickAnswer,
  pickRandom,
  puzzleNumberFor,
} from '@/lib/game/daily';
import { dailyAnswer, songs } from '@/lib/game/catalog';
import type { Song } from '@/lib/game/types';

/**
 * Catalogo sintetico para as propriedades do sorteio (nao repetir no ciclo,
 * reembaralhar, divergir entre modos). Sao propriedades do algoritmo: rodar
 * laco aninhado sobre as ~900 musicas reais so deixaria a suite lenta.
 */
const fake: Song[] = Array.from({ length: 12 }, (_, i) => ({
  id: `fake-${String(i).padStart(2, '0')}`,
  title: `Musica ${i}`,
  artist: `Artista ${i}`,
  year: 2000 + i,
  source: 'preview',
}));

describe('dateKey', () => {
  it('usa UTC, nao o fuso local', () => {
    expect(dateKey(new Date('2026-08-14T23:30:00Z'))).toBe('2026-08-14');
    expect(dateKey(new Date('2026-08-15T00:30:00Z'))).toBe('2026-08-15');
  });
});

describe('puzzleNumberFor', () => {
  it('comeca em #1 no dia de estreia', () => {
    expect(puzzleNumberFor('2026-01-01')).toBe(1);
    expect(puzzleNumberFor('2026-01-02')).toBe(2);
  });

  it('avanca de um em um mesmo cruzando meses e anos', () => {
    expect(puzzleNumberFor('2026-02-01') - puzzleNumberFor('2026-01-31')).toBe(1);
    expect(puzzleNumberFor('2027-01-01') - puzzleNumberFor('2026-12-31')).toBe(1);
  });
});

describe('msUntilNextPuzzle', () => {
  it('conta o que falta para a meia-noite UTC', () => {
    const now = Date.parse('2026-08-14T23:00:00Z');
    expect(msUntilNextPuzzle(now)).toBe(60 * 60 * 1000);
  });
});

describe('pickAnswer', () => {
  it('e deterministico para o mesmo dia e modo', () => {
    const a = pickAnswer(songs, 'trecho', 42);
    const b = pickAnswer(songs, 'trecho', 42);
    expect(a.id).toBe(b.id);
  });

  it('nao repete musica antes de percorrer o catalogo inteiro', () => {
    const ciclo = Array.from({ length: fake.length }, (_, i) => pickAnswer(fake, 'trecho', i + 1).id);
    expect(new Set(ciclo).size).toBe(fake.length);
  });

  it('embaralha de novo a cada ciclo', () => {
    const first = Array.from({ length: fake.length }, (_, i) => pickAnswer(fake, 'trecho', i + 1).id);
    const second = Array.from(
      { length: fake.length },
      (_, i) => pickAnswer(fake, 'trecho', fake.length + i + 1).id,
    );
    expect(second).not.toEqual(first);
    expect(new Set(second).size).toBe(fake.length);
  });

  it('nao repete a ordem entre os modos', () => {
    const trecho = Array.from({ length: fake.length }, (_, i) => pickAnswer(fake, 'trecho', i + 1).id);
    const banda = Array.from({ length: fake.length }, (_, i) => pickAnswer(fake, 'banda', i + 1).id);
    expect(banda).not.toEqual(trecho);
  });

  it('independe da ordem do arquivo de catalogo', () => {
    const reversed = songs.slice().reverse() as Song[];
    expect(pickAnswer(reversed, 'trecho', 7).id).toBe(pickAnswer(songs, 'trecho', 7).id);
  });

  it('rejeita catalogo vazio', () => {
    expect(() => pickAnswer([], 'trecho', 1)).toThrow();
  });

  it('desvia da musica indicada em avoidId', () => {
    const original = pickAnswer(songs, 'banda', 12);
    const desviada = pickAnswer(songs, 'banda', 12, original.id);
    expect(desviada.id).not.toBe(original.id);
  });

  it('ignora avoidId quando a musica sorteada ja e outra', () => {
    const original = pickAnswer(songs, 'banda', 12);
    expect(pickAnswer(songs, 'banda', 12, 'id-que-nao-existe').id).toBe(original.id);
  });
});

describe('pickRandom (modo livre)', () => {
  it('nunca devolve uma musica do historico recente', () => {
    const recentes = fake.slice(0, fake.length - 1).map((song) => song.id);
    for (let i = 0; i < 30; i += 1) {
      expect(recentes).not.toContain(pickRandom(fake, recentes).id);
    }
  });

  it('recomeca o ciclo quando todas ja foram tocadas', () => {
    const todas = fake.map((song) => song.id);
    expect(todas).toContain(pickRandom(fake, todas).id);
  });

  it('percorre o catalogo inteiro ao longo de varias rodadas', () => {
    const vistas = new Set<string>();
    let recentes: string[] = [];
    for (let i = 0; i < fake.length * 6; i += 1) {
      const song = pickRandom(fake, recentes);
      vistas.add(song.id);
      recentes = [song.id, ...recentes].slice(0, fake.length - 1);
    }
    expect(vistas.size).toBe(fake.length);
  });

  it('sorteia do catalogo real sem repetir a ultima', () => {
    const primeira = pickRandom(songs, []);
    expect(pickRandom(songs, [primeira.id]).id).not.toBe(primeira.id);
  });

  it('respeita o gerador injetado', () => {
    const ordenado = songs.slice().sort((a, b) => a.id.localeCompare(b.id));
    expect(pickRandom(songs, [], () => 0).id).toBe(songs[0]?.id);
    expect(ordenado.length).toBeGreaterThan(0);
  });

  it('nao estoura no limite superior do gerador', () => {
    expect(() => pickRandom(songs, [], () => 0.999999999)).not.toThrow();
  });

  it('rejeita catalogo vazio', () => {
    expect(() => pickRandom([], [])).toThrow();
  });
});

describe('dailyAnswer', () => {
  it('nunca repete a musica entre os dois modos no mesmo dia', () => {
    // Amostra ampla o bastante para pegar colisao, sem varrer o catalogo todo.
    for (let n = 1; n <= 120; n += 1) {
      expect(dailyAnswer('trecho', n).id, `puzzle #${n}`).not.toBe(dailyAnswer('banda', n).id);
    }
  });

  it('continua deterministico', () => {
    expect(dailyAnswer('banda', 42).id).toBe(dailyAnswer('banda', 42).id);
  });
});
