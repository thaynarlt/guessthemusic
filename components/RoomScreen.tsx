'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, DoorOpen, Play, Radio, SkipForward, Trophy } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { AttemptList } from '@/components/AttemptList';
import { AudioDeck } from '@/components/AudioDeck';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CoverArt } from '@/components/CoverArt';
import { FullTrackPlayer } from '@/components/FullTrackPlayer';
import { GenrePicker } from '@/components/GenrePicker';
import { GuessInput } from '@/components/GuessInput';
import { HowToRoomModal } from '@/components/HowToRoomModal';
import { Podium } from '@/components/Podium';
import { RoomFeed } from '@/components/RoomFeed';
import { Scoreboard } from '@/components/Scoreboard';
import { useSnippetPlayer } from '@/lib/audio/useSnippetPlayer';
import { getSong, songUsesStems } from '@/lib/game/catalog';
import { genreLabel } from '@/lib/game/genres';
import { attemptsRemaining, unlockedLevel } from '@/lib/game/machine';
import { formatSeconds, SNIPPET_STEPS, type GameMode } from '@/lib/game/types';
import { roomsEnabled } from '@/lib/room/client';
import { loadSession } from '@/lib/room/session';
import {
  hostId,
  roomRanking,
  ROOM_ROUND_OPTIONS,
  ROUND_TIMEOUT_MS,
  type RoomSnapshot,
} from '@/lib/room/protocol';
import { useRoomStore } from '@/store/useRoomStore';
import { useStrings } from '@/store/useSettings';

/** A partir daqui o cronometro vira alerta: da para uma ultima tentativa. */
const WARNING_SECONDS = 15;

const FULL_DURATION = SNIPPET_STEPS[SNIPPET_STEPS.length - 1] ?? 16;

const plural = (value: number, one: string, many: string): string =>
  `${value} ${value === 1 ? one : many}`;

export function RoomScreen({ code }: { code: string }) {
  const strings = useStrings();

  const me = useRoomStore((state) => state.me);
  const players = useRoomStore((state) => state.players);
  const snapshot = useRoomStore((state) => state.snapshot);
  const status = useRoomStore((state) => state.status);
  const game = useRoomStore((state) => state.game);
  const spent = useRoomStore((state) => state.spent);
  const feed = useRoomStore((state) => state.feed);
  const nonce = useRoomStore((state) => state.nonce);
  const error = useRoomStore((state) => state.error);
  const join = useRoomStore((state) => state.join);
  const leave = useRoomStore((state) => state.leave);
  const configure = useRoomStore((state) => state.configure);
  const startMatch = useRoomStore((state) => state.startMatch);
  const nextRound = useRoomStore((state) => state.nextRound);
  const guess = useRoomStore((state) => state.guess);
  const skip = useRoomStore((state) => state.skip);
  const say = useRoomStore((state) => state.say);

  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Solta a presenca ao sair da tela; sem isso ela so cai no timeout do canal.
  // Sem `forget`: recarregar tambem passa por aqui, e a sessao precisa
  // sobreviver para a pessoa voltar com os pontos dela.
  useEffect(() => leave, [leave]);

  /**
   * Recarregou a pagina no meio da partida? Volta sozinha, com o mesmo id — e
   * portanto com os pontos ja conquistados. Perguntar o nome de novo aqui seria
   * pedir para a pessoa reconstruir algo que o navegador ja sabe.
   */
  useEffect(() => {
    if (me) return;
    const saved = loadSession();
    if (saved?.code === code) void join(code, saved.name, 'trecho', 5);
  }, [me, code, join]);

  const song = snapshot.songId ? getSong(snapshot.songId) : undefined;
  const myGameOver = game !== null && game.status !== 'playing';
  const revealed = snapshot.phase !== 'playing' || myGameOver;

  const player = useSnippetPlayer({
    song: song ?? null,
    mode: snapshot.mode,
    level: game ? unlockedLevel(game) : 0,
    seed: `${code}:${snapshot.round}`,
    revealed,
  });

  if (!roomsEnabled()) {
    return (
      <>
        <AppHeader backHref="/" onHowTo={() => setShowHowTo(true)} />
        <main className="surface space-y-2 p-4 text-center">
          <p className="font-semibold text-amber-500">{strings.roomOffline}</p>
          <p className="text-sm muted">{strings.roomOfflineHint}</p>
        </main>
        <HowToRoomModal open={showHowTo} onClose={() => setShowHowTo(false)} />
      </>
    );
  }

  // Ainda nao entrou: pede o nome antes de ocupar uma vaga na sala.
  if (!me) {
    return (
      <>
        <AppHeader backHref="/sala" onHowTo={() => setShowHowTo(true)} />
        <main className="flex flex-1 flex-col gap-5">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold">{strings.roomName}</h1>
            <p className="mt-1 font-display text-3xl font-extrabold tracking-[0.3em]">{code}</p>
          </div>

          <input
            type="text"
            value={name}
            maxLength={16}
            autoFocus
            placeholder={strings.yourName}
            aria-label={strings.yourName}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && name.trim()) void join(code, name.trim(), 'trecho', 5);
            }}
            className="tap w-full rounded-xl border bg-transparent px-3 py-3 text-base outline-none"
            style={{ borderColor: 'rgb(var(--border))' }}
          />

          <button
            type="button"
            className="btn-primary w-full disabled:opacity-40"
            disabled={!name.trim()}
            onClick={() => void join(code, name.trim(), 'trecho', 5)}
          >
            <DoorOpen size={18} aria-hidden="true" />
            {strings.enterRoom}
          </button>

          {error === 'connect' && (
            <p className="text-center text-sm text-red-500">{strings.connectionLost}</p>
          )}
        </main>

        <HowToRoomModal open={showHowTo} onClose={() => setShowHowTo(false)} />
      </>
    );
  }

  const amHost = hostId(players) === me.id;
  const table = roomRanking(players, snapshot, spent);
  const myResult = snapshot.results[me.id];
  const finished = snapshot.phase === 'finished';

  return (
    <>
      <AppHeader backHref="/sala" onHowTo={() => setShowHowTo(true)} />

      <main className="flex flex-1 flex-col gap-5">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <Radio size={22} aria-hidden="true" className="text-neon-500" />
            {code}
          </h1>
          <span className="text-sm muted">
            {snapshot.phase === 'lobby'
              ? strings.playerCount.replace('{n}', String(players.length))
              : `${strings.round} ${snapshot.round}/${snapshot.totalRounds}`}
          </span>
        </div>

        {status !== 'open' && (
          <p className="text-center text-sm text-amber-500" role="status">
            {status === 'connecting' ? strings.connecting : strings.connectionLost}
          </p>
        )}

        {/* No fim o podio substitui o placar: a mesma informacao, com a leitura
            que a partida inteira estava construindo. */}
        {!finished && <Scoreboard rows={table} activeId={me.id} />}

        {snapshot.phase === 'lobby' && (
          <RoomLobby
            amHost={amHost}
            code={code}
            copied={copied}
            snapshot={snapshot}
            enoughPlayers={players.length > 1}
            onCopy={() => {
              void navigator.clipboard
                ?.writeText(`${window.location.origin}/sala/${code}`)
                .then(() => setCopied(true));
            }}
            onConfigure={configure}
            onStart={startMatch}
          />
        )}

        {snapshot.phase !== 'lobby' && song && game && (
          <>
            <AudioDeck
              player={player}
              song={song}
              mode={snapshot.mode}
              interactive={songUsesStems(song) || !revealed}
            />

            <AttemptList attempts={game.attempts} shakeNonce={nonce} />

            {snapshot.phase === 'playing' && !myGameOver ? (
              <>
                <p className="text-center text-sm muted">
                  {attemptsRemaining(game)} {strings.attemptsLeft}
                  {' · '}
                  <RoundClock startedAt={snapshot.startedAt} />
                </p>
                <GuessInput
                  disabled={false}
                  onGuess={guess}
                  onSkip={skip}
                  skipLabel={
                    snapshot.mode === 'trecho'
                      ? `${strings.skip} (+${formatSeconds(nextStepGain(unlockedLevel(game)))})`
                      : strings.skip
                  }
                />
              </>
            ) : (
              <section className="surface animate-pop-in space-y-4 p-4" aria-live="polite">
                {myResult && (
                  <p
                    className={`flex items-center justify-center gap-2 text-center font-display text-lg font-bold ${
                      myResult.won ? 'text-neon-500' : ''
                    }`}
                  >
                    {myResult.won && <Trophy size={20} aria-hidden="true" />}
                    {strings.youFinished.replace(
                      '{points}',
                      plural(myResult.points, strings.point, strings.points),
                    )}
                  </p>
                )}

                {snapshot.phase === 'playing' ? (
                  <p className="text-center text-sm muted">{strings.waitingOthers}</p>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <CoverArt song={song} size={88} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs muted">{strings.answerWas}</p>
                        <p className="truncate text-lg font-bold">{song.title}</p>
                        <p className="truncate text-sm muted">
                          {song.artist} · {song.year}
                        </p>
                      </div>
                    </div>

                    <FullTrackPlayer song={song} />

                    {finished ? (
                      <>
                        <h2 className="text-center text-xs font-bold uppercase tracking-wider muted">
                          {strings.finalScore}
                        </h2>
                        <p className="text-center font-display text-xl font-extrabold">
                          {strings.duelWinner.replace('{name}', table[0]?.name ?? '')}
                        </p>
                        <Podium rows={table} meId={me.id} />
                      </>
                    ) : amHost ? (
                      <button
                        type="button"
                        className="btn-primary w-full"
                        onClick={nextRound}
                        autoFocus
                      >
                        {strings.nextRound}
                        <SkipForward size={18} aria-hidden="true" />
                      </button>
                    ) : (
                      <p className="text-center text-sm muted">{strings.waitingHost}</p>
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}

        <RoomFeed feed={feed} meId={me.id} onSay={say} />

        <button type="button" className="btn-ghost mx-auto" onClick={() => setConfirmLeave(true)}>
          {strings.roomLeave}
        </button>
      </main>

      <HowToRoomModal open={showHowTo} onClose={() => setShowHowTo(false)} />

      <ConfirmDialog
        open={confirmLeave}
        title={strings.leaveRoomTitle}
        message={strings.leaveRoomWarning}
        confirmLabel={strings.roomLeave}
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          leave(true);
        }}
      />
    </>
  );
}

interface RoomLobbyProps {
  amHost: boolean;
  code: string;
  copied: boolean;
  snapshot: RoomSnapshot;
  enoughPlayers: boolean;
  onCopy: () => void;
  onConfigure: (mode: GameMode, totalRounds: number, genre: string) => void;
  onStart: () => void;
}

function RoomLobby({
  amHost,
  copied,
  snapshot,
  enoughPlayers,
  onCopy,
  onConfigure,
  onStart,
}: RoomLobbyProps) {
  const strings = useStrings();

  return (
    <section className="space-y-4">
      <button type="button" className="btn-ghost w-full" onClick={onCopy}>
        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {copied ? strings.inviteCopied : strings.copyInvite}
      </button>

      {!enoughPlayers && <p className="text-center text-sm muted">{strings.roomNeedsPlayers}</p>}

      {amHost ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {(['trecho', 'banda'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={snapshot.mode === option}
                onClick={() => onConfigure(option, snapshot.totalRounds, snapshot.genre)}
                className={`tap rounded-xl border px-3 py-3 text-sm font-bold transition ${
                  snapshot.mode === option ? 'border-transparent bg-grape-600 text-white' : ''
                }`}
                style={snapshot.mode === option ? undefined : { borderColor: 'rgb(var(--border))' }}
              >
                {option === 'trecho' ? strings.modeTrechoName : strings.modeBandaName}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {ROOM_ROUND_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={snapshot.totalRounds === option}
                onClick={() => onConfigure(snapshot.mode, option, snapshot.genre)}
                className={`tap rounded-xl border px-3 py-3 text-sm font-bold transition ${
                  snapshot.totalRounds === option
                    ? 'border-transparent bg-grape-600 text-white'
                    : ''
                }`}
                style={
                  snapshot.totalRounds === option
                    ? undefined
                    : { borderColor: 'rgb(var(--border))' }
                }
              >
                {option} {strings.rounds.toLowerCase()}
              </button>
            ))}
          </div>

          <GenrePicker
            value={snapshot.genre}
            onChange={(genre) => onConfigure(snapshot.mode, snapshot.totalRounds, genre)}
          />

          <button
            type="button"
            className="btn-primary w-full disabled:opacity-40"
            disabled={!enoughPlayers}
            onClick={onStart}
          >
            <Play size={18} aria-hidden="true" />
            {strings.startMatch}
          </button>
        </>
      ) : (
        <>
          {/* Quem nao e anfitriao nao decide, mas precisa saber o que vem ai. */}
          <p className="text-center text-sm muted">
            {snapshot.mode === 'trecho' ? strings.modeTrechoName : strings.modeBandaName}
            {' · '}
            {snapshot.totalRounds} {strings.rounds.toLowerCase()}
            {' · '}
            {genreLabel(snapshot.genre, strings.genres)}
          </p>
          <p className="text-center text-sm muted">{strings.waitingHost}</p>
        </>
      )}
    </section>
  );
}

/**
 * Quanto falta para a rodada estourar.
 *
 * So informativo — quem fecha a rodada e o anfitriao. Perto do fim vira alerta,
 * porque a diferenca entre "tenho tempo" e "e agora" muda o que se faz com a
 * ultima tentativa.
 */
function RoundClock({ startedAt }: { startedAt: number | null }) {
  const strings = useStrings();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (startedAt === null) return null;
  const left = Math.max(0, Math.ceil((startedAt + ROUND_TIMEOUT_MS - now) / 1000));
  const warning = left <= WARNING_SECONDS;

  return (
    <span
      className={warning ? 'font-bold text-amber-500' : undefined}
      // Anuncia uma vez so, quando entra na reta final: repetir a cada segundo
      // deixaria o leitor de tela impossivel de acompanhar.
      role={warning ? 'status' : undefined}
    >
      {left}s{warning && ` ${strings.timeRunningOut}`}
    </span>
  );
}

/** Quantos segundos o proximo degrau libera. */
function nextStepGain(level: number): number {
  const current = SNIPPET_STEPS[Math.min(level, SNIPPET_STEPS.length - 1)] ?? FULL_DURATION;
  const next = SNIPPET_STEPS[Math.min(level + 1, SNIPPET_STEPS.length - 1)] ?? FULL_DURATION;
  // Arredonda: 0.5 - 0.2 daria 0.30000000000000004 em ponto flutuante.
  return Math.max(0, Math.round((next - current) * 10) / 10);
}
