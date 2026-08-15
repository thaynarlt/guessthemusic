import { describe, expect, it } from 'vitest';
import { topPercent, type GlobalDistribution } from '@/lib/stats/global';

/** 10 jogadores: 2 acertaram na 1a, 3 na 2a, 1 na 4a e 4 nao acertaram. */
const dia: GlobalDistribution = {
  players: 10,
  wins: 6,
  losses: 4,
  distribution: [2, 3, 0, 1, 0, 0],
};

describe('topPercent', () => {
  it('acertar de primeira coloca voce no topo', () => {
    expect(topPercent(dia, { puzzleNumber: 1, won: true, attempts: 1 })).toBe(10);
  });

  it('conta so quem acertou em menos tentativas', () => {
    // 2 pessoas foram melhores + voce = 3 de 10.
    expect(topPercent(dia, { puzzleNumber: 1, won: true, attempts: 2 })).toBe(30);
  });

  it('derrota fica atras de qualquer vitoria', () => {
    expect(topPercent(dia, { puzzleNumber: 1, won: false, attempts: 6 })).toBe(70);
  });

  it('nao passa de 100% quando o proprio resultado ainda nao entrou no agregado', () => {
    const soVoce: GlobalDistribution = { players: 0, wins: 0, losses: 0, distribution: [] };
    expect(topPercent(soVoce, { puzzleNumber: 1, won: true, attempts: 1 })).toBeNull();

    const atrasado: GlobalDistribution = {
      players: 2,
      wins: 2,
      losses: 0,
      distribution: [2, 0, 0, 0, 0, 0],
    };
    expect(topPercent(atrasado, { puzzleNumber: 1, won: false, attempts: 6 })).toBe(100);
  });
});
