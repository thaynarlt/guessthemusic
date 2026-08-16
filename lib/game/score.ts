import { MAX_ATTEMPTS, type GameState } from '@/lib/game/types';

/** Pontos de um acerto de primeira (nivel 0, o trecho de 0,2s). */
export const MAX_POINTS = MAX_ATTEMPTS;

/**
 * Pontos de um acerto no nivel `level` — 6 em 0,2s, 5 em 0,5s, ate 1 em 15s.
 *
 * Errar e pular avancam o mesmo degrau, entao custam a mesma coisa: 1 ponto.
 * Nao existe, portanto, vantagem em pular; o botao so serve para nao perder
 * tempo com uma tentativa que voce ja sabe que nao tem.
 */
export function pointsForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 0 || level >= MAX_ATTEMPTS) return 0;
  return MAX_POINTS - level;
}

/** Pontos de uma partida encerrada. Quem nao acertou nao pontua. */
export function pointsForGame(state: GameState): number {
  if (state.status !== 'won') return 0;
  return pointsForLevel(state.attempts.length - 1);
}
