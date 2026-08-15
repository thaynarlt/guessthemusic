import {
  MAX_ATTEMPTS,
  type GameState,
  type GameMode,
  type GameVariant,
  type GuessResult,
} from '@/lib/game/types';

const SQUARES: Record<GuessResult, string> = {
  correct: '🟩',
  artist: '🟨',
  wrong: '🟥',
  skipped: '⬛',
};

const EMPTY_SQUARE = '⬜';

export const SHARE_URL = 'guessthemusic.app';

const MODE_LABEL: Record<GameMode, string> = {
  trecho: 'Trecho',
  banda: 'Banda',
};

/** Linha de emojis do resultado, sempre com MAX_ATTEMPTS casas. */
export function buildShareGrid(state: GameState): string {
  const played = state.attempts.map((attempt) => SQUARES[attempt.result]).join('');
  return played + EMPTY_SQUARE.repeat(MAX_ATTEMPTS - state.attempts.length);
}

/**
 * Identificacao da partida: modo e, no diario, o numero do puzzle.
 *
 * No modo livre o `puzzleNumber` e so a contagem de rodadas da sessao, que nao
 * significa nada para quem recebe — por isso ele fica de fora. Texto e imagem
 * usam esta mesma funcao para nao divergirem.
 */
export function shareTitle(state: GameState, variant: GameVariant = 'diario'): string {
  const mode = MODE_LABEL[state.mode];
  return variant === 'livre' ? `${mode} livre` : `${mode} #${state.puzzleNumber}`;
}

/** Placar no formato "3/6", ou "X/6" na derrota. */
export function shareScore(state: GameState): string {
  return state.status === 'won'
    ? `${state.attempts.length}/${MAX_ATTEMPTS}`
    : `X/${MAX_ATTEMPTS}`;
}

/** Cabecalho com modo, numero do puzzle e placar. */
function buildHeader(state: GameState, variant: GameVariant): string {
  return `GuessTheMusic ${shareTitle(state, variant)} 🎵 ${shareScore(state)}`;
}

/** Texto de compartilhamento, sem revelar a musica. */
export function buildShareText(
  state: GameState,
  url: string = SHARE_URL,
  variant: GameVariant = 'diario',
): string {
  return [buildHeader(state, variant), buildShareGrid(state), url].join('\n');
}

/** Mensagem de convite: resultado + chamada para o outro jogar tambem. */
export function buildInvite(
  state: GameState,
  url: string,
  callToAction: string,
  variant: GameVariant = 'diario',
): string {
  return [buildHeader(state, variant), buildShareGrid(state), '', callToAction, url].join('\n');
}

