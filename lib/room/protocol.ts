import { ALL_GENRES } from '@/lib/game/genres';
import { pointsForGame } from '@/lib/game/score';
import type { GameMode, GameState } from '@/lib/game/types';

/** Cabem confortavelmente na tela do placar, e o Realtime nem sente. */
export const MAX_ROOM_PLAYERS = 8;

/** Opcoes de duracao de uma partida, em rodadas. */
export const ROOM_ROUND_OPTIONS = [3, 5, 10] as const;

/**
 * Quanto tempo a rodada espera por quem ainda nao respondeu.
 *
 * Sem isso uma pessoa que fechou a aba trava a sala inteira — o anfitriao
 * encerra a rodada no estouro e quem nao respondeu fica com zero.
 */
export const ROUND_TIMEOUT_MS = 90_000;

export interface RoundResult {
  /** Degrau em que respondeu: 0 = 0,2s. */
  level: number;
  points: number;
  won: boolean;
  /** Milissegundos ate responder — so criterio de desempate. */
  ms: number;
}

export type RoomPhase = 'lobby' | 'playing' | 'intermission' | 'finished';

/**
 * Estado da sala, na versao do anfitriao.
 *
 * O anfitriao transmite o objeto inteiro a cada mudanca, em vez de deltas: sao
 * poucos bytes e resolve de graca o caso de quem entra no meio ou perde uma
 * mensagem — a proxima transmissao ja corrige o cliente.
 */
export interface RoomSnapshot {
  phase: RoomPhase;
  mode: GameMode;
  /** Filtro de genero do sorteio, escolhido pelo anfitriao. */
  genre: string;
  /** 0 no lobby; 1 na primeira rodada. */
  round: number;
  totalRounds: number;
  /** Id da musica da rodada. O catalogo ja esta no bundle de todo mundo. */
  songId: string | null;
  /** Epoch em ms do inicio da rodada, base do cronometro. */
  startedAt: number | null;
  /** Pontos acumulados, por id de jogador. */
  scores: Record<string, number>;
  /** Resultados da rodada corrente, por id de jogador. */
  results: Record<string, RoundResult>;
}

/** Tamanho maximo de uma mensagem do chat, em caracteres. */
export const MAX_CHAT_LENGTH = 200;

/** Mensagens que trafegam no canal. */
export type RoomMessage =
  | { kind: 'state'; snapshot: RoomSnapshot }
  | { kind: 'done'; playerId: string; result: RoundResult }
  | { kind: 'chat'; playerId: string; name: string; text: string };

export interface RoomPlayer {
  id: string;
  name: string;
  /** Epoch em ms de quando entrou — define quem e o anfitriao. */
  joinedAt: number;
}

export const emptySnapshot = (
  mode: GameMode,
  totalRounds: number,
  genre: string = ALL_GENRES,
): RoomSnapshot => ({
  phase: 'lobby',
  mode,
  genre,
  round: 0,
  totalRounds,
  songId: null,
  startedAt: null,
  scores: {},
  results: {},
});

/**
 * Linha do mural da sala: quem entrou, quem saiu e o que foi dito.
 *
 * Entradas e saidas nao viajam pelo canal — cada cliente as deduz comparando
 * duas leituras de presenca, entao nao ha mensagem a mais nem risco de um aviso
 * chegar duplicado.
 */
export type RoomEvent =
  | { kind: 'joined'; id: string; name: string; at: number }
  | { kind: 'left'; id: string; name: string; at: number }
  | { kind: 'chat'; id: string; name: string; text: string; at: number };

/** Quanto do mural fica na memoria. Sala nao tem historico: e conversa de agora. */
export const MAX_FEED = 50;

/** Quem entrou e quem saiu entre duas leituras de presenca. */
export function presenceDiff(
  before: readonly RoomPlayer[],
  after: readonly RoomPlayer[],
): { joined: RoomPlayer[]; left: RoomPlayer[] } {
  const antes = new Set(before.map((player) => player.id));
  const depois = new Set(after.map((player) => player.id));

  return {
    joined: after.filter((player) => !antes.has(player.id)),
    left: before.filter((player) => !depois.has(player.id)),
  };
}

/** Corta a mensagem no limite e recusa o que sobrou vazio. */
export function sanitizeChat(text: string): string | null {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHAT_LENGTH);
  return clean.length > 0 ? clean : null;
}

/**
 * Quem manda na sala.
 *
 * Quem chegou primeiro, com o id como criterio de desempate para todo mundo
 * chegar ao mesmo nome sem precisar negociar. Se o anfitriao cair, o proximo da
 * fila assume sozinho na proxima sincronizacao de presenca.
 */
export function hostId(players: readonly RoomPlayer[]): string | null {
  if (players.length === 0) return null;
  const [first] = [...players].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
  return first?.id ?? null;
}

/** Comeca uma rodada com uma musica nova, zerando os resultados da anterior. */
export function startRound(
  snapshot: RoomSnapshot,
  songId: string,
  startedAt: number,
): RoomSnapshot {
  return {
    ...snapshot,
    phase: 'playing',
    round: snapshot.round + 1,
    songId,
    startedAt,
    results: {},
  };
}

/** Registra o resultado de um jogador. A primeira resposta e a que vale. */
export function applyResult(
  snapshot: RoomSnapshot,
  playerId: string,
  result: RoundResult,
): RoomSnapshot {
  if (snapshot.phase !== 'playing' || snapshot.results[playerId]) return snapshot;
  return { ...snapshot, results: { ...snapshot.results, [playerId]: result } };
}

/** Todo mundo que esta na sala agora ja respondeu? */
export const everyoneDone = (snapshot: RoomSnapshot, players: readonly RoomPlayer[]): boolean =>
  players.length > 0 && players.every((player) => snapshot.results[player.id] !== undefined);

/** A rodada estourou o tempo? */
export const roundExpired = (snapshot: RoomSnapshot, now: number): boolean =>
  snapshot.phase === 'playing' &&
  snapshot.startedAt !== null &&
  now - snapshot.startedAt >= ROUND_TIMEOUT_MS;

/** Fecha a rodada: soma os pontos e decide se a partida acabou. */
export function closeRound(snapshot: RoomSnapshot): RoomSnapshot {
  if (snapshot.phase !== 'playing') return snapshot;

  const scores = { ...snapshot.scores };
  for (const [playerId, result] of Object.entries(snapshot.results)) {
    scores[playerId] = (scores[playerId] ?? 0) + result.points;
  }

  return {
    ...snapshot,
    phase: snapshot.round >= snapshot.totalRounds ? 'finished' : 'intermission',
    scores,
    startedAt: null,
  };
}

/** Resultado que um jogador anuncia ao terminar a partida local dele. */
export const resultOf = (state: GameState, ms: number): RoundResult => ({
  level: Math.max(0, state.attempts.length - 1),
  points: pointsForGame(state),
  won: state.status === 'won',
  ms,
});

export interface RoomScoreRow {
  id: string;
  name: string;
  score: number;
  pending: boolean;
}

/**
 * Placar ordenado. Empate em pontos vai para quem respondeu mais rapido no
 * acumulado — sem isso, com 6 pontos por rodada, empate seria a regra.
 */
export function roomRanking(
  players: readonly RoomPlayer[],
  snapshot: RoomSnapshot,
  tiebreak: Record<string, number> = {},
): RoomScoreRow[] {
  return [...players]
    .map((player) => ({
      id: player.id,
      name: player.name,
      score: snapshot.scores[player.id] ?? 0,
      pending: snapshot.phase === 'playing' && snapshot.results[player.id] === undefined,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (tiebreak[a.id] ?? Number.POSITIVE_INFINITY) -
          (tiebreak[b.id] ?? Number.POSITIVE_INFINITY) ||
        a.name.localeCompare(b.name),
    );
}
