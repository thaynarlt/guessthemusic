import { describe, expect, it } from 'vitest';
import {
  canAdvance,
  createDuel,
  currentPlayer,
  duelGuess,
  duelNextRound,
  duelSkip,
  ranking,
  type DuelState,
} from '@/lib/game/duel';
import { MAX_ATTEMPTS, type Song } from '@/lib/game/types';

const answer: Song = {
  id: 'a',
  title: 'Tarde de Vinil',
  artist: 'Sofia Marés',
  year: 2022,
  source: 'synth',
};
const sameArtist: Song = { ...answer, id: 'b', title: 'Café Frio' };
const other: Song = { ...answer, id: 'c', title: 'Paper Airplane', artist: 'The Loop Cats' };

const newDuel = (rounds = 3, names = ['Ana', 'Bia']): DuelState =>
  createDuel('trecho', names, rounds, answer.id);

const nameOfTurn = (state: DuelState): string | undefined => currentPlayer(state)?.name;

describe('turnos', () => {
  it('comeca na primeira jogadora, no degrau de 0.2s', () => {
    const state = newDuel();
    expect(nameOfTurn(state)).toBe('Ana');
    expect(state.round.level).toBe(0);
    expect(state.round.number).toBe(1);
    expect(state.status).toBe('playing');
  });

  it('errar passa a vez e sobe um degrau', () => {
    const state = duelGuess(newDuel(), other, answer);
    expect(nameOfTurn(state)).toBe('Bia');
    expect(state.round.level).toBe(1);
    expect(state.round.status).toBe('playing');
  });

  it('pular passa a vez e sobe um degrau, igual a errar', () => {
    const pulou = duelSkip(newDuel());
    const errou = duelGuess(newDuel(), other, answer);
    expect(pulou.round.level).toBe(errou.round.level);
    expect(nameOfTurn(pulou)).toBe(nameOfTurn(errou));
  });

  it('acertar o artista mas nao a musica ainda passa a vez', () => {
    const state = duelGuess(newDuel(), sameArtist, answer);
    expect(state.round.attempts[0]?.result).toBe('artist');
    expect(state.round.status).toBe('playing');
    expect(nameOfTurn(state)).toBe('Bia');
  });

  it('reveza entre tres jogadoras', () => {
    let state = newDuel(3, ['Ana', 'Bia', 'Cris']);
    const ordem = [nameOfTurn(state)];
    for (let i = 0; i < 3; i += 1) {
      state = duelSkip(state);
      ordem.push(nameOfTurn(state));
    }
    expect(ordem).toEqual(['Ana', 'Bia', 'Cris', 'Ana']);
  });
});

describe('pontuacao do roubo', () => {
  it('acerto de primeira leva 6 e encerra a rodada', () => {
    const state = duelGuess(newDuel(), answer, answer);
    expect(state.round.status).toBe('over');
    expect(state.round.winnerId).toBe('p0');
    expect(state.players[0]?.score).toBe(6);
    expect(state.players[1]?.score).toBe(0);
  });

  it('quem rouba no degrau seguinte leva 5', () => {
    const state = duelGuess(duelGuess(newDuel(), other, answer), answer, answer);
    expect(state.round.winnerId).toBe('p1');
    expect(state.players[1]?.score).toBe(5);
    expect(state.players[0]?.score).toBe(0);
  });

  it('o degrau pago cai um a cada jogada perdida', () => {
    for (let misses = 0; misses < MAX_ATTEMPTS; misses += 1) {
      let state = newDuel();
      for (let i = 0; i < misses; i += 1) state = duelSkip(state);
      const won = duelGuess(state, answer, answer);
      const winner = won.players.find((player) => player.id === won.round.winnerId);
      expect(winner?.score).toBe(6 - misses);
    }
  });

  it('rodada sem acerto nao pontua ninguem', () => {
    let state = newDuel();
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) state = duelSkip(state);
    expect(state.round.status).toBe('over');
    expect(state.round.winnerId).toBeNull();
    expect(state.players.every((player) => player.score === 0)).toBe(true);
  });

  it('ignora jogadas depois do fim da rodada', () => {
    const won = duelGuess(newDuel(), answer, answer);
    expect(duelGuess(won, answer, answer)).toBe(won);
    expect(duelSkip(won)).toBe(won);
  });
});

describe('rodadas', () => {
  it('a proxima rodada zera o degrau e troca quem abre', () => {
    const state = duelNextRound(duelGuess(newDuel(), answer, answer), other.id);
    expect(state.round.number).toBe(2);
    expect(state.round.level).toBe(0);
    expect(state.round.answerId).toBe(other.id);
    expect(state.round.attempts).toEqual([]);
    expect(nameOfTurn(state)).toBe('Bia');
  });

  it('mantem os pontos ganhos entre rodadas', () => {
    const state = duelNextRound(duelGuess(newDuel(), answer, answer), other.id);
    expect(state.players[0]?.score).toBe(6);
  });

  it('encerra o duelo depois da ultima rodada', () => {
    let state = newDuel(2);
    state = duelGuess(state, answer, answer);
    expect(state.status).toBe('playing');
    expect(canAdvance(state)).toBe(true);

    state = duelNextRound(state, other.id);
    state = duelGuess(state, answer, answer);
    expect(state.status).toBe('finished');
    expect(canAdvance(state)).toBe(false);
    expect(duelNextRound(state, answer.id)).toBe(state);
  });

  it('ordena o ranking do maior para o menor', () => {
    // Ana leva 6 na rodada 1; na rodada 2 Bia abre, erra, e Ana rouba por 5.
    let state = duelGuess(newDuel(2), answer, answer);
    state = duelNextRound(state, other.id);
    state = duelGuess(state, other, answer);
    state = duelGuess(state, answer, answer);

    expect(ranking(state).map((player) => [player.name, player.score])).toEqual([
      ['Ana', 11],
      ['Bia', 0],
    ]);
  });
});
