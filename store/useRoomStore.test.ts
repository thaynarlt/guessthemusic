import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// Só o tipo: o módulo em si é substituído pelo `vi.mock` logo abaixo.
import type { RoomHandlers } from '@/lib/room/client';
import type { RoomPlayer } from '@/lib/room/protocol';

/**
 * Barramento em memoria no lugar do canal do Supabase.
 *
 * A sala online e a parte que nao da para testar contra a infra de verdade num
 * teste unitario — mas a coreografia (quem e anfitriao, quando a rodada fecha,
 * como os pontos somam) e toda nossa, e e justamente onde os erros moram.
 */
interface Member {
  me: RoomPlayer;
  handlers: RoomHandlers;
}

const rooms = new Map<string, Member[]>();

/** Presenca chega depois do subscribe, igual ao cliente real. */
const later = (fn: () => void) => setTimeout(fn, 0);
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function sync(code: string) {
  const members = rooms.get(code) ?? [];
  const players = members.map((member) => member.me);
  for (const member of members) member.handlers.onPlayers(players);
}

vi.mock('@/lib/room/client', () => ({
  roomsEnabled: () => true,
  joinRoom: (code: string, me: RoomPlayer, handlers: RoomHandlers) => {
    const members = rooms.get(code) ?? [];
    members.push({ me, handlers });
    rooms.set(code, members);

    later(() => {
      handlers.onStatus('open');
      sync(code);
    });

    return Promise.resolve({
      send: (message: unknown) => {
        later(() => {
          for (const member of rooms.get(code) ?? []) {
            member.handlers.onMessage(message as never);
          }
        });
      },
      leave: () => {
        rooms.set(
          code,
          (rooms.get(code) ?? []).filter((member) => member.me.id !== me.id),
        );
        later(() => sync(code));
      },
    });
  },
}));

/**
 * Um localStorage por jogador.
 *
 * O ambiente do Vitest e node, sem window — e mesmo com jsdom haveria um
 * storage so, o que juntaria as sessoes de dois jogadores que na vida real
 * estao em navegadores diferentes. Cada "aba" ganha o seu Map e `asBrowser`
 * escolhe qual esta na frente.
 */
const storages = new Map<string, Map<string, string>>();
let currentStorage = new Map<string, string>();

(globalThis as { window?: unknown }).window = {
  localStorage: {
    getItem: (key: string) => currentStorage.get(key) ?? null,
    setItem: (key: string, value: string) => void currentStorage.set(key, value),
    removeItem: (key: string) => void currentStorage.delete(key),
  },
};

function asBrowser(owner: string): void {
  const existing = storages.get(owner) ?? new Map<string, string>();
  storages.set(owner, existing);
  currentStorage = existing;
}

const { createRoomStore } = await import('@/store/useRoomStore');
const { getSong, songs } = await import('@/lib/game/catalog');

type Store = ReturnType<typeof createRoomStore>;

const CODE = 'ABCD';

/** Entra na sala e espera a presenca circular. */
async function enter(name: string, rounds = 2): Promise<Store> {
  asBrowser(name);
  const store = createRoomStore();
  await store.getState().join(CODE, name, 'trecho', rounds);
  await tick();
  await tick();
  return store;
}

const answerOf = (store: Store) => getSong(store.getState().game?.answerId ?? '');
const wrongFor = (store: Store) =>
  songs.find((song) => song.id !== store.getState().game?.answerId);

/** Acerta a musica da rodada, no degrau atual. */
async function hit(store: Store) {
  const answer = answerOf(store);
  if (!answer) throw new Error('sem musica na rodada');
  store.getState().guess(answer);
  await tick();
  await tick();
}

/** Queima as 6 tentativas errando. */
async function bust(store: Store) {
  const wrong = wrongFor(store);
  if (!wrong) throw new Error('catalogo com uma musica so');
  for (let i = 0; i < 6; i += 1) store.getState().guess(wrong);
  await tick();
  await tick();
}

let stores: Store[] = [];

beforeEach(() => {
  rooms.clear();
  stores = [];
  storages.clear();
  currentStorage = new Map();
});

afterEach(() => {
  for (const store of stores) store.getState().leave();
  vi.clearAllTimers();
});

const track = (store: Store): Store => {
  stores.push(store);
  return store;
};

describe('entrar na sala', () => {
  it('junta os dois na mesma sala e elege quem chegou primeiro', async () => {
    const ana = track(await enter('Ana'));
    const bia = track(await enter('Bia'));
    await tick();

    expect(ana.getState().players).toHaveLength(2);
    expect(bia.getState().players).toHaveLength(2);
    expect(ana.getState().status).toBe('open');

    const first = ana.getState().me?.id;
    expect(ana.getState().players[0]?.id).toBe(first);
  });

  it('o anfitriao propaga modo e rodadas ainda no lobby', async () => {
    const ana = track(await enter('Ana', 3));
    ana.getState().configure('banda', 10, { genres: ['rock'], eras: ['2010'], artists: [] });
    await tick();

    const bia = track(await enter('Bia', 5));
    await tick();
    await tick();

    expect(bia.getState().snapshot.mode).toBe('banda');
    expect(bia.getState().snapshot.totalRounds).toBe(10);
    expect(bia.getState().snapshot.filter).toEqual({
      genres: ['rock'],
      eras: ['2010'],
      artists: [],
    });
  });
});

describe('mural', () => {
  it('anuncia quem entra depois de voce, mas nao a sala que ja estava la', async () => {
    const ana = track(await enter('Ana'));
    await tick();
    // Ana entrou numa sala vazia: nada a anunciar.
    expect(ana.getState().feed).toHaveLength(0);

    track(await enter('Bia'));
    await tick();

    expect(ana.getState().feed).toEqual([
      expect.objectContaining({ kind: 'joined', name: 'Bia' }),
    ]);
  });

  it('nao anuncia a propria entrada', async () => {
    track(await enter('Ana'));
    const bia = track(await enter('Bia'));
    await tick();

    expect(bia.getState().feed.some((event) => event.name === 'Bia')).toBe(false);
  });

  it('anuncia quem sai', async () => {
    const ana = track(await enter('Ana'));
    const bia = track(await enter('Bia'));
    await tick();

    bia.getState().leave();
    await tick();
    await tick();

    expect(ana.getState().feed).toContainEqual(
      expect.objectContaining({ kind: 'left', name: 'Bia' }),
    );
  });

  it('entrega o chat para todo mundo, inclusive para quem falou', async () => {
    const ana = track(await enter('Ana'));
    const bia = track(await enter('Bia'));
    await tick();

    ana.getState().say('  oi   gente  ');
    await tick();
    await tick();

    for (const store of [ana, bia]) {
      expect(store.getState().feed).toContainEqual(
        expect.objectContaining({ kind: 'chat', name: 'Ana', text: 'oi gente' }),
      );
    }
  });

  it('nao manda mensagem vazia', async () => {
    const ana = track(await enter('Ana'));
    const bia = track(await enter('Bia'));
    await tick();
    const antes = bia.getState().feed.length;

    ana.getState().say('   ');
    await tick();
    await tick();

    expect(bia.getState().feed).toHaveLength(antes);
  });
});

describe('rodada', () => {
  it('todo mundo recebe a mesma musica ao comecar', async () => {
    const ana = track(await enter('Ana'));
    const bia = track(await enter('Bia'));
    await tick();

    ana.getState().startMatch();
    await tick();
    await tick();

    expect(ana.getState().snapshot.phase).toBe('playing');
    expect(bia.getState().snapshot.phase).toBe('playing');
    expect(bia.getState().snapshot.songId).toBe(ana.getState().snapshot.songId);
    expect(bia.getState().game?.answerId).toBe(ana.getState().snapshot.songId);
    expect(bia.getState().snapshot.round).toBe(1);
  });

  it('so quem e anfitriao comeca a partida', async () => {
    const ana = track(await enter('Ana'));
    const bia = track(await enter('Bia'));
    await tick();

    bia.getState().startMatch();
    await tick();

    expect(ana.getState().snapshot.phase).toBe('lobby');
  });

  it('a rodada nao fecha enquanto falta alguem', async () => {
    const ana = track(await enter('Ana'));
    const bia = track(await enter('Bia'));
    await tick();
    ana.getState().startMatch();
    await tick();
    await tick();

    await hit(ana);

    expect(ana.getState().snapshot.phase).toBe('playing');
    expect(bia.getState().snapshot.results[ana.getState().me?.id ?? '']).toBeDefined();
    expect(bia.getState().game?.status).toBe('playing');
  });

  it('fecha e soma os pontos quando os dois respondem', async () => {
    const ana = track(await enter('Ana'));
    const bia = track(await enter('Bia'));
    await tick();
    ana.getState().startMatch();
    await tick();
    await tick();

    const anaId = ana.getState().me?.id ?? '';
    const biaId = bia.getState().me?.id ?? '';

    await hit(ana);
    await bust(bia);

    for (const store of [ana, bia]) {
      expect(store.getState().snapshot.phase).toBe('intermission');
      expect(store.getState().snapshot.scores[anaId]).toBe(6);
      expect(store.getState().snapshot.scores[biaId]).toBe(0);
    }
  });

  it('acumula entre rodadas e encerra na ultima', async () => {
    const ana = track(await enter('Ana', 2));
    const bia = track(await enter('Bia', 2));
    await tick();
    ana.getState().startMatch();
    await tick();
    await tick();

    const anaId = ana.getState().me?.id ?? '';

    await hit(ana);
    await bust(bia);
    expect(ana.getState().snapshot.phase).toBe('intermission');

    ana.getState().nextRound();
    await tick();
    await tick();
    expect(bia.getState().snapshot.round).toBe(2);

    await hit(ana);
    await bust(bia);

    expect(ana.getState().snapshot.phase).toBe('finished');
    expect(bia.getState().snapshot.phase).toBe('finished');
    expect(ana.getState().snapshot.scores[anaId]).toBe(12);
  });

  it('pular derruba o valor do acerto, igual ao jogo de sempre', async () => {
    const ana = track(await enter('Ana'));
    const bia = track(await enter('Bia'));
    await tick();
    ana.getState().startMatch();
    await tick();
    await tick();

    const biaId = bia.getState().me?.id ?? '';

    bia.getState().skip();
    bia.getState().skip();
    await hit(bia);
    await bust(ana);

    expect(bia.getState().snapshot.scores[biaId]).toBe(4);
  });
});

describe('recarregar a pagina', () => {
  it('volta com o mesmo id e reencontra os proprios pontos', async () => {
    const ana = track(await enter('Ana'));
    const bia = track(await enter('Bia'));
    await tick();
    ana.getState().startMatch();
    await tick();
    await tick();

    const anaId = ana.getState().me?.id ?? '';
    await hit(ana);
    await bust(bia);
    expect(bia.getState().snapshot.scores[anaId]).toBe(6);

    // F5: a aba morre sem "sair da sala", entao a sessao sobrevive.
    asBrowser('Ana');
    ana.getState().leave();
    await tick();
    await tick();

    const deVolta = track(await enter('Ana'));
    await tick();
    await tick();

    expect(deVolta.getState().me?.id).toBe(anaId);
    expect(deVolta.getState().snapshot.scores[anaId]).toBe(6);
  });

  it('sair de proposito apaga o caminho de volta', async () => {
    const ana = track(await enter('Ana'));
    const idAntigo = ana.getState().me?.id;

    asBrowser('Ana');
    ana.getState().leave(true);
    await tick();

    const outra = track(await enter('Ana'));
    expect(outra.getState().me?.id).not.toBe(idAntigo);
  });

  it('entrar em outra sala nao herda os pontos da anterior', async () => {
    const ana = track(await enter('Ana'));
    const idNaPrimeira = ana.getState().me?.id;

    asBrowser('Ana');
    ana.getState().leave();
    await tick();

    const store = createRoomStore();
    track(store);
    await store.getState().join('WXYZ', 'Ana', 'trecho', 2);
    await tick();

    expect(store.getState().me?.id).not.toBe(idNaPrimeira);
  });
});

describe('quedas', () => {
  it('quem sobra vira anfitriao e toca a partida', async () => {
    const ana = track(await enter('Ana'));
    const bia = track(await enter('Bia'));
    const cris = track(await enter('Cris'));
    await tick();

    ana.getState().leave();
    await tick();
    await tick();

    expect(bia.getState().players).toHaveLength(2);

    bia.getState().startMatch();
    await tick();
    await tick();

    expect(cris.getState().snapshot.phase).toBe('playing');
    expect(cris.getState().snapshot.round).toBe(1);
  });
});
