import rawSongs from '@/data/songs.json';
import { pickAnswer } from '@/lib/game/daily';
import { buildIndex } from '@/lib/game/guess';
import type { GameMode, Song } from '@/lib/game/types';

/**
 * Catalogo do jogo. A validacao pesada (arquivos existentes, campos obrigatorios)
 * roda em `scripts/build-catalog.ts`, antes do build.
 */
export const songs = rawSongs as Song[];

export const catalogIndex = buildIndex(songs);

const byId = new Map(songs.map((song) => [song.id, song]));

export function getSong(id: string): Song | undefined {
  return byId.get(id);
}

/**
 * A musica tem trilhas isoladas de verdade? Se sim, o modo Banda revela
 * instrumento a instrumento; se nao, revela por faixa de frequencia.
 */
export function songUsesStems(song: Song): boolean {
  return song.source === 'synth' || song.stems !== undefined;
}

/** Musicas jogaveis em um modo — hoje, todas em ambos. */
export function playableSongs(_mode: GameMode): Song[] {
  return songs;
}

/**
 * Resposta do dia de um modo, garantindo que os dois modos nunca caiam na mesma
 * musica no mesmo dia.
 */
export function dailyAnswer(mode: GameMode, puzzleNumber: number): Song {
  const trecho = pickAnswer(playableSongs('trecho'), 'trecho', puzzleNumber);
  if (mode === 'trecho') return trecho;
  return pickAnswer(playableSongs('banda'), 'banda', puzzleNumber, trecho.id);
}
