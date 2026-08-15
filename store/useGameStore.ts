'use client';

import { create } from 'zustand';
import { createGame, skip as skipTurn, submitGuess } from '@/lib/game/machine';
import {
  applyResult,
  emptyStats,
  loadGame,
  loadStats,
  resultFromState,
  saveGame,
  saveStats,
  type Stats,
} from '@/lib/game/stats';
import { reportResult } from '@/lib/stats/global';
import { sessionId, type GameMode, type GameState, type GameVariant, type Song } from '@/lib/game/types';

/** Placar da sessao livre — vive so na memoria, some ao recarregar. */
export interface FreeScore {
  rounds: number;
  wins: number;
}

interface GameStore {
  games: Record<string, GameState | undefined>;
  stats: Partial<Record<GameMode, Stats>>;
  free: Record<string, FreeScore | undefined>;
  /** Ultima jogada, para disparar a animacao de erro na linha certa. */
  lastFeedback: { session: string; nonce: number; result: string } | null;
  startDaily: (mode: GameMode, puzzleNumber: number, answerId: string) => void;
  startFree: (mode: GameMode, round: number, answerId: string) => void;
  guess: (variant: GameVariant, mode: GameMode, guessed: Song, answer: Song) => void;
  skip: (variant: GameVariant, mode: GameMode) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  games: {},
  stats: {},
  free: {},
  lastFeedback: null,

  startDaily: (mode, puzzleNumber, answerId) => {
    const saved = loadGame(mode, puzzleNumber);
    const game =
      saved && saved.answerId === answerId ? saved : createGame(mode, puzzleNumber, answerId);

    set((state) => ({
      games: { ...state.games, [sessionId('diario', mode)]: game },
      stats: { ...state.stats, [mode]: loadStats(mode) },
    }));
  },

  // O modo livre nao le nem grava nada: cada rodada comeca limpa.
  startFree: (mode, round, answerId) => {
    set((state) => ({
      games: { ...state.games, [sessionId('livre', mode)]: createGame(mode, round, answerId) },
    }));
  },

  guess: (variant, mode, guessed, answer) => {
    applyMove(variant, mode, set, get, (current) => submitGuess(current, guessed, answer));
  },

  skip: (variant, mode) => {
    applyMove(variant, mode, set, get, (current) => skipTurn(current));
  },
}));

type SetState = (partial: (state: GameStore) => Partial<GameStore>) => void;
type GetState = () => GameStore;

/** Aplica a jogada e, quando a partida termina, contabiliza no lugar certo. */
function applyMove(
  variant: GameVariant,
  mode: GameMode,
  set: SetState,
  get: GetState,
  advance: (current: GameState) => GameState,
): void {
  const session = sessionId(variant, mode);
  const current = get().games[session];
  if (!current || current.status !== 'playing') return;

  const next = advance(current);
  const finished = next.status !== 'playing';
  const last = next.attempts[next.attempts.length - 1];

  let stats = get().stats[mode] ?? emptyStats();
  let free = get().free[session] ?? { rounds: 0, wins: 0 };

  if (variant === 'diario') {
    saveGame(next);
    if (finished) {
      const result = resultFromState(next);
      stats = applyResult(stats, result);
      saveStats(mode, stats);
      void reportResult(mode, result);
    }
  } else if (finished) {
    free = { rounds: free.rounds + 1, wins: free.wins + (next.status === 'won' ? 1 : 0) };
  }

  set((state) => ({
    games: { ...state.games, [session]: next },
    stats: { ...state.stats, [mode]: stats },
    free: { ...state.free, [session]: free },
    lastFeedback: { session, nonce: next.attempts.length, result: last?.result ?? 'wrong' },
  }));
}
