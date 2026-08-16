import { describe, expect, it } from 'vitest';
import {
  isValidRoomCode,
  normalizeRoomCode,
  randomRoomCode,
  ROOM_CODE_LENGTH,
} from '@/lib/room/code';
import {
  applyResult,
  closeRound,
  correctSoFar,
  emptySnapshot,
  everyoneDone,
  hostId,
  LAST_CALL_MS,
  MAX_POT,
  PLACE_BONUS,
  RACE_STEP_MS,
  RACE_TIMEOUT_MS,
  raceLevel,
  roundDeadline,
  scoreRound,
  MAX_CHAT_LENGTH,
  presenceDiff,
  resultOf,
  roomRanking,
  roundExpired,
  ROUND_TIMEOUT_MS,
  sanitizeChat,
  startRound,
  type RoomPlayer,
  type RoomSnapshot,
} from '@/lib/room/protocol';
import { createGame, skip, submitGuess } from '@/lib/game/machine';
import { MAX_ATTEMPTS, SNIPPET_STEPS, type Song } from '@/lib/game/types';

const answer: Song = {
  id: 'a',
  title: 'Tarde de Vinil',
  artist: 'Sofia Marés',
  year: 2022,
  source: 'synth',
};
const other: Song = { ...answer, id: 'c', title: 'Paper Airplane', artist: 'The Loop Cats' };

const players: RoomPlayer[] = [
  { id: 'ana', name: 'Ana', joinedAt: 1000 },
  { id: 'bia', name: 'Bia', joinedAt: 2000 },
];

const hit = (level: number, ms = 500) => ({ level, points: 6 - level, won: true, ms });
const miss = (ms = 900) => ({ level: MAX_ATTEMPTS - 1, points: 0, won: false, ms });

describe('codigo da sala', () => {
  it('tem 4 letras validas', () => {
    const code = randomRoomCode(() => 0.5);
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
    expect(isValidRoomCode(code)).toBe(true);
  });

  it('nao usa letras que se confundem com numero', () => {
    for (const value of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(randomRoomCode(() => value)).not.toMatch(/[IO01]/);
    }
  });

  it('aguenta o random devolver 1 sem estourar o alfabeto', () => {
    expect(isValidRoomCode(randomRoomCode(() => 1))).toBe(true);
  });

  it('limpa o que a pessoa colou', () => {
    expect(normalizeRoomCode(' a-b c-d ')).toBe('ABCD');
    expect(normalizeRoomCode('sala ABCD')).toBe('SALA');
    expect(normalizeRoomCode('ABCDEF')).toBe('ABCD');
  });

  it('reprova codigo curto ou com letra proibida', () => {
    expect(isValidRoomCode('ABC')).toBe(false);
    expect(isValidRoomCode('ABC0')).toBe(false);
    expect(isValidRoomCode('abcd')).toBe(false);
  });
});

describe('anfitriao', () => {
  it('e quem chegou primeiro', () => {
    expect(hostId(players)).toBe('ana');
    expect(hostId([...players].reverse())).toBe('ana');
  });

  it('desempata pelo id, para todo mundo concordar', () => {
    const empatados: RoomPlayer[] = [
      { id: 'zeta', name: 'Z', joinedAt: 500 },
      { id: 'alfa', name: 'A', joinedAt: 500 },
    ];
    expect(hostId(empatados)).toBe('alfa');
    expect(hostId([...empatados].reverse())).toBe('alfa');
  });

  it('passa o bastao quando o anfitriao sai', () => {
    expect(hostId(players.filter((player) => player.id !== 'ana'))).toBe('bia');
  });

  it('sala vazia nao tem anfitriao', () => {
    expect(hostId([])).toBeNull();
  });
});

describe('ciclo da rodada', () => {
  const lobby = emptySnapshot('trecho', 3);

  it('comeca no lobby, sem musica', () => {
    expect(lobby.phase).toBe('lobby');
    expect(lobby.round).toBe(0);
    expect(lobby.songId).toBeNull();
  });

  it('a rodada 1 entra em jogo com a musica sorteada', () => {
    const playing = startRound(lobby, 'song-7', 10_000);
    expect(playing.phase).toBe('playing');
    expect(playing.round).toBe(1);
    expect(playing.songId).toBe('song-7');
    expect(playing.startedAt).toBe(10_000);
  });

  it('registra o resultado e ignora reenvio', () => {
    const playing = startRound(lobby, 'song-7', 0);
    const once = applyResult(playing, 'ana', hit(0), 0);
    const twice = applyResult(once, 'ana', hit(5), 0);
    expect(twice.results.ana).toEqual({ ...hit(0), at: 0 });
  });

  it('nao aceita resultado fora da rodada', () => {
    expect(applyResult(lobby, 'ana', hit(0), 0)).toBe(lobby);
  });

  it('so fecha quando todo mundo respondeu', () => {
    let snapshot = startRound(lobby, 'song-7', 0);
    expect(everyoneDone(snapshot, players)).toBe(false);
    snapshot = applyResult(snapshot, 'ana', hit(0), 0);
    expect(everyoneDone(snapshot, players)).toBe(false);
    snapshot = applyResult(snapshot, 'bia', miss(), 0);
    expect(everyoneDone(snapshot, players)).toBe(true);
  });

  it('sala vazia nao conta como todo mundo pronto', () => {
    expect(everyoneDone(startRound(lobby, 'song-7', 0), [])).toBe(false);
  });

  it('estoura o tempo e destrava a rodada', () => {
    const playing = startRound(lobby, 'song-7', 0);
    expect(roundExpired(playing, ROUND_TIMEOUT_MS - 1)).toBe(false);
    expect(roundExpired(playing, ROUND_TIMEOUT_MS)).toBe(true);
    expect(roundExpired(lobby, ROUND_TIMEOUT_MS)).toBe(false);
  });

  it('fechar soma os pontos da rodada no placar', () => {
    let snapshot = startRound(lobby, 'song-7', 0);
    snapshot = applyResult(snapshot, 'ana', hit(0), 0);
    snapshot = applyResult(snapshot, 'bia', hit(2), 0);
    snapshot = closeRound(snapshot);

    expect(snapshot.phase).toBe('intermission');
    expect(snapshot.scores).toEqual({ ana: 6, bia: 4 });
    expect(snapshot.startedAt).toBeNull();
  });

  it('quem nao respondeu nao pontua', () => {
    let snapshot = closeRound(applyResult(startRound(lobby, 'song-7', 0), 'ana', hit(0), 0));
    expect(snapshot.scores).toEqual({ ana: 6 });
    expect(snapshot.scores.bia).toBeUndefined();
  });

  it('acumula entre rodadas e encerra na ultima', () => {
    let snapshot: RoomSnapshot = emptySnapshot('trecho', 2);
    snapshot = closeRound(applyResult(startRound(snapshot, 's1', 0), 'ana', hit(0), 0));
    expect(snapshot.phase).toBe('intermission');

    snapshot = closeRound(applyResult(startRound(snapshot, 's2', 0), 'ana', hit(1), 0));
    expect(snapshot.phase).toBe('finished');
    expect(snapshot.scores.ana).toBe(11);
  });

  it('fechar duas vezes nao pontua em dobro', () => {
    const closed = closeRound(applyResult(startRound(lobby, 's1', 0), 'ana', hit(0), 0));
    expect(closeRound(closed)).toBe(closed);
  });
});

describe('resultado a partir da partida local', () => {
  const newGame = () => createGame('trecho', 1, answer.id);

  it('acerto de primeira vale 6, no nivel 0', () => {
    expect(resultOf(submitGuess(newGame(), answer, answer), 800)).toEqual({
      level: 0,
      points: 6,
      won: true,
      ms: 800,
    });
  });

  it('acerto depois de dois pulos vale 4', () => {
    const state = submitGuess(skip(skip(newGame())), answer, answer);
    expect(resultOf(state, 100)).toMatchObject({ level: 2, points: 4, won: true });
  });

  it('derrota nao pontua', () => {
    let state = newGame();
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) state = submitGuess(state, other, answer);
    expect(resultOf(state, 100)).toMatchObject({ points: 0, won: false });
  });
});

describe('corrida', () => {
  const corrida = (over: Partial<RoomSnapshot> = {}): RoomSnapshot => ({
    ...emptySnapshot('trecho', 3, undefined, 'corrida'),
    ...over,
  });

  const jogando = (over: Partial<RoomSnapshot> = {}) =>
    corrida({ ...startRound(corrida(), 's1', 0), ...over });

  describe('degrau pelo relogio', () => {
    it('comeca no primeiro e sobe a cada passo', () => {
      expect(raceLevel(0)).toBe(0);
      expect(raceLevel(RACE_STEP_MS - 1)).toBe(0);
      expect(raceLevel(RACE_STEP_MS)).toBe(1);
      expect(raceLevel(RACE_STEP_MS * 3)).toBe(3);
    });

    it('para no ultimo degrau em vez de estourar', () => {
      expect(raceLevel(RACE_STEP_MS * 99)).toBe(SNIPPET_STEPS.length - 1);
    });

    it('tempo negativo nao vira degrau negativo', () => {
      expect(raceLevel(-5000)).toBe(0);
    });
  });

  describe('ultima chamada', () => {
    it('so dispara no primeiro acerto', () => {
      const antes = jogando();
      expect(antes.lastCallAt).toBeNull();

      const errou = applyResult(antes, 'ana', miss(), 1000);
      expect(errou.lastCallAt).toBeNull();

      const acertou = applyResult(errou, 'bia', hit(1), 2000);
      expect(acertou.lastCallAt).toBe(2000);
    });

    it('o segundo acerto nao adia o prazo', () => {
      let snapshot = applyResult(jogando(), 'ana', hit(0), 2000);
      snapshot = applyResult(snapshot, 'bia', hit(2), 9000);
      expect(snapshot.lastCallAt).toBe(2000);
    });

    it('encurta o prazo da rodada', () => {
      const sem = jogando();
      expect(roundDeadline(sem)).toBe(RACE_TIMEOUT_MS);

      const com = applyResult(sem, 'ana', hit(0), 1000);
      expect(roundDeadline(com)).toBe(1000 + LAST_CALL_MS);
    });

    it('nao estica o prazo alem do relogio cheio', () => {
      const tarde = applyResult(jogando(), 'ana', hit(5), RACE_TIMEOUT_MS - 1000);
      expect(roundDeadline(tarde)).toBe(RACE_TIMEOUT_MS);
    });

    it('no ritmo nao existe ultima chamada', () => {
      const ritmo = startRound(emptySnapshot('trecho', 3), 's1', 0);
      expect(applyResult(ritmo, 'ana', hit(0), 500).lastCallAt).toBeNull();
      expect(roundDeadline(ritmo)).toBe(ROUND_TIMEOUT_MS);
    });
  });

  describe('pontos por chegada', () => {
    it('quem chega antes leva o bonus maior', () => {
      let snapshot = jogando();
      snapshot = applyResult(snapshot, 'ana', hit(2, 9000), 9000);
      snapshot = applyResult(snapshot, 'bia', hit(2, 3000), 3000);
      snapshot = applyResult(snapshot, 'cris', hit(2, 6000), 6000);

      // Mesmo degrau para os tres: o que separa e a ordem de chegada.
      expect(scoreRound(snapshot)).toEqual({
        bia: 4 + PLACE_BONUS[0],
        cris: 4 + PLACE_BONUS[1],
        ana: 4 + PLACE_BONUS[2],
      });
    });

    it('o quarto em diante leva so o degrau', () => {
      let snapshot = jogando();
      for (const [i, id] of ['a', 'b', 'c', 'd'].entries()) {
        snapshot = applyResult(snapshot, id, hit(1, (i + 1) * 1000), (i + 1) * 1000);
      }
      expect(scoreRound(snapshot).d).toBe(5);
    });

    it('quem chegou antes no anfitriao ganha, mesmo dizendo ter demorado mais', () => {
      // Cronometro de cada aparelho comeca quando ELE recebe a rodada. Quem
      // recebeu com atraso mede um tempo menor para a mesma resposta — ordenar
      // por `ms` daria a vitoria a quem tem a pior internet.
      let snapshot = jogando();
      snapshot = applyResult(snapshot, 'rapida', hit(1, 9000), 1000);
      snapshot = applyResult(snapshot, 'lenta', hit(1, 200), 5000);

      const pontos = scoreRound(snapshot);
      expect(pontos.rapida).toBeGreaterThan(pontos.lenta as number);
    });

    it('quem errou nao pontua', () => {
      let snapshot = applyResult(jogando(), 'ana', hit(0, 500), 500);
      snapshot = applyResult(snapshot, 'bia', miss(), 900);
      expect(scoreRound(snapshot).bia).toBe(0);
    });

    it('degrau mais alto vale menos, mesmo chegando em primeiro', () => {
      const cedo = applyResult(jogando(), 'ana', hit(0, 500), 500);
      const tarde = applyResult(jogando(), 'ana', hit(4, 500), 500);
      expect(scoreRound(cedo).ana).toBeGreaterThan(scoreRound(tarde).ana as number);
    });

    it('no ritmo a ordem nao muda nada', () => {
      let ritmo = startRound(emptySnapshot('trecho', 3), 's1', 0);
      ritmo = applyResult(ritmo, 'ana', hit(2, 9000), 0);
      ritmo = applyResult(ritmo, 'bia', hit(2, 1000), 0);
      expect(scoreRound(ritmo)).toEqual({ ana: 4, bia: 4 });
    });
  });

  describe('pote acumulado', () => {
    it('rodada seca dobra a proxima', () => {
      const seca = closeRound(applyResult(jogando(), 'ana', miss(), 0));
      expect(seca.pot).toBe(2);
    });

    it('acerto zera o pote de volta', () => {
      const seca = closeRound(applyResult(jogando(), 'ana', miss(), 0));
      const comAcerto = closeRound(
        applyResult({ ...startRound(seca, 's2', 0) }, 'ana', hit(0, 500), 500),
      );
      expect(comAcerto.pot).toBe(1);
    });

    it('o pote multiplica o que a rodada paga', () => {
      const dobrada = jogando({ pot: 2 });
      const fechada = closeRound(applyResult(dobrada, 'ana', hit(0, 500), 500));
      expect(fechada.scores.ana).toBe((6 + PLACE_BONUS[0]) * 2);
    });

    it('nao passa do teto', () => {
      let snapshot = jogando({ pot: MAX_POT });
      snapshot = closeRound(applyResult(snapshot, 'ana', miss(), 0));
      expect(snapshot.pot).toBe(MAX_POT);
    });
  });

  it('conta quantos ja acertaram', () => {
    let snapshot = jogando();
    expect(correctSoFar(snapshot)).toBe(0);
    snapshot = applyResult(snapshot, 'ana', hit(0, 500), 500);
    expect(correctSoFar(snapshot)).toBe(1);
    snapshot = applyResult(snapshot, 'bia', miss(), 900);
    expect(correctSoFar(snapshot)).toBe(1);
  });
});

describe('mural da sala', () => {
  const ana = players[0] as RoomPlayer;
  const bia = players[1] as RoomPlayer;

  it('detecta quem entrou', () => {
    expect(presenceDiff([ana], [ana, bia])).toEqual({ joined: [bia], left: [] });
  });

  it('detecta quem saiu', () => {
    expect(presenceDiff([ana, bia], [ana])).toEqual({ joined: [], left: [bia] });
  });

  it('troca completa conta os dois lados', () => {
    expect(presenceDiff([ana], [bia])).toEqual({ joined: [bia], left: [ana] });
  });

  it('lista igual nao gera aviso', () => {
    expect(presenceDiff([ana, bia], [bia, ana])).toEqual({ joined: [], left: [] });
  });

  it('sala vazia para cheia anuncia todo mundo', () => {
    expect(presenceDiff([], players).joined).toHaveLength(2);
  });
});

describe('mensagem do chat', () => {
  it('colapsa espacos e apara as pontas', () => {
    expect(sanitizeChat('  oi   gente  ')).toBe('oi gente');
  });

  it('recusa mensagem so de espaco', () => {
    expect(sanitizeChat('   ')).toBeNull();
    expect(sanitizeChat('\n\t')).toBeNull();
    expect(sanitizeChat('')).toBeNull();
  });

  it('corta no limite', () => {
    const longa = 'a'.repeat(MAX_CHAT_LENGTH + 50);
    expect(sanitizeChat(longa)).toHaveLength(MAX_CHAT_LENGTH);
  });
});

describe('placar', () => {
  it('ordena por pontos e marca quem ainda joga', () => {
    let snapshot = startRound(emptySnapshot('trecho', 3), 's1', 0);
    snapshot = { ...snapshot, scores: { ana: 4, bia: 9 } };
    snapshot = applyResult(snapshot, 'bia', hit(0), 0);

    expect(roomRanking(players, snapshot)).toEqual([
      { id: 'bia', name: 'Bia', score: 9, pending: false },
      { id: 'ana', name: 'Ana', score: 4, pending: true },
    ]);
  });

  it('desempata pelo tempo acumulado', () => {
    const snapshot = { ...emptySnapshot('trecho', 3), scores: { ana: 6, bia: 6 } };
    const ordem = roomRanking(players, snapshot, { ana: 4000, bia: 1200 });
    expect(ordem.map((row) => row.id)).toEqual(['bia', 'ana']);
  });

  it('ninguem fica pendente fora da rodada', () => {
    const snapshot = emptySnapshot('trecho', 3);
    expect(roomRanking(players, snapshot).every((row) => !row.pending)).toBe(true);
  });
});
