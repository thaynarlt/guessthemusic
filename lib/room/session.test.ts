import { describe, expect, it } from 'vitest';
import { parseSession, playerIdFor, SESSION_TTL_MS, type RoomSession } from '@/lib/room/session';

const AGORA = 1_000_000_000;

const session = (over: Partial<RoomSession> = {}): RoomSession => ({
  code: 'ABCD',
  name: 'Ana',
  playerId: 'p-1',
  savedAt: AGORA,
  ...over,
});

describe('sessao guardada', () => {
  it('aceita uma sessao recente e completa', () => {
    expect(parseSession(session(), AGORA)).toEqual(session());
  });

  it('aceita ate o limite e recusa depois', () => {
    const antiga = session({ savedAt: AGORA - SESSION_TTL_MS + 1 });
    expect(parseSession(antiga, AGORA)).not.toBeNull();

    const vencida = session({ savedAt: AGORA - SESSION_TTL_MS });
    expect(parseSession(vencida, AGORA)).toBeNull();
  });

  it('recusa codigo que nao existe mais no alfabeto', () => {
    expect(parseSession(session({ code: 'AB0D' }), AGORA)).toBeNull();
    expect(parseSession(session({ code: 'ABC' }), AGORA)).toBeNull();
  });

  it('recusa campos faltando ou vazios', () => {
    expect(parseSession(session({ name: '  ' }), AGORA)).toBeNull();
    expect(parseSession(session({ playerId: '' }), AGORA)).toBeNull();
    expect(parseSession({ code: 'ABCD' }, AGORA)).toBeNull();
  });

  it('recusa lixo sem quebrar', () => {
    for (const raw of [null, undefined, 'texto', 42, [], { savedAt: 'ontem' }]) {
      expect(parseSession(raw, AGORA)).toBeNull();
    }
  });
});

describe('id do jogador ao reentrar', () => {
  it('mantem o id quando volta para a mesma sala', () => {
    expect(playerIdFor('ABCD', session(), 'novo')).toBe('p-1');
  });

  it('gera id novo em outra sala, para nao herdar pontos alheios', () => {
    expect(playerIdFor('WXYZ', session(), 'novo')).toBe('novo');
  });

  it('gera id novo quando nao ha sessao', () => {
    expect(playerIdFor('ABCD', null, 'novo')).toBe('novo');
  });
});
