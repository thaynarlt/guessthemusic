import { describe, expect, it } from 'vitest';
import { createGame, skip, submitGuess } from '@/lib/game/machine';
import { MAX_POINTS, pointsForGame, pointsForLevel } from '@/lib/game/score';
import { MAX_ATTEMPTS, SNIPPET_STEPS, type GameState, type Song } from '@/lib/game/types';

const answer: Song = {
  id: 'a',
  title: 'Tarde de Vinil',
  artist: 'Sofia Marés',
  year: 2022,
  source: 'synth',
};
const other: Song = { ...answer, id: 'c', title: 'Paper Airplane', artist: 'The Loop Cats' };

const newGame = (): GameState => createGame('trecho', 142, answer.id);

/** Erra `count` vezes e devolve o estado resultante. */
const missTimes = (count: number): GameState => {
  let state = newGame();
  for (let i = 0; i < count; i += 1) state = submitGuess(state, other, answer);
  return state;
};

describe('pontuacao por nivel', () => {
  it('cai um ponto por degrau, de 6 em 0.2s ate 1 em 15s', () => {
    const curva = SNIPPET_STEPS.map((_, level) => pointsForLevel(level));
    expect(curva).toEqual([6, 5, 4, 3, 2, 1]);
  });

  it('vale MAX_POINTS no primeiro nivel', () => {
    expect(pointsForLevel(0)).toBe(MAX_POINTS);
    expect(MAX_POINTS).toBe(MAX_ATTEMPTS);
  });

  it('zera fora da faixa de niveis validos', () => {
    expect(pointsForLevel(-1)).toBe(0);
    expect(pointsForLevel(MAX_ATTEMPTS)).toBe(0);
    expect(pointsForLevel(1.5)).toBe(0);
    expect(pointsForLevel(Number.NaN)).toBe(0);
  });
});

describe('pontuacao de uma partida', () => {
  it('acerto de primeira vale 6', () => {
    expect(pointsForGame(submitGuess(newGame(), answer, answer))).toBe(6);
  });

  it('cada erro anterior custa um ponto', () => {
    for (let misses = 0; misses < MAX_ATTEMPTS; misses += 1) {
      const won = submitGuess(missTimes(misses), answer, answer);
      expect(won.status).toBe('won');
      expect(pointsForGame(won)).toBe(MAX_POINTS - misses);
    }
  });

  it('pular custa o mesmo que errar', () => {
    const pulou = submitGuess(skip(skip(newGame())), answer, answer);
    const errou = submitGuess(missTimes(2), answer, answer);
    expect(pointsForGame(pulou)).toBe(pointsForGame(errou));
    expect(pointsForGame(pulou)).toBe(4);
  });

  it('acertar na ultima tentativa ainda vale 1', () => {
    const won = submitGuess(missTimes(MAX_ATTEMPTS - 1), answer, answer);
    expect(pointsForGame(won)).toBe(1);
  });

  it('perder nao pontua', () => {
    const lost = missTimes(MAX_ATTEMPTS);
    expect(lost.status).toBe('lost');
    expect(pointsForGame(lost)).toBe(0);
  });

  it('partida em andamento nao pontua', () => {
    expect(pointsForGame(newGame())).toBe(0);
    expect(pointsForGame(missTimes(3))).toBe(0);
  });
});
