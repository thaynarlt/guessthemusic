import { evaluateGuess } from '@/lib/game/guess';
import {
  MAX_ATTEMPTS,
  SNIPPET_STEPS,
  STEM_ORDER,
  type Attempt,
  type GameMode,
  type GameState,
  type Song,
  type StemName,
} from '@/lib/game/types';

export function createGame(mode: GameMode, puzzleNumber: number, answerId: string): GameState {
  return { mode, puzzleNumber, answerId, attempts: [], status: 'playing' };
}

function advance(state: GameState, attempt: Attempt): GameState {
  if (state.status !== 'playing') return state;

  const attempts = [...state.attempts, attempt];
  const status: GameState['status'] =
    attempt.result === 'correct' ? 'won' : attempts.length >= MAX_ATTEMPTS ? 'lost' : 'playing';

  return { ...state, attempts, status };
}

export function submitGuess(state: GameState, guess: Song, answer: Song): GameState {
  return advance(state, {
    songId: guess.id,
    label: `${guess.artist} - ${guess.title}`,
    result: evaluateGuess(guess, answer),
  });
}

export function skip(state: GameState): GameState {
  return advance(state, { songId: null, label: '', result: 'skipped' });
}

/** Indice do nivel liberado (0..MAX_ATTEMPTS-1). */
export function unlockedLevel(state: GameState): number {
  return Math.min(state.attempts.length, MAX_ATTEMPTS - 1);
}

/** Duracao do trecho liberado, em segundos (modo Trecho). */
export function snippetDuration(state: GameState): number {
  const last = SNIPPET_STEPS[SNIPPET_STEPS.length - 1] ?? 16;
  if (state.status !== 'playing') return last;
  return SNIPPET_STEPS[unlockedLevel(state)] ?? last;
}

/**
 * Quantas camadas ja foram liberadas no modo Banda (trilhas ou faixas de
 * frequencia). Ao terminar a partida, libera tudo.
 */
export function unlockedCount(state: GameState): number {
  if (state.status !== 'playing') return MAX_ATTEMPTS;
  return unlockedLevel(state) + 1;
}

/** Trilhas ja liberadas (modo Banda). Ao terminar, libera a banda inteira. */
export function unlockedStems(state: GameState): StemName[] {
  return STEM_ORDER.slice(0, unlockedCount(state));
}

export function attemptsRemaining(state: GameState): number {
  return Math.max(0, MAX_ATTEMPTS - state.attempts.length);
}
