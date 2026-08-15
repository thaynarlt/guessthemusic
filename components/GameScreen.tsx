'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { AttemptList } from '@/components/AttemptList';
import { GenrePicker } from '@/components/GenrePicker';
import { GuessInput } from '@/components/GuessInput';
import { HowToModal } from '@/components/HowToModal';
import { PlayButton } from '@/components/PlayButton';
import { ResultCard } from '@/components/ResultCard';
import { SnippetBar } from '@/components/SnippetBar';
import { StatsModal } from '@/components/StatsModal';
import { VolumeControl } from '@/components/VolumeControl';
import { TrackRack, type RackItem } from '@/components/TrackRack';
import { SpectrumIcon } from '@/components/icons/SpectrumIcon';
import { Drum, Guitar, MicVocal, Music, Piano, Speaker } from 'lucide-react';
import { getEngine, type PlayTrack } from '@/lib/audio/engine';
import { FREQUENCY_LAYERS } from '@/lib/audio/layers';
import { snippetStart, startSeed } from '@/lib/audio/startPoint';
import { songUsesStems } from '@/lib/game/catalog';
import { attemptsRemaining, snippetDuration, unlockedCount, unlockedStems } from '@/lib/game/machine';
import {
  formatSeconds,
  sessionId,
  SNIPPET_STEPS,
  STEM_ORDER,
  type GameMode,
  type GameVariant,
  type Song,
  type StemName,
} from '@/lib/game/types';
import { freeRound, resolveDaily } from '@/lib/puzzle/today';
import { useGameStore } from '@/store/useGameStore';
import { useAutoHowTo, useSettings, useStrings } from '@/store/useSettings';

const FULL_DURATION = SNIPPET_STEPS[SNIPPET_STEPS.length - 1] ?? 16;

/** Icone de cada trilha, quando a musica tem stems de verdade. */
const STEM_ICONS: Record<StemName, ReactNode> = {
  drums: <Drum size={20} aria-hidden="true" />,
  bass: <Speaker size={20} aria-hidden="true" />,
  guitar: <Guitar size={20} aria-hidden="true" />,
  keys: <Piano size={20} aria-hidden="true" />,
  other: <Music size={20} aria-hidden="true" />,
  vocals: <MicVocal size={20} aria-hidden="true" />,
};

/** Quantas musicas guardar no historico para nao repetir no modo livre. */
const RECENT_MEMORY = 8;

type AudioStatus = 'idle' | 'loading' | 'ready' | 'error' | 'blocked';

interface GameScreenProps {
  mode: GameMode;
  variant?: GameVariant;
}

export function GameScreen({ mode, variant = 'diario' }: GameScreenProps) {
  const strings = useStrings();
  const markHowToSeen = useSettings((state) => state.markHowToSeen);
  const freeGenre = useSettings((state) => state.freeGenre);
  const setFreeGenre = useSettings((state) => state.setFreeGenre);
  const autoHowTo = useAutoHowTo();

  const session = sessionId(variant, mode);
  const game = useGameStore((state) => state.games[session]);
  const stats = useGameStore((state) => state.stats[mode]);
  const freeScore = useGameStore((state) => state.free[session]);
  const feedback = useGameStore((state) => state.lastFeedback);
  const startDaily = useGameStore((state) => state.startDaily);
  const startFree = useGameStore((state) => state.startFree);
  const guess = useGameStore((state) => state.guess);
  const skip = useGameStore((state) => state.skip);

  const [answer, setAnswer] = useState<Song | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [audio, setAudio] = useState<AudioStatus>('idle');
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [showHowTo, setShowHowTo] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const frame = useRef<number | null>(null);
  const recent = useRef<string[]>([]);

  const isFree = variant === 'livre';

  // A resposta depende da data (ou de um sorteio): resolver so no cliente evita
  // divergencia de hidratacao com o HTML gerado no servidor.
  useEffect(() => {
    let active = true;

    if (isFree) {
      const song = freeRound(mode, recent.current, freeGenre);
      recent.current = [song.id, ...recent.current].slice(0, RECENT_MEMORY);
      setAnswer(song);
      setLabel(`#${round}`);
      startFree(mode, round, song.id);
      return;
    }

    void resolveDaily(mode).then((daily) => {
      if (!active) return;
      setAnswer(daily.song);
      setLabel(`#${daily.puzzleNumber}`);
      startDaily(mode, daily.puzzleNumber, daily.song.id);
    });

    return () => {
      active = false;
    };
  }, [mode, isFree, round, freeGenre, startDaily, startFree]);

  useEffect(() => {
    if (autoHowTo) setShowHowTo(true);
  }, [autoHowTo]);

  const stopPlayback = useCallback(() => {
    getEngine().stop();
    setPlaying(false);
    setElapsed(0);
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  useEffect(() => stopPlayback, [stopPlayback]);

  // Toda jogada (e toda troca de musica) corta o audio.
  useEffect(() => {
    stopPlayback();
    setMuted(new Set());
  }, [game?.attempts.length, answer?.id, stopPlayback]);

  const trackElapsed = useCallback(() => {
    setElapsed(getEngine().getElapsed());
    frame.current = requestAnimationFrame(trackElapsed);
  }, []);

  const play = useCallback(async () => {
    if (!answer || !game) return;
    const engine = getEngine();

    setAudio('loading');
    try {
      await engine.resume();

      // Se o contexto nao entrou em "running", nao adianta seguir: sairia
      // silencio sem explicacao. Acontece quando o navegador exige um gesto
      // novo ou quando o iOS interrompeu o audio (ligacao, outro app).
      if (engine.state !== 'running') {
        setAudio('blocked');
        return;
      }

      let tracks: PlayTrack[];
      let duration: number;

      // Ponto de partida sorteado uma vez por partida: sem isso todo trecho
      // comecaria no refrao, que e onde as previas ja vem cortadas.
      const seed = startSeed(answer.id, game.puzzleNumber);
      let offset = 0;

      if (mode === 'trecho') {
        const buffer = await engine.loadClip(answer);
        offset = snippetStart(buffer, seed, FULL_DURATION);
        tracks = [{ id: 'clip', buffer }];
        duration = Math.min(snippetDuration(game), buffer.duration - offset);
      } else if (songUsesStems(answer)) {
        const buffers = await engine.loadStems(answer, unlockedStems(game));
        if (buffers.size === 0) throw new Error('sem trilhas para esta musica');
        tracks = [...buffers.entries()].map(([stem, buffer]) => ({
          id: stem,
          buffer,
          muted: muted.has(stem),
        }));
        // A mixagem inteira sai do mesmo ponto: basta medir uma trilha.
        const reference = tracks[0]?.buffer;
        offset = reference ? snippetStart(reference, seed, FULL_DURATION) : 0;
        duration = Math.min(FULL_DURATION, (reference?.duration ?? FULL_DURATION) - offset);
      } else {
        // Sem trilhas isoladas: revela o espectro em camadas.
        const buffer = await engine.loadClip(answer);
        const open = FREQUENCY_LAYERS.slice(0, unlockedCount(game));

        // Na revelacao final toca o clipe inteiro, sem filtro nenhum.
        tracks =
          game.status === 'playing'
            ? open.map((layer) => ({
                id: layer.id,
                buffer,
                muted: muted.has(layer.id),
                band: { low: layer.low, high: layer.high },
              }))
            : [{ id: 'full', buffer }];
        offset = snippetStart(buffer, seed, FULL_DURATION);
        duration = Math.min(FULL_DURATION, buffer.duration - offset);
      }

      setAudio('ready');
      setPlaying(true);
      engine.play({ tracks, duration, offset, onEnded: stopPlayback });
      frame.current = requestAnimationFrame(trackElapsed);
    } catch {
      setAudio('error');
      setPlaying(false);
    }
  }, [answer, game, mode, muted, stopPlayback, trackElapsed]);

  const togglePlay = useCallback(() => {
    if (playing) {
      stopPlayback();
      return;
    }
    void play();
  }, [playing, play, stopPlayback]);

  // Espaco toca/para, desde que o foco nao esteja em um campo de texto.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      event.preventDefault();
      togglePlay();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay]);

  const toggleTrack = useCallback((id: string) => {
    setMuted((current) => {
      const next = new Set(current);
      const willMute = !next.has(id);
      if (willMute) next.add(id);
      else next.delete(id);
      getEngine().setMuted(id, willMute);
      return next;
    });
  }, []);

  const onGuess = useCallback(
    (song: Song) => {
      if (answer) guess(variant, mode, song, answer);
    },
    [guess, variant, mode, answer],
  );

  const nextRound = useCallback(() => {
    stopPlayback();
    setAudio('idle');
    setRound((current) => current + 1);
  }, [stopPlayback]);

  const modeName = mode === 'trecho' ? strings.modeTrechoName : strings.modeBandaName;

  if (!answer || !game) {
    return (
      <>
        <AppHeader backHref="/" onHowTo={() => setShowHowTo(true)} />
        <div className="surface h-64 animate-pulse" aria-label={strings.loadingAudio} />
      </>
    );
  }

  const finished = game.status !== 'playing';
  const usesStems = songUsesStems(answer);
  const rackItems: RackItem[] = usesStems
    ? STEM_ORDER.map((stem) => ({
        id: stem,
        label: strings.stems[stem],
        icon: STEM_ICONS[stem],
      }))
    : FREQUENCY_LAYERS.map((layer, index) => ({
        id: layer.id,
        label: strings.layers[layer.id],
        icon: <SpectrumIcon index={index} />,
      }));
  const last = game.attempts[game.attempts.length - 1];
  const resultLabel = last
    ? last.result === 'correct'
      ? strings.resultCorrect
      : last.result === 'artist'
        ? strings.resultArtist
        : last.result === 'skipped'
          ? strings.resultSkipped
          : strings.resultWrong
    : '';

  return (
    <>
      <AppHeader
        backHref="/"
        onHowTo={() => setShowHowTo(true)}
        onStats={isFree ? undefined : () => setShowStats(true)}
      />

      <main className="flex flex-1 flex-col gap-5">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-2xl font-extrabold">
            {modeName}
            {isFree && (
              <span className="ml-2 rounded-full bg-neon-500/20 px-2 py-0.5 align-middle text-xs font-bold text-neon-600 dark:text-neon-400">
                {strings.freeMode}
              </span>
            )}
          </h1>
          <span className="text-sm muted">{label}</span>
        </div>

        {isFree && (
          <GenrePicker
            value={freeGenre}
            onChange={(genre) => {
              setFreeGenre(genre);
              // Troca de genero comeca uma musica nova na hora.
              setRound((current) => current + 1);
            }}
          />
        )}

        {/* wide-bleed: a barra precisa de largura para os trechos curtos aparecerem. */}
        <section className="surface wide-bleed flex flex-col items-center gap-4 p-4">
          {mode === 'trecho' && <SnippetBar unlocked={snippetDuration(game)} elapsed={elapsed} />}

          <PlayButton playing={playing} loading={audio === 'loading'} onToggle={togglePlay} />

          {mode === 'banda' && (
            <TrackRack
              items={rackItems}
              unlocked={unlockedCount(game)}
              muted={muted}
              onToggle={toggleTrack}
              interactive={usesStems || !finished}
            />
          )}

          <VolumeControl />

          {(audio === 'error' || audio === 'blocked') && (
            <div className="max-w-sm text-center text-sm">
              <p className="text-red-500">
                {audio === 'blocked' ? strings.audioBlocked : strings.audioError}
              </p>
              <p className="mt-1 text-xs muted">{strings.audioHint}</p>
              <button type="button" className="btn-ghost mt-2" onClick={() => void play()}>
                {strings.retry}
              </button>
            </div>
          )}
        </section>

        <p aria-live="polite" className="sr-only">
          {resultLabel && `${resultLabel}. ${attemptsRemaining(game)} ${strings.attemptsLeft}.`}
        </p>

        <AttemptList
          attempts={game.attempts}
          shakeNonce={feedback?.session === session ? feedback.nonce : 0}
        />

        {finished ? (
          <ResultCard
            state={game}
            song={answer}
            playing={playing}
            loading={audio === 'loading'}
            onTogglePlay={togglePlay}
            {...(isFree
              ? { onNext: nextRound, score: freeScore ?? { rounds: 0, wins: 0 } }
              : { stats })}
          />
        ) : (
          <>
            <p className="text-center text-sm muted">
              {attemptsRemaining(game)} {strings.attemptsLeft}
              {isFree && freeScore && freeScore.rounds > 0 && (
                <span>
                  {' · '}
                  {strings.sessionScore}: {freeScore.wins}/{freeScore.rounds}
                </span>
              )}
            </p>
            <GuessInput
              disabled={finished}
              onGuess={onGuess}
              onSkip={() => skip(variant, mode)}
              skipLabel={
                mode === 'trecho'
                  ? `${strings.skip} (+${formatSeconds(nextStepGain(game.attempts.length))})`
                  : strings.skip
              }
            />
          </>
        )}
      </main>

      <HowToModal
        open={showHowTo}
        onClose={() => {
          setShowHowTo(false);
          markHowToSeen();
        }}
      />
      <StatsModal
        open={showStats}
        onClose={() => setShowStats(false)}
        mode={mode}
        stats={stats}
        puzzleNumber={game.puzzleNumber}
      />
    </>
  );
}

/** Quantos segundos o proximo passo adiciona ao trecho. */
function nextStepGain(attempts: number): number {
  const current = SNIPPET_STEPS[Math.min(attempts, SNIPPET_STEPS.length - 1)] ?? FULL_DURATION;
  const next = SNIPPET_STEPS[Math.min(attempts + 1, SNIPPET_STEPS.length - 1)] ?? FULL_DURATION;
  // Arredonda: 0.5 - 0.1 daria 0.39999999999999997 em ponto flutuante.
  return Math.max(0, Math.round((next - current) * 10) / 10);
}
