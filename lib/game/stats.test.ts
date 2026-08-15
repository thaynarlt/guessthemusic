import { describe, expect, it } from 'vitest';
import { applyResult, emptyStats, migrateStats, winRate } from '@/lib/game/stats';

describe('applyResult', () => {
  it('registra vitoria e inicia a sequencia', () => {
    const stats = applyResult(emptyStats(), { puzzleNumber: 10, won: true, attempts: 3 });
    expect(stats).toMatchObject({ played: 1, wins: 1, currentStreak: 1, maxStreak: 1 });
    expect(stats.distribution[2]).toBe(1);
  });

  it('soma a sequencia em dias consecutivos', () => {
    let stats = applyResult(emptyStats(), { puzzleNumber: 10, won: true, attempts: 1 });
    stats = applyResult(stats, { puzzleNumber: 11, won: true, attempts: 2 });
    expect(stats.currentStreak).toBe(2);
    expect(stats.maxStreak).toBe(2);
  });

  it('reinicia a sequencia se pulou um dia', () => {
    let stats = applyResult(emptyStats(), { puzzleNumber: 10, won: true, attempts: 1 });
    stats = applyResult(stats, { puzzleNumber: 13, won: true, attempts: 1 });
    expect(stats.currentStreak).toBe(1);
    expect(stats.maxStreak).toBe(1);
  });

  it('derrota zera a sequencia mas preserva o recorde', () => {
    let stats = applyResult(emptyStats(), { puzzleNumber: 10, won: true, attempts: 1 });
    stats = applyResult(stats, { puzzleNumber: 11, won: false, attempts: 6 });
    expect(stats.currentStreak).toBe(0);
    expect(stats.maxStreak).toBe(1);
    expect(stats.played).toBe(2);
  });

  it('e idempotente para o mesmo puzzle', () => {
    const first = applyResult(emptyStats(), { puzzleNumber: 10, won: true, attempts: 3 });
    expect(applyResult(first, { puzzleNumber: 10, won: true, attempts: 3 })).toBe(first);
  });
});

describe('winRate', () => {
  it('e 0 sem partidas', () => {
    expect(winRate(emptyStats())).toBe(0);
  });

  it('arredonda a porcentagem', () => {
    expect(winRate({ ...emptyStats(), played: 3, wins: 2 })).toBe(67);
  });
});

describe('migrateStats', () => {
  it('devolve o padrao para dados invalidos', () => {
    expect(migrateStats(null)).toEqual(emptyStats());
    expect(migrateStats('lixo')).toEqual(emptyStats());
    expect(migrateStats({ played: -4, wins: 'x' })).toEqual(emptyStats());
  });

  it('preenche a distribuicao de um schema antigo mais curto', () => {
    const stats = migrateStats({ played: 2, wins: 2, distribution: [1, 1] });
    expect(stats.distribution).toHaveLength(6);
    expect(stats.distribution).toEqual([1, 1, 0, 0, 0, 0]);
  });
});
