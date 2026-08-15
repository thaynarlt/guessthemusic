import { dailyAnswer, playableSongs } from '@/lib/game/catalog';
import { dateKey, pickRandom, puzzleNumberFor } from '@/lib/game/daily';
import { ALL_GENRES, filterByGenre } from '@/lib/game/genres';
import type { GameMode, Song } from '@/lib/game/types';

export interface DailyPuzzle {
  puzzleNumber: number;
  song: Song;
}

/** Rodada do modo livre: sorteio na hora, filtrando por genero e evitando repetir as ultimas. */
export function freeRound(
  mode: GameMode,
  recentIds: readonly string[],
  genre: string = ALL_GENRES,
): Song {
  return pickRandom(filterByGenre(playableSongs(mode), genre), recentIds);
}

/** Numero do puzzle de hoje (nao e segredo: aparece no compartilhamento). */
export function todayPuzzleNumber(): number {
  return puzzleNumberFor(dateKey());
}

function resolveLocally(mode: GameMode): DailyPuzzle {
  const puzzleNumber = todayPuzzleNumber();
  return { puzzleNumber, song: dailyAnswer(mode, puzzleNumber) };
}

/**
 * Resolve o puzzle do dia.
 *
 * Por padrao tudo acontece no cliente (`local`). Com NEXT_PUBLIC_PUZZLE_SOURCE=api
 * a resposta vem do Route Handler, que so serve o dia corrente — assim as
 * respostas futuras nao ficam no bundle. Se a rota falhar, cai no modo local.
 */
export async function resolveDaily(mode: GameMode): Promise<DailyPuzzle> {
  if (process.env.NEXT_PUBLIC_PUZZLE_SOURCE !== 'api') return resolveLocally(mode);

  try {
    const response = await fetch(`/api/puzzle?mode=${mode}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('puzzle indisponivel');
    const data = (await response.json()) as DailyPuzzle;
    if (!data.song || typeof data.puzzleNumber !== 'number') throw new Error('resposta invalida');
    return data;
  } catch {
    return resolveLocally(mode);
  }
}
