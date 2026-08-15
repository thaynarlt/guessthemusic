import { MAX_ATTEMPTS, type GameMode, type GameState } from '@/lib/game/types';

export const STORAGE_VERSION = 1;

export interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** distribution[i] = vitorias na tentativa i+1. */
  distribution: number[];
  lastPuzzleNumber: number | null;
}

export function emptyStats(): Stats {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: new Array<number>(MAX_ATTEMPTS).fill(0),
    lastPuzzleNumber: null,
  };
}

/** Le um valor desconhecido do storage e devolve estatisticas validas. */
export function migrateStats(raw: unknown): Stats {
  const base = emptyStats();
  if (typeof raw !== 'object' || raw === null) return base;

  const value = raw as Partial<Record<keyof Stats, unknown>>;
  const num = (input: unknown): number =>
    typeof input === 'number' && Number.isFinite(input) && input >= 0 ? Math.floor(input) : 0;

  const distribution = base.distribution.slice();
  if (Array.isArray(value.distribution)) {
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      distribution[i] = num(value.distribution[i]);
    }
  }

  return {
    played: num(value.played),
    wins: num(value.wins),
    currentStreak: num(value.currentStreak),
    maxStreak: num(value.maxStreak),
    distribution,
    lastPuzzleNumber:
      typeof value.lastPuzzleNumber === 'number' && Number.isFinite(value.lastPuzzleNumber)
        ? value.lastPuzzleNumber
        : null,
  };
}

export interface GameResult {
  puzzleNumber: number;
  won: boolean;
  /** Numero de tentativas usadas ate vencer (ignorado em derrota). */
  attempts: number;
}

/** Aplica o resultado de uma partida; a sequencia so continua em dias consecutivos. */
export function applyResult(stats: Stats, result: GameResult): Stats {
  if (stats.lastPuzzleNumber === result.puzzleNumber) return stats;

  const consecutive = stats.lastPuzzleNumber === result.puzzleNumber - 1;
  const currentStreak = result.won ? (consecutive ? stats.currentStreak + 1 : 1) : 0;
  const distribution = stats.distribution.slice();

  if (result.won) {
    const slot = Math.min(Math.max(result.attempts, 1), MAX_ATTEMPTS) - 1;
    distribution[slot] = (distribution[slot] ?? 0) + 1;
  }

  return {
    played: stats.played + 1,
    wins: stats.wins + (result.won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    distribution,
    lastPuzzleNumber: result.puzzleNumber,
  };
}

export function winRate(stats: Stats): number {
  return stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100);
}

export function resultFromState(state: GameState): GameResult {
  return {
    puzzleNumber: state.puzzleNumber,
    won: state.status === 'won',
    attempts: state.attempts.length,
  };
}

export const statsKey = (mode: GameMode): string => `gtm:v${STORAGE_VERSION}:stats:${mode}`;
export const gameKey = (mode: GameMode): string => `gtm:v${STORAGE_VERSION}:game:${mode}`;
export const settingsKey = (): string => `gtm:v${STORAGE_VERSION}:settings`;

function readJson(key: string): unknown {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage cheio ou bloqueado: o jogo segue sem persistir */
  }
}

export function loadStats(mode: GameMode): Stats {
  return migrateStats(readJson(statsKey(mode)));
}

export function saveStats(mode: GameMode, stats: Stats): void {
  writeJson(statsKey(mode), stats);
}

/** Recupera a partida em andamento; descarta se for de outro puzzle. */
export function loadGame(mode: GameMode, puzzleNumber: number): GameState | null {
  const raw = readJson(gameKey(mode));
  if (typeof raw !== 'object' || raw === null) return null;

  const value = raw as Partial<GameState>;
  if (value.puzzleNumber !== puzzleNumber || value.mode !== mode) return null;
  if (typeof value.answerId !== 'string' || !Array.isArray(value.attempts)) return null;
  if (value.status !== 'playing' && value.status !== 'won' && value.status !== 'lost') return null;

  return {
    mode,
    puzzleNumber,
    answerId: value.answerId,
    attempts: value.attempts.slice(0, MAX_ATTEMPTS),
    status: value.status,
  };
}

export function saveGame(state: GameState): void {
  writeJson(gameKey(state.mode), state);
}
