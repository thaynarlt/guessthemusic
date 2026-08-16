'use client';

import { create } from 'zustand';
import { getSong } from '@/lib/game/catalog';
import { createGame, skip as skipTurn, submitGuess } from '@/lib/game/machine';
import { ALL_GENRES } from '@/lib/game/genres';
import { freeRound } from '@/lib/puzzle/today';
import type { GameMode, GameState, Song } from '@/lib/game/types';
import { joinRoom, type ConnectionStatus, type RoomConnection } from '@/lib/room/client';
import {
  applyResult,
  closeRound,
  emptySnapshot,
  everyoneDone,
  hostId,
  MAX_ROOM_PLAYERS,
  resultOf,
  ROUND_TIMEOUT_MS,
  startRound,
  type RoomMessage,
  type RoomPlayer,
  type RoomSnapshot,
} from '@/lib/room/protocol';

/** Quantas musicas guardar para nao repetir dentro da mesma partida. */
const RECENT_MEMORY = 16;

export interface RoomStore {
  code: string | null;
  me: RoomPlayer | null;
  players: RoomPlayer[];
  snapshot: RoomSnapshot;
  status: ConnectionStatus;
  /** Partida local da rodada corrente — a maquina de sempre. */
  game: GameState | null;
  /** Quando a rodada comecou neste aparelho. Medir local evita relogio torto. */
  startedLocally: number | null;
  /** Soma dos tempos de resposta, criterio de desempate do placar. */
  spent: Record<string, number>;
  nonce: number;
  error: string | null;

  join: (code: string, name: string, mode: GameMode, totalRounds: number) => Promise<void>;
  leave: () => void;
  configure: (mode: GameMode, totalRounds: number) => void;
  startMatch: () => void;
  nextRound: () => void;
  guess: (song: Song) => void;
  skip: () => void;
}

/**
 * Fabrica em vez de singleton direto: o teste sobe dois clientes no mesmo
 * processo, ligados por um canal falso, e simula uma partida de verdade.
 */
export const createRoomStore = () =>
  create<RoomStore>((set, get) => {
    /** Conexao e cronometro nao sao dados de tela: ficam fora do estado. */
    let connection: RoomConnection | null = null;
    let deadline: ReturnType<typeof setTimeout> | null = null;
    let recent: string[] = [];

    /** Sorteia a proxima musica da sala, evitando as ultimas. */
    const draw = (mode: GameMode): Song => {
      const song = freeRound(mode, recent, ALL_GENRES);
      recent = [song.id, ...recent].slice(0, RECENT_MEMORY);
      return song;
    };

    const iAmHost = (): boolean => {
      const { players, me } = get();
      return me !== null && hostId(players) === me.id;
    };

    const clearDeadline = () => {
      if (deadline !== null) clearTimeout(deadline);
      deadline = null;
    };

    /** So o anfitriao mexe no snapshot; os outros so recebem. */
    const publish = (snapshot: RoomSnapshot) => {
      // Passa pelo mesmo `adopt` que os outros clientes usam: o anfitriao
      // tambem joga, e e ali que a partida local da rodada nasce.
      adopt(snapshot);
      connection?.send({ kind: 'state', snapshot });
    };

    /**
     * Fecha a rodada quando todo mundo respondeu ou quando o tempo estourou.
     * Sem o estouro, quem fechou a aba no meio travaria a sala inteira.
     */
    const closeIfReady = (snapshot: RoomSnapshot, force = false) => {
      if (!iAmHost() || snapshot.phase !== 'playing') return;
      if (!force && !everyoneDone(snapshot, get().players)) {
        publish(snapshot);
        return;
      }
      clearDeadline();
      publish(closeRound(snapshot));
    };

    const armDeadline = () => {
      clearDeadline();
      deadline = setTimeout(() => {
        if (iAmHost()) closeIfReady(get().snapshot, true);
      }, ROUND_TIMEOUT_MS);
    };

    /** Aplica um snapshot recebido e abre a partida local quando a rodada vira. */
    const adopt = (snapshot: RoomSnapshot) => {
      const previous = get().snapshot;
      const newRound = snapshot.phase === 'playing' && snapshot.round !== previous.round;

      set({
        snapshot,
        ...(newRound
          ? {
              game:
                snapshot.songId === null
                  ? null
                  : createGame(snapshot.mode, snapshot.round, snapshot.songId),
              startedLocally: Date.now(),
              nonce: 0,
            }
          : {}),
      });

      if (newRound && iAmHost()) armDeadline();
    };

    /** Anuncia o resultado da partida local assim que ela termina. */
    const announce = (game: GameState) => {
      const { me, startedLocally, snapshot } = get();
      if (!me || game.status === 'playing') return;

      const ms = startedLocally === null ? 0 : Date.now() - startedLocally;
      const result = resultOf(game, ms);

      set((state) => ({ spent: { ...state.spent, [me.id]: (state.spent[me.id] ?? 0) + ms } }));
      connection?.send({ kind: 'done', playerId: me.id, result });

      // O anfitriao aplica direto tambem: a propria mensagem volta pelo canal,
      // mas nao ha razao para esperar o eco para atualizar a tela.
      if (iAmHost()) closeIfReady(applyResult(snapshot, me.id, result));
    };

    const onMessage = (message: RoomMessage) => {
      if (message.kind === 'state') {
        adopt(message.snapshot);
        return;
      }

      // Resultado alheio: so o anfitriao contabiliza e republica.
      if (!iAmHost()) return;
      closeIfReady(applyResult(get().snapshot, message.playerId, message.result));
    };

    const onPlayers = (players: RoomPlayer[]) => {
      const { me, snapshot } = get();
      set({ players });
      if (!me) return;

      // Sala cheia: quem chegou depois do limite sai sozinho. O criterio e o
      // mesmo em todo cliente, entao ninguem discorda de quem sobra.
      const ordered = [...players].sort(
        (a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id),
      );
      if (ordered.findIndex((player) => player.id === me.id) >= MAX_ROOM_PLAYERS) {
        get().leave();
        set({ error: 'full' });
        return;
      }

      // Quem entrou no meio precisa do estado atual — inclusive no lobby, onde e
      // assim que o modo e o numero de rodadas do anfitriao chegam aos outros.
      // Serve tambem para quem assume a sala depois de o anfitriao cair.
      if (hostId(players) === me.id) {
        connection?.send({ kind: 'state', snapshot });
      }
    };

    return {
      code: null,
      me: null,
      players: [],
      snapshot: emptySnapshot('trecho', 5),
      status: 'closed',
      game: null,
      startedLocally: null,
      spent: {},
      nonce: 0,
      error: null,

      join: async (code, name, mode, totalRounds) => {
        get().leave();

        const me: RoomPlayer = {
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          name,
          joinedAt: Date.now(),
        };

        recent = [];
        set({
          code,
          me,
          players: [],
          snapshot: emptySnapshot(mode, totalRounds),
          game: null,
          startedLocally: null,
          spent: {},
          nonce: 0,
          error: null,
        });

        try {
          connection = await joinRoom(code, me, {
            onPlayers,
            onMessage,
            onStatus: (status) => set({ status }),
          });
        } catch {
          set({ error: 'connect', status: 'closed' });
        }
      },

      leave: () => {
        clearDeadline();
        connection?.leave();
        connection = null;
        set({ code: null, me: null, players: [], status: 'closed', game: null });
      },

      configure: (mode, totalRounds) => {
        const { snapshot } = get();
        if (!iAmHost() || snapshot.phase !== 'lobby') return;
        publish({ ...snapshot, mode, totalRounds });
      },

      // `adopt` ja arma o cronometro da rodada para quem e anfitriao.
      startMatch: () => {
        const { snapshot } = get();
        if (!iAmHost() || snapshot.phase !== 'lobby') return;
        publish(startRound(snapshot, draw(snapshot.mode).id, Date.now()));
      },

      nextRound: () => {
        const { snapshot } = get();
        if (!iAmHost() || snapshot.phase !== 'intermission') return;
        publish(startRound(snapshot, draw(snapshot.mode).id, Date.now()));
      },

      guess: (song) => {
        const { game } = get();
        if (!game || game.status !== 'playing') return;
        const answer = getSong(game.answerId);
        if (!answer) return;

        const next = submitGuess(game, song, answer);
        set((state) => ({ game: next, nonce: state.nonce + 1 }));
        announce(next);
      },

      skip: () => {
        const { game } = get();
        if (!game || game.status !== 'playing') return;

        const next = skipTurn(game);
        set((state) => ({ game: next, nonce: state.nonce + 1 }));
        announce(next);
      },
    };
  });

export const useRoomStore = createRoomStore();
