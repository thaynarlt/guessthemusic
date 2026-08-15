import { MAX_ATTEMPTS, type GameState, type GameMode, type GuessResult } from '@/lib/game/types';

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

/** Cabecalho com modo, numero do puzzle e placar. */
function buildHeader(state: GameState): string {
  const score =
    state.status === 'won' ? `${state.attempts.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
  return `GuessTheMusic ${MODE_LABEL[state.mode]} #${state.puzzleNumber} 🎵 ${score}`;
}

/** Texto de compartilhamento, sem revelar a musica. */
export function buildShareText(state: GameState, url: string = SHARE_URL): string {
  return [buildHeader(state), buildShareGrid(state), url].join('\n');
}

/** Mensagem de convite: resultado + chamada para o outro jogar tambem. */
export function buildInvite(state: GameState, url: string, callToAction: string): string {
  return [buildHeader(state), buildShareGrid(state), '', callToAction, url].join('\n');
}

export const modeLabel = (state: GameState): string => MODE_LABEL[state.mode];
