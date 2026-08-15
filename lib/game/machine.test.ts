import { describe, expect, it } from 'vitest';
import {
  attemptsRemaining,
  createGame,
  skip,
  snippetDuration,
  submitGuess,
  unlockedStems,
} from '@/lib/game/machine';
import { buildInvite, buildShareGrid, buildShareText } from '@/lib/game/share';
import {
  formatSeconds,
  MAX_ATTEMPTS,
  SNIPPET_STEPS,
  type GameState,
  type Song,
} from '@/lib/game/types';

const answer: Song = {
  id: 'a',
  title: 'Tarde de Vinil',
  artist: 'Sofia Marés',
  year: 2022,
  source: 'synth',
};
const sameArtist: Song = { ...answer, id: 'b', title: 'Café Frio' };
const other: Song = { ...answer, id: 'c', title: 'Paper Airplane', artist: 'The Loop Cats' };

const newGame = (): GameState => createGame('trecho', 142, answer.id);

describe('transicoes', () => {
  it('comeca jogando, com 0.1s e so a bateria', () => {
    const state = newGame();
    expect(state.status).toBe('playing');
    expect(snippetDuration(state)).toBe(0.1);
    expect(unlockedStems(state)).toEqual(['drums']);
    expect(attemptsRemaining(state)).toBe(MAX_ATTEMPTS);
  });

  it('segue a curva do Songless a cada erro', () => {
    let state = newGame();
    const curva: number[] = [SNIPPET_STEPS[0]];
    for (let i = 1; i < MAX_ATTEMPTS; i += 1) {
      state = submitGuess(state, other, answer);
      curva.push(snippetDuration(state));
    }
    expect(curva).toEqual([0.1, 0.5, 2, 4, 8, 15]);
  });

  it('erro libera o proximo trecho e a proxima trilha', () => {
    const state = submitGuess(newGame(), other, answer);
    expect(state.status).toBe('playing');
    expect(snippetDuration(state)).toBe(0.5);
    expect(unlockedStems(state)).toEqual(['drums', 'bass']);
    expect(attemptsRemaining(state)).toBe(5);
  });

  it('skip gasta tentativa sem palpite', () => {
    const state = skip(newGame());
    expect(state.attempts[0]).toMatchObject({ songId: null, result: 'skipped' });
    expect(snippetDuration(state)).toBe(0.5);
  });

  it('acerto encerra em vitoria e libera tudo', () => {
    const state = submitGuess(skip(newGame()), answer, answer);
    expect(state.status).toBe('won');
    expect(state.attempts).toHaveLength(2);
    expect(snippetDuration(state)).toBe(15);
    expect(unlockedStems(state)).toHaveLength(6);
  });

  it('formata os segundos sem casas sobrando', () => {
    expect(formatSeconds(0.1)).toBe('0.1s');
    expect(formatSeconds(2)).toBe('2s');
    expect(formatSeconds(15)).toBe('15s');
  });

  it('artista certo continua a partida', () => {
    const state = submitGuess(newGame(), sameArtist, answer);
    expect(state.attempts[0]?.result).toBe('artist');
    expect(state.status).toBe('playing');
  });

  it('perde na sexta tentativa errada', () => {
    let state = newGame();
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) state = submitGuess(state, other, answer);
    expect(state.status).toBe('lost');
    expect(state.attempts).toHaveLength(MAX_ATTEMPTS);
    expect(attemptsRemaining(state)).toBe(0);
  });

  it('ignora jogadas depois do fim', () => {
    const won = submitGuess(newGame(), answer, answer);
    expect(submitGuess(won, other, answer)).toBe(won);
    expect(skip(won)).toBe(won);
  });

  it('nao muta o estado anterior', () => {
    const state = newGame();
    submitGuess(state, other, answer);
    expect(state.attempts).toHaveLength(0);
  });
});

describe('compartilhamento', () => {
  it('preenche as casas nao usadas', () => {
    const state = submitGuess(submitGuess(newGame(), other, answer), answer, answer);
    expect(buildShareGrid(state)).toBe('🟥🟩⬜⬜⬜⬜');
  });

  it('monta o texto de vitoria sem revelar a musica', () => {
    let state = submitGuess(newGame(), other, answer);
    state = submitGuess(state, other, answer);
    state = submitGuess(state, answer, answer);

    const text = buildShareText(state, 'guessthemusic.app');
    expect(text).toBe('GuessTheMusic Trecho #142 🎵 3/6\n🟥🟥🟩⬜⬜⬜\nguessthemusic.app');
    expect(text).not.toContain(answer.title);
  });

  it('monta o convite com resultado, chamada e link', () => {
    let state = submitGuess(newGame(), other, answer);
    state = submitGuess(state, answer, answer);

    const invite = buildInvite(state, 'https://guessthemusic.app', 'Jogue voce tambem:');
    expect(invite).toBe(
      'GuessTheMusic Trecho #142 🎵 2/6\n🟥🟩⬜⬜⬜⬜\n\nJogue voce tambem:\nhttps://guessthemusic.app',
    );
    expect(invite).not.toContain(answer.title);
  });

  it('usa X/6 na derrota', () => {
    let state = newGame();
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) state = skip(state);
    expect(buildShareText(state)).toContain('X/6');
    expect(buildShareGrid(state)).toBe('⬛⬛⬛⬛⬛⬛');
  });
});
