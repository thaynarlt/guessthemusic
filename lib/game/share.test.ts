import { describe, expect, it } from 'vitest';
import { buildInvite, buildShareGrid, buildShareText, shareScore, shareTitle } from '@/lib/game/share';
import type { GameState, GuessResult } from '@/lib/game/types';

function game(results: GuessResult[], status: GameState['status']): GameState {
  return {
    mode: 'trecho',
    puzzleNumber: 227,
    answerId: 'deezer-4709950',
    attempts: results.map((result) => ({ songId: 'x', label: 'palpite', result })),
    status,
  };
}

const vitoria = game(['wrong', 'skipped', 'correct'], 'won');
const derrota = game(['wrong', 'wrong', 'wrong', 'wrong', 'wrong', 'wrong'], 'lost');

describe('buildShareGrid', () => {
  it('completa as seis casas com quadrado vazio', () => {
    expect(buildShareGrid(vitoria)).toBe('🟥⬛🟩⬜⬜⬜');
  });
});

describe('buildShareText', () => {
  it('leva o numero do puzzle no diario', () => {
    expect(buildShareText(vitoria, 'exemplo.app')).toContain('Trecho #227');
  });

  it('troca o numero do puzzle por "livre" no modo livre', () => {
    const texto = buildShareText(vitoria, 'exemplo.app', 'livre');
    expect(texto).toContain('Trecho livre');
    expect(texto).not.toContain('#227');
  });

  it('marca a derrota com X', () => {
    expect(buildShareText(derrota, 'exemplo.app')).toContain('X/6');
  });

  it('nunca cita a musica', () => {
    for (const variant of ['diario', 'livre'] as const) {
      const texto = buildShareText(vitoria, 'exemplo.app', variant);
      expect(texto).not.toContain('deezer-4709950');
      expect(texto.toLowerCase()).not.toContain('paparazzi');
    }
  });
});

describe('shareTitle', () => {
  // A imagem usa a mesma funcao do texto: no livre, "#1" seria o numero da
  // rodada da sessao e leria como se fosse o puzzle do dia.
  it('leva o numero do puzzle so no diario', () => {
    expect(shareTitle(vitoria, 'diario')).toBe('Trecho #227');
    expect(shareTitle(vitoria, 'livre')).toBe('Trecho livre');
  });

  it('placar marca vitoria e derrota', () => {
    expect(shareScore(vitoria)).toBe('3/6');
    expect(shareScore(derrota)).toBe('X/6');
  });
});

describe('buildInvite', () => {
  it('junta placar, grade e chamada', () => {
    const convite = buildInvite(vitoria, 'exemplo.app', 'Jogue voce tambem:');
    expect(convite.split('\n')).toEqual([
      'GuessTheMusic Trecho #227 🎵 3/6',
      '🟥⬛🟩⬜⬜⬜',
      '',
      'Jogue voce tambem:',
      'exemplo.app',
    ]);
  });
});
