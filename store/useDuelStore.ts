'use client';

import { create } from 'zustand';
import { getSong } from '@/lib/game/catalog';
import { createDuel, duelGuess, duelNextRound, duelSkip, type DuelState } from '@/lib/game/duel';
import { ALL_GENRES } from '@/lib/game/genres';
import { freeRound } from '@/lib/puzzle/today';
import type { GameMode, Song } from '@/lib/game/types';

/** Quantas musicas guardar para nao repetir dentro do mesmo duelo. */
const RECENT_MEMORY = 12;

interface DuelStore {
  duel: DuelState | null;
  genre: string;
  /** Muda a cada jogada, para a animacao de erro sacudir a linha certa. */
  nonce: number;
  start: (mode: GameMode, names: string[], rounds: number, genre: string) => void;
  guess: (song: Song) => void;
  skip: () => void;
  next: () => void;
  reset: () => void;
}

/**
 * Duelo local. Igual ao modo livre, nao grava nada: o placar vive na memoria e
 * some ao recarregar — nao mexe na sequencia nem nas estatisticas do diario.
 */
export const useDuelStore = create<DuelStore>((set, get) => {
  const recent: string[] = [];

  /** Sorteia a proxima musica evitando as ultimas do duelo. */
  const draw = (mode: GameMode, genre: string): Song => {
    const song = freeRound(mode, recent, genre);
    recent.unshift(song.id);
    recent.length = Math.min(recent.length, RECENT_MEMORY);
    return song;
  };

  return {
    duel: null,
    genre: ALL_GENRES,
    nonce: 0,

    start: (mode, names, rounds, genre) => {
      recent.length = 0;
      set({ duel: createDuel(mode, names, rounds, draw(mode, genre).id), genre, nonce: 0 });
    },

    guess: (song) => {
      const { duel } = get();
      if (!duel) return;
      const answer = getSong(duel.round.answerId);
      if (!answer) return;
      set((state) => ({ duel: duelGuess(duel, song, answer), nonce: state.nonce + 1 }));
    },

    skip: () => {
      const { duel } = get();
      if (!duel) return;
      set((state) => ({ duel: duelSkip(duel), nonce: state.nonce + 1 }));
    },

    next: () => {
      const { duel, genre } = get();
      if (!duel) return;
      set({ duel: duelNextRound(duel, draw(duel.mode, genre).id), nonce: 0 });
    },

    reset: () => {
      recent.length = 0;
      set({ duel: null, nonce: 0 });
    },
  };
});
