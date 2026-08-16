import { EMPTY_FILTER, type CatalogFilter } from '@/lib/game/filter';
import { pointsForLevel } from '@/lib/game/score';
import { SNIPPET_STEPS, type GameMode, type GameState } from '@/lib/game/types';

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

/**
 * Formato da partida.
 *
 * `ritmo` — cada um libera o proprio trecho, no tempo que quiser.
 * `corrida` — o trecho cresce no relogio, igual para todos ao mesmo tempo.
 *
 * A diferenca nao e cosmetica. No ritmo, demorar nao custa nada; na corrida,
 * cada degrau que passa vale um ponto a menos para todo mundo — e a duvida
 * ("arrisco agora ou ouco mais?") e o jogo inteiro.
 */
export type RoomFormat = 'ritmo' | 'corrida';

/** Quanto cada degrau fica no ar na corrida. */
export const RACE_STEP_MS = 8_000;

/** Duracao da rodada na corrida: os seis degraus mais um respiro. */
export const RACE_TIMEOUT_MS = RACE_STEP_MS * SNIPPET_STEPS.length + 6_000;

/**
 * Trava depois de errar, na corrida.
 *
 * O degrau ja nao e seu, entao o custo do erro tem que ser tempo — senao
 * metralhar palpite volta a ser estrategia.
 */
export const RACE_LOCKOUT_MS = 4_000;

/** Depois do primeiro acerto, quanto os outros ainda tem. */
export const LAST_CALL_MS = 12_000;

/** Bonus de quem chega em 1o, 2o e 3o na corrida. */
export const PLACE_BONUS = [3, 2, 1] as const;

/** Teto do pote: rodada seca dobra o valor da proxima, ate aqui. */
export const MAX_POT = 4;

/** Degrau liberado pelo relogio da corrida. */
export const raceLevel = (elapsedMs: number): number =>
  Math.min(SNIPPET_STEPS.length - 1, Math.max(0, Math.floor(elapsedMs / RACE_STEP_MS)));

export const placeBonus = (place: number): number => PLACE_BONUS[place] ?? 0;

export interface RoundResult {
  /** Degrau em que respondeu: 0 = 0,2s. */
  level: number;
  points: number;
  won: boolean;
  /** Milissegundos ate responder, medidos no proprio aparelho. */
  ms: number;
  /**
   * Carimbo do anfitriao ao receber. E este que decide quem chegou antes.
   *
   * O `ms` de cada um nao serve para isso: o cronometro comeca quando o
   * aparelho recebe o inicio da rodada, e quem recebeu depois mediria um tempo
   * menor para a mesma resposta — ganhando a corrida por ter internet pior.
   */
  at?: number;
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
  format: RoomFormat;
  /** Filtro do sorteio (genero, epoca, artista), escolhido pelo anfitriao. */
  filter: CatalogFilter;
  /** 0 no lobby; 1 na primeira rodada. */
  round: number;
  totalRounds: number;
  /** Multiplicador da rodada. Sobe quando ninguem acerta. */
  pot: number;
  /** Quando o primeiro acertou, na corrida. Dispara a ultima chamada. */
  lastCallAt: number | null;
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
  filter: CatalogFilter = EMPTY_FILTER,
  format: RoomFormat = 'ritmo',
): RoomSnapshot => ({
  phase: 'lobby',
  mode,
  format,
  filter,
  round: 0,
  totalRounds,
  pot: 1,
  lastCallAt: null,
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
    lastCallAt: null,
    results: {},
  };
}

/**
 * Registra o resultado de um jogador. A primeira resposta e a que vale.
 *
 * Na corrida, o primeiro acerto dispara a ultima chamada: sem isso a rodada
 * ficaria aberta ate o relogio inteiro estourar, com todo mundo esperando por
 * quem ja desistiu.
 */
export function applyResult(
  snapshot: RoomSnapshot,
  playerId: string,
  result: RoundResult,
  now: number,
): RoomSnapshot {
  if (snapshot.phase !== 'playing' || snapshot.results[playerId]) return snapshot;

  const primeiro = snapshot.format === 'corrida' && result.won && snapshot.lastCallAt === null;
  return {
    ...snapshot,
    results: { ...snapshot.results, [playerId]: { ...result, at: now } },
    lastCallAt: primeiro ? now : snapshot.lastCallAt,
  };
}

/** Todo mundo que esta na sala agora ja respondeu? */
export const everyoneDone = (snapshot: RoomSnapshot, players: readonly RoomPlayer[]): boolean =>
  players.length > 0 && players.every((player) => snapshot.results[player.id] !== undefined);

/**
 * Quando a rodada acaba, em epoch ms. Nulo fora de rodada.
 *
 * Na corrida sao dois prazos e vale o que chegar antes: o relogio dos degraus
 * ou a ultima chamada disparada pelo primeiro acerto.
 */
export function roundDeadline(snapshot: RoomSnapshot): number | null {
  if (snapshot.phase !== 'playing' || snapshot.startedAt === null) return null;

  const cheio =
    snapshot.startedAt + (snapshot.format === 'corrida' ? RACE_TIMEOUT_MS : ROUND_TIMEOUT_MS);

  return snapshot.lastCallAt === null ? cheio : Math.min(cheio, snapshot.lastCallAt + LAST_CALL_MS);
}

/** A rodada estourou o tempo? */
export const roundExpired = (snapshot: RoomSnapshot, now: number): boolean => {
  const deadline = roundDeadline(snapshot);
  return deadline !== null && now >= deadline;
};

/**
 * Pontos que cada jogador leva na rodada.
 *
 * No ritmo a ordem nao importa: cada um pagou o proprio degrau. Na corrida a
 * ordem E o jogo — o degrau vale igual para todos ao mesmo tempo, entao o que
 * separa quem acertou e quem chegou antes.
 */
export function scoreRound(snapshot: RoomSnapshot): Record<string, number> {
  const earned: Record<string, number> = {};
  for (const playerId of Object.keys(snapshot.results)) earned[playerId] = 0;

  if (snapshot.format === 'ritmo') {
    for (const [playerId, result] of Object.entries(snapshot.results)) {
      earned[playerId] = result.points * snapshot.pot;
    }
    return earned;
  }

  // Ordena pelo carimbo do anfitriao, nao pelo cronometro de cada aparelho.
  const ordem = Object.entries(snapshot.results)
    .filter(([, result]) => result.won)
    .sort((a, b) => (a[1].at ?? a[1].ms) - (b[1].at ?? b[1].ms));

  ordem.forEach(([playerId, result], place) => {
    earned[playerId] = (result.points + placeBonus(place)) * snapshot.pot;
  });

  return earned;
}

/** Fecha a rodada: soma os pontos, ajusta o pote e decide se a partida acabou. */
export function closeRound(snapshot: RoomSnapshot): RoomSnapshot {
  if (snapshot.phase !== 'playing') return snapshot;

  const scores = { ...snapshot.scores };
  for (const [playerId, points] of Object.entries(scoreRound(snapshot))) {
    scores[playerId] = (scores[playerId] ?? 0) + points;
  }

  // Rodada seca faz a proxima valer em dobro: musica dificil vira virada de
  // jogo em vez de rodada perdida.
  const seca = Object.values(snapshot.results).every((result) => !result.won);

  return {
    ...snapshot,
    phase: snapshot.round >= snapshot.totalRounds ? 'finished' : 'intermission',
    scores,
    pot: seca ? Math.min(MAX_POT, snapshot.pot * 2) : 1,
    startedAt: null,
    lastCallAt: null,
  };
}

/** Quantos ja acertaram nesta rodada — o contador que mete pressao. */
export const correctSoFar = (snapshot: RoomSnapshot): number =>
  Object.values(snapshot.results).filter((result) => result.won).length;

/**
 * Resultado que um jogador anuncia ao terminar a partida local dele.
 *
 * O `level` vem de fora na corrida, onde quem manda e o relogio da sala e nao
 * as tentativas de cada um. `points` e sempre o valor do degrau, sem o bonus de
 * posicao — esse so o anfitriao sabe calcular, ao fechar a rodada.
 */
export const resultOf = (state: GameState, ms: number, level?: number): RoundResult => {
  const at = level ?? Math.max(0, state.attempts.length - 1);
  const won = state.status === 'won';
  return { level: at, points: won ? pointsForLevel(at) : 0, won, ms };
};

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
