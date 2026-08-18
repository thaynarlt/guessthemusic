import { hashString, shuffle } from '@/lib/game/random';
import type { GameMode, Song } from '@/lib/game/types';

/** Dia do puzzle #1. Trocar isto renumera todo o historico. */
export const EPOCH_DATE_KEY = '2026-01-01';

const DAY_MS = 86_400_000;

/** Chave "YYYY-MM-DD" do dia em UTC. */
export function dateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Converte "YYYY-MM-DD" para o timestamp de meia-noite UTC daquele dia. */
export function dateKeyToUtc(key: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new Error(`Data invalida: ${key}`);
  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

/** Numero do puzzle do dia; o dia de estreia e o #1. */
export function puzzleNumberFor(key: string): number {
  const days = Math.floor((dateKeyToUtc(key) - dateKeyToUtc(EPOCH_DATE_KEY)) / DAY_MS);
  return days + 1;
}

/** Milissegundos ate a proxima meia-noite UTC. */
export function msUntilNextPuzzle(now: number = Date.now()): number {
  return DAY_MS - (((now % DAY_MS) + DAY_MS) % DAY_MS);
}

/**
 * Escolhe a resposta do dia.
 *
 * O catalogo e embaralhado por "ciclo" (cada ciclo percorre todas as musicas uma
 * unica vez), entao nada se repete antes de o catalogo inteiro ter sido usado.
 * A ordem tambem depende do modo, para os dois modos nao andarem juntos.
 *
 * `avoidId` evita a colisao residual entre modos no mesmo dia: dois sorteios
 * independentes podem cair na mesma musica, e isso entregaria o segundo modo
 * de graca a quem ja jogou o primeiro.
 */
export function pickAnswer(
  songs: readonly Song[],
  mode: GameMode,
  puzzleNumber: number,
  avoidId?: string,
): Song {
  if (songs.length === 0) throw new Error('Catalogo vazio');

  const ordered = songs.slice().sort((a, b) => a.id.localeCompare(b.id));
  const index = (((puzzleNumber - 1) % ordered.length) + ordered.length) % ordered.length;
  const cycle = Math.floor((puzzleNumber - 1) / ordered.length);
  const rotation = shuffle(ordered, hashString(`${mode}:${cycle}`));

  let picked = rotation[index];
  if (avoidId !== undefined && picked?.id === avoidId && rotation.length > 1) {
    picked = rotation[(index + 1) % rotation.length];
  }

  if (!picked) throw new Error('Falha ao sortear a musica do dia');
  return picked;
}
