'use client';

import type { RoomMessage, RoomPlayer } from '@/lib/room/protocol';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * A sala online precisa de estado compartilhado entre navegadores, e isso o
 * localStorage nao da. Usamos os canais de Realtime do Supabase — Broadcast
 * para as mensagens e Presence para a lista de quem esta na sala.
 *
 * Nao existe tabela nenhuma por tras: a sala vive uns minutos e morre com a
 * ultima aba fechada. Por isso tambem nao ha nada para limpar depois, e a chave
 * publicada aqui e a `anon`, que e publica por design.
 */
export const roomsEnabled = (): boolean => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

export interface RoomHandlers {
  onPlayers: (players: RoomPlayer[]) => void;
  onMessage: (message: RoomMessage) => void;
  onStatus: (status: ConnectionStatus) => void;
}

export interface RoomConnection {
  send: (message: RoomMessage) => void;
  leave: () => void;
}

const EVENT = 'gtm';

/** Le a presenca do canal e devolve a lista de jogadores, sem duplicatas. */
function readPlayers(state: Record<string, unknown[]>): RoomPlayer[] {
  const players: RoomPlayer[] = [];

  for (const entries of Object.values(state)) {
    const first = entries[0] as Partial<RoomPlayer> | undefined;
    if (!first?.id || typeof first.name !== 'string') continue;
    players.push({ id: first.id, name: first.name, joinedAt: first.joinedAt ?? 0 });
  }

  return players;
}

/**
 * Entra na sala e devolve o canal aberto.
 *
 * O import do cliente e dinamico de proposito: quem so joga o diario ou o duelo
 * nunca baixa o Realtime.
 */
export async function joinRoom(
  code: string,
  me: RoomPlayer,
  handlers: RoomHandlers,
): Promise<RoomConnection> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('sala online desligada');

  const { RealtimeClient } = await import('@supabase/realtime-js');
  const client = new RealtimeClient(`${SUPABASE_URL}/realtime/v1`, {
    params: { apikey: SUPABASE_ANON_KEY },
  });

  const channel = client.channel(`gtm:sala:${code}`, {
    // `self: true` deixa o anfitriao tratar as proprias mensagens pelo mesmo
    // caminho das dos outros — um fluxo so, sem ramo especial.
    config: { presence: { key: me.id }, broadcast: { self: true } },
  });

  channel.on('presence', { event: 'sync' }, () => {
    handlers.onPlayers(readPlayers(channel.presenceState()));
  });

  channel.on('broadcast', { event: EVENT }, ({ payload }) => {
    handlers.onMessage(payload as RoomMessage);
  });

  handlers.onStatus('connecting');

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      handlers.onStatus('open');
      void channel.track(me);
      return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      handlers.onStatus(status === 'CLOSED' ? 'closed' : 'connecting');
    }
  });

  return {
    send: (message) => {
      void channel.send({ type: 'broadcast', event: EVENT, payload: message });
    },
    leave: () => {
      void channel.unsubscribe();
      void client.disconnect();
      handlers.onStatus('closed');
    },
  };
}
