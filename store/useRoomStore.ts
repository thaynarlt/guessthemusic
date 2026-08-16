'use client';

import { create } from 'zustand';
import { playSfx } from '@/lib/audio/sfx';
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
  MAX_FEED,
  MAX_ROOM_PLAYERS,
  presenceDiff,
  resultOf,
  ROUND_TIMEOUT_MS,
  sanitizeChat,
  startRound,
  type RoomEvent,
  type RoomMessage,
  type RoomPlayer,
  type RoomSnapshot,
} from '@/lib/room/protocol';
import { clearSession, loadSession, playerIdFor, saveSession } from '@/lib/room/session';

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
  /** Mural: entradas, saidas e chat, do mais antigo para o mais novo. */
  feed: RoomEvent[];
  nonce: number;
  error: string | null;

  join: (code: string, name: string, mode: GameMode, totalRounds: number) => Promise<void>;
  /** `forget` apaga a sessao guardada — so quando a pessoa sai de proposito. */
  leave: (forget?: boolean) => void;
  configure: (mode: GameMode, totalRounds: number, genre: string) => void;
  startMatch: () => void;
  nextRound: () => void;
  guess: (song: Song) => void;
  skip: () => void;
  say: (text: string) => void;
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

    /** Sorteia a proxima musica da sala, no genero escolhido e sem repetir. */
    const draw = (snapshot: RoomSnapshot): Song => {
      const song = freeRound(snapshot.mode, recent, snapshot.genre);
      recent = [song.id, ...recent].slice(0, RECENT_MEMORY);
      return song;
    };

    /** Acrescenta ao mural, mantendo so as ultimas linhas. */
    const push = (...events: RoomEvent[]) => {
      if (events.length === 0) return;
      set((state) => ({ feed: [...state.feed, ...events].slice(-MAX_FEED) }));
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

      // A rodada fechando e a partida acabando sao os dois momentos em que todo
      // mundo olha para a tela ao mesmo tempo.
      if (previous.phase === 'playing' && snapshot.phase === 'intermission') playSfx('reveal');
      if (previous.phase !== 'finished' && snapshot.phase === 'finished') playSfx('victory');

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

      if (message.kind === 'chat') {
        // So avisa do que veio de fora: o proprio eco nao precisa de blip.
        if (message.playerId !== get().me?.id) playSfx('chat');
        push({
          kind: 'chat',
          id: message.playerId,
          name: message.name,
          text: message.text,
          at: Date.now(),
        });
        return;
      }

      // Resultado alheio: so o anfitriao contabiliza e republica.
      if (!iAmHost()) return;
      closeIfReady(applyResult(get().snapshot, message.playerId, message.result));
    };

    const onPlayers = (players: RoomPlayer[]) => {
      const { me, snapshot, players: before } = get();
      set({ players });
      if (!me) return;

      // A primeira sincronizacao traz a sala inteira de uma vez; anunciar todo
      // mundo ali seria ruido. Os avisos comecam da segunda em diante.
      if (before.length > 0) {
        const { joined, left } = presenceDiff(before, players);
        const at = Date.now();
        if (joined.some((player) => player.id !== me.id)) playSfx('join');
        push(
          ...joined
            .filter((player) => player.id !== me.id)
            .map((player) => ({ kind: 'joined' as const, id: player.id, name: player.name, at })),
          ...left.map((player) => ({
            kind: 'left' as const,
            id: player.id,
            name: player.name,
            at,
          })),
        );
      }

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
      feed: [],
      nonce: 0,
      error: null,

      join: async (code, name, mode, totalRounds) => {
        // Antes do leave, para nao perder a sessao que vamos reaproveitar.
        const previous = loadSession();
        get().leave();

        const fresh = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const me: RoomPlayer = {
          // Voltar para a MESMA sala reusa o id: e assim que a pessoa
          // reencontra os proprios pontos depois de recarregar a pagina.
          id: playerIdFor(code, previous, fresh),
          name,
          joinedAt: Date.now(),
        };
        saveSession({ code, name, playerId: me.id });

        recent = [];
        set({
          code,
          me,
          players: [],
          snapshot: emptySnapshot(mode, totalRounds),
          game: null,
          startedLocally: null,
          spent: {},
          feed: [],
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

      /**
       * `forget` separa sair de proposito de simplesmente sair da tela.
       *
       * Recarregar a pagina tambem desmonta o componente, e ali a sessao PRECISA
       * sobreviver — e o unico jeito de a pessoa voltar com os pontos dela. So o
       * botao de sair apaga o caminho de volta.
       */
      leave: (forget = false) => {
        clearDeadline();
        connection?.leave();
        connection = null;
        if (forget) clearSession();
        set({ code: null, me: null, players: [], status: 'closed', game: null });
      },

      configure: (mode, totalRounds, genre) => {
        const { snapshot } = get();
        if (!iAmHost() || snapshot.phase !== 'lobby') return;
        publish({ ...snapshot, mode, totalRounds, genre });
      },

      // `adopt` ja arma o cronometro da rodada para quem e anfitriao.
      startMatch: () => {
        const { snapshot } = get();
        if (!iAmHost() || snapshot.phase !== 'lobby') return;
        publish(startRound(snapshot, draw(snapshot).id, Date.now()));
      },

      nextRound: () => {
        const { snapshot } = get();
        if (!iAmHost() || snapshot.phase !== 'intermission') return;
        publish(startRound(snapshot, draw(snapshot).id, Date.now()));
      },

      guess: (song) => {
        const { game } = get();
        if (!game || game.status !== 'playing') return;
        const answer = getSong(game.answerId);
        if (!answer) return;

        const next = submitGuess(game, song, answer);
        set((state) => ({ game: next, nonce: state.nonce + 1 }));
        // Sem 'victory' aqui: acertar a rodada nao e ganhar a partida, e a
        // fanfarra sai quando o placar final aparece.
        playSfx(next.status === 'won' ? 'correct' : 'wrong');
        announce(next);
      },

      skip: () => {
        const { game } = get();
        if (!game || game.status !== 'playing') return;

        const next = skipTurn(game);
        set((state) => ({ game: next, nonce: state.nonce + 1 }));
        playSfx('skip');
        announce(next);
      },

      say: (text) => {
        const { me } = get();
        const clean = sanitizeChat(text);
        // `self: true` no canal: a propria mensagem volta e entra no mural pelo
        // mesmo caminho das outras, sem ramo especial nem risco de duplicar.
        if (me && clean)
          connection?.send({ kind: 'chat', playerId: me.id, name: me.name, text: clean });
      },
    };
  });

export const useRoomStore = createRoomStore();
