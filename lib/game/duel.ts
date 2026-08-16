import { evaluateGuess } from '@/lib/game/guess';
import { pointsForLevel } from '@/lib/game/score';
import { MAX_ATTEMPTS, type Attempt, type GameMode, type Song } from '@/lib/game/types';

/** Quantos jogadores cabem em um aparelho so, na pratica. */
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

/** Opcoes de duracao de um duelo, em rodadas. */
export const ROUND_OPTIONS = [3, 5, 10] as const;

export interface DuelPlayer {
  id: string;
  name: string;
  score: number;
}

/** Tentativa do duelo: alem do palpite, quem jogou e quanto o degrau pagou. */
export interface DuelAttempt extends Attempt {
  playerId: string;
  /** Pontos ganhos. Sempre 0 quando nao foi acerto. */
  points: number;
}

export interface DuelRound {
  /** 1 = primeira rodada. */
  number: number;
  answerId: string;
  /** Degrau atual: 0 = 0,2s, 5 = 15s. */
  level: number;
  /** Indice, em `players`, de quem joga agora. */
  turn: number;
  attempts: DuelAttempt[];
  winnerId: string | null;
  status: 'playing' | 'over';
}

export interface DuelState {
  mode: GameMode;
  players: DuelPlayer[];
  totalRounds: number;
  round: DuelRound;
  status: 'playing' | 'finished';
}

/**
 * Quem abre a rodada. Rotaciona para ninguem ficar sempre com o degrau mais
 * caro: comecar e vantagem (0,2s vale 6), mas tambem e quem entrega o degrau
 * seguinte de graca ao errar.
 */
const openingTurn = (roundNumber: number, players: number): number => (roundNumber - 1) % players;

function newRound(roundNumber: number, answerId: string, players: number): DuelRound {
  return {
    number: roundNumber,
    answerId,
    level: 0,
    turn: openingTurn(roundNumber, players),
    attempts: [],
    winnerId: null,
    status: 'playing',
  };
}

export function createDuel(
  mode: GameMode,
  names: readonly string[],
  totalRounds: number,
  firstAnswerId: string,
): DuelState {
  const players = names.map((name, index) => ({ id: `p${index}`, name, score: 0 }));
  return {
    mode,
    players,
    totalRounds,
    round: newRound(1, firstAnswerId, players.length),
    status: 'playing',
  };
}

export const currentPlayer = (state: DuelState): DuelPlayer | undefined =>
  state.players[state.round.turn];

/** A rodada acabou e ainda ha rodadas pela frente? */
export const canAdvance = (state: DuelState): boolean =>
  state.round.status === 'over' && state.round.number < state.totalRounds;

/** Placar do maior para o menor. Empate mantem a ordem de entrada. */
export const ranking = (state: DuelState): DuelPlayer[] =>
  [...state.players].sort((a, b) => b.score - a.score);

/**
 * Registra uma jogada e passa a vez.
 *
 * Acertar encerra a rodada e paga `6 - degrau`. Errar ou pular consomem o mesmo
 * degrau e entregam a vez ao proximo — que ouve um trecho maior, mas vale menos.
 */
function advance(state: DuelState, attempt: Omit<DuelAttempt, 'points'>): DuelState {
  const { round, players } = state;
  if (round.status !== 'playing' || state.status !== 'playing') return state;

  const correct = attempt.result === 'correct';
  const points = correct ? pointsForLevel(round.level) : 0;
  const attempts = [...round.attempts, { ...attempt, points }];

  // Cada jogada consome um degrau; os 6 degraus esgotam a rodada.
  const exhausted = attempts.length >= MAX_ATTEMPTS;
  const over = correct || exhausted;

  const nextRoundState: DuelRound = {
    ...round,
    level: over ? round.level : round.level + 1,
    turn: over ? round.turn : (round.turn + 1) % players.length,
    attempts,
    winnerId: correct ? attempt.playerId : null,
    status: over ? 'over' : 'playing',
  };

  return {
    ...state,
    players: correct
      ? players.map((player) =>
          player.id === attempt.playerId ? { ...player, score: player.score + points } : player,
        )
      : players,
    round: nextRoundState,
    status: over && round.number >= state.totalRounds ? 'finished' : state.status,
  };
}

export function duelGuess(state: DuelState, guess: Song, answer: Song): DuelState {
  const player = currentPlayer(state);
  if (!player) return state;

  return advance(state, {
    playerId: player.id,
    songId: guess.id,
    label: `${guess.artist} - ${guess.title}`,
    result: evaluateGuess(guess, answer),
  });
}

export function duelSkip(state: DuelState): DuelState {
  const player = currentPlayer(state);
  if (!player) return state;

  return advance(state, { playerId: player.id, songId: null, label: '', result: 'skipped' });
}

/** Comeca a proxima rodada com uma musica nova. Ignorado no fim do duelo. */
export function duelNextRound(state: DuelState, answerId: string): DuelState {
  if (!canAdvance(state)) return state;
  return { ...state, round: newRound(state.round.number + 1, answerId, state.players.length) };
}
