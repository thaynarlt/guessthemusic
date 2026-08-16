'use client';

import { create } from 'zustand';
import { playSfx } from '@/lib/audio/sfx';
import { getSong } from '@/lib/game/catalog';
import { createDuel, duelGuess, duelNextRound, duelSkip, type DuelState } from '@/lib/game/duel';
import { EMPTY_FILTER, type CatalogFilter } from '@/lib/game/filter';
import { freeRound } from '@/lib/puzzle/today';
import type { GameMode, Song } from '@/lib/game/types';

/** Quantas musicas guardar para nao repetir dentro do mesmo duelo. */
const RECENT_MEMORY = 12;

interface DuelStore {
  duel: DuelState | null;
  filter: CatalogFilter;
  /** Muda a cada jogada, para a animacao de erro sacudir a linha certa. */
  nonce: number;
  start: (mode: GameMode, names: string[], rounds: number, filter: CatalogFilter) => void;
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

  /** Som da jogada: quem rouba a rodada leva a fanfarra. */
  const announce = (duel: DuelState): void => {
    const last = duel.round.attempts[duel.round.attempts.length - 1];
    if (duel.status === 'finished') playSfx('victory');
    else if (duel.round.status === 'over')
      playSfx(last?.result === 'correct' ? 'correct' : 'reveal');
    else playSfx(last?.result === 'skipped' ? 'skip' : 'wrong');
  };

  /** Sorteia a proxima musica evitando as ultimas do duelo. */
  const draw = (mode: GameMode, filter: CatalogFilter): Song => {
    const song = freeRound(mode, recent, filter);
    recent.unshift(song.id);
    recent.length = Math.min(recent.length, RECENT_MEMORY);
    return song;
  };

  return {
    duel: null,
    filter: EMPTY_FILTER,
    nonce: 0,

    start: (mode, names, rounds, filter) => {
      recent.length = 0;
      set({ duel: createDuel(mode, names, rounds, draw(mode, filter).id), filter, nonce: 0 });
    },

    guess: (song) => {
      const { duel } = get();
      if (!duel) return;
      const answer = getSong(duel.round.answerId);
      if (!answer) return;

      const next = duelGuess(duel, song, answer);
      set((state) => ({ duel: next, nonce: state.nonce + 1 }));
      announce(next);
    },

    skip: () => {
      const { duel } = get();
      if (!duel) return;

      const next = duelSkip(duel);
      set((state) => ({ duel: next, nonce: state.nonce + 1 }));
      announce(next);
    },

    next: () => {
      const { duel, filter } = get();
      if (!duel) return;
      set({ duel: duelNextRound(duel, draw(duel.mode, filter).id), nonce: 0 });
    },

    reset: () => {
      recent.length = 0;
      set({ duel: null, nonce: 0 });
    },
  };
});
