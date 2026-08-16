import { isValidRoomCode } from '@/lib/room/code';

/**
 * Ultima sala em que a pessoa entrou.
 *
 * Guardar isso resolve dois problemas de uma vez. O placar do anfitriao indexa
 * os pontos pelo id do jogador; recarregar a pagina gerava um id novo, entao a
 * pessoa voltava zerada e aparecia duas vezes na sala. Reentrando com o MESMO
 * id, ela reencontra os proprios pontos. E, de quebra, da para oferecer o
 * caminho de volta para quem fechou a aba sem querer.
 */
export interface RoomSession {
  code: string;
  name: string;
  /** Id estavel do jogador — a chave dos pontos no placar. */
  playerId: string;
  /** Epoch em ms do ultimo acesso. */
  savedAt: number;
}

const KEY = 'gtm:v1:sala';

/**
 * Depois disso a partida certamente acabou e a sala se desfez, entao oferecer
 * "voltar" so levaria a um lobby vazio.
 */
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

const isFresh = (session: RoomSession, now: number): boolean =>
  now - session.savedAt < SESSION_TTL_MS;

/** Valida o que veio do storage: dado velho ou adulterado nao pode derrubar a tela. */
export function parseSession(raw: unknown, now: number): RoomSession | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Partial<RoomSession>;

  if (typeof value.code !== 'string' || !isValidRoomCode(value.code)) return null;
  if (typeof value.name !== 'string' || value.name.trim() === '') return null;
  if (typeof value.playerId !== 'string' || value.playerId === '') return null;
  if (typeof value.savedAt !== 'number' || !Number.isFinite(value.savedAt)) return null;

  const session: RoomSession = {
    code: value.code,
    name: value.name,
    playerId: value.playerId,
    savedAt: value.savedAt,
  };
  return isFresh(session, now) ? session : null;
}

export function loadSession(now: number = Date.now()): RoomSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw === null ? null : parseSession(JSON.parse(raw) as unknown, now);
  } catch {
    return null;
  }
}

export function saveSession(session: Omit<RoomSession, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const value: RoomSession = { ...session, savedAt: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage cheio ou bloqueado: a sala funciona, so nao lembra o caminho */
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nada a fazer */
  }
}

/**
 * Id do jogador a usar nesta sala: o mesmo de antes quando e a mesma sala,
 * um novo quando e outra. Sem isso, voltar para a sala herdaria os pontos de
 * uma partida que nao tem nada a ver.
 */
export function playerIdFor(code: string, previous: RoomSession | null, fresh: string): string {
  return previous?.code === code ? previous.playerId : fresh;
}
