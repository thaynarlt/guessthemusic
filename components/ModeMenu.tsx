'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { AudioLines, Check, ChevronRight, Flame, Headphones, Infinity as InfinityIcon } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Countdown } from '@/components/Countdown';
import { HowToModal } from '@/components/HowToModal';
import { loadGame, loadStats } from '@/lib/game/stats';
import { todayPuzzleNumber } from '@/lib/puzzle/today';
import type { GameMode } from '@/lib/game/types';
import { useAutoHowTo, useSettings, useStrings } from '@/store/useSettings';

interface ModeStatus {
  finished: boolean;
  streak: number;
}

const MODES: Array<{ mode: GameMode; href: string; icon: ReactNode; accent: string }> = [
  {
    mode: 'trecho',
    href: '/trecho',
    icon: <Headphones size={30} aria-hidden="true" />,
    accent: 'from-grape-600/80 to-grape-500/30',
  },
  {
    mode: 'banda',
    href: '/banda',
    icon: <AudioLines size={30} aria-hidden="true" />,
    accent: 'from-neon-600/70 to-neon-500/20',
  },
];

export function ModeMenu() {
  const strings = useStrings();
  const markHowToSeen = useSettings((state) => state.markHowToSeen);
  const autoHowTo = useAutoHowTo();
  const [status, setStatus] = useState<Partial<Record<GameMode, ModeStatus>>>({});
  const [showHowTo, setShowHowTo] = useState(false);

  // localStorage so existe no cliente: por isso o status entra depois da montagem.
  useEffect(() => {
    const puzzleNumber = todayPuzzleNumber();
    const next: Partial<Record<GameMode, ModeStatus>> = {};

    for (const { mode } of MODES) {
      const game = loadGame(mode, puzzleNumber);
      next[mode] = {
        finished: game?.status === 'won' || game?.status === 'lost',
        streak: loadStats(mode).currentStreak,
      };
    }

    setStatus(next);
  }, []);

  useEffect(() => {
    if (autoHowTo) setShowHowTo(true);
  }, [autoHowTo]);

  return (
    <>
      <AppHeader onHowTo={() => setShowHowTo(true)} />

      <main className="flex flex-1 flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">{strings.menuTitle}</h1>
          <p className="mt-1 text-sm muted">{strings.tagline}</p>
        </div>

        <nav className="grid gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider muted">
            {strings.dailySection}
          </h2>
          {MODES.map(({ mode, href, icon, accent }) => {
            const info = status[mode];
            const name = mode === 'trecho' ? strings.modeTrechoName : strings.modeBandaName;
            const pitch = mode === 'trecho' ? strings.modeTrechoPitch : strings.modeBandaPitch;

            return (
              <Link
                key={mode}
                href={href}
                className={`surface group flex items-center gap-4 bg-gradient-to-br p-4 transition hover:scale-[1.01] active:scale-[0.99] ${accent}`}
              >
                <span className="text-grape-500 dark:text-grape-400">{icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold">{name}</span>
                  <span className="block text-sm muted">{pitch}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                        info?.finished
                          ? 'bg-neon-500/20 text-neon-600 dark:text-neon-400'
                          : 'bg-grape-500/20 text-grape-600 dark:text-grape-400'
                      }`}
                    >
                      {info?.finished && <Check size={12} aria-hidden="true" />}
                      {info?.finished ? strings.played : strings.notPlayed}
                    </span>
                    {info && info.streak > 0 && (
                      <span className="inline-flex items-center gap-1 muted">
                        <Flame size={12} aria-hidden="true" />
                        {strings.streak}: {info.streak}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  size={22}
                  className="muted transition group-hover:translate-x-1"
                />
              </Link>
            );
          })}
        </nav>

        <section className="grid gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider muted">{strings.freeSection}</h2>
          <p className="text-sm muted">{strings.freePitch}</p>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map(({ mode, href, icon }) => (
              <Link
                key={mode}
                href={`/livre${href}`}
                className="surface tap flex items-center justify-center gap-2 px-3 py-3 text-sm font-bold transition hover:bg-grape-500/10 active:scale-[0.99]"
              >
                <span className="text-neon-600 dark:text-neon-400">
                  {mode === 'trecho' ? (
                    <Headphones size={18} aria-hidden="true" />
                  ) : (
                    <AudioLines size={18} aria-hidden="true" />
                  )}
                </span>
                {mode === 'trecho' ? strings.modeTrechoName : strings.modeBandaName}
                <InfinityIcon size={16} className="muted" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <div className="surface p-4">
          <Countdown />
        </div>

        <button type="button" className="btn-ghost mx-auto" onClick={() => setShowHowTo(true)}>
          {strings.howToPlay}
        </button>

        <Link href="/termos" className="mx-auto text-xs underline muted">
          {strings.legalLink}
        </Link>
      </main>

      <HowToModal
        open={showHowTo}
        onClose={() => {
          setShowHowTo(false);
          markHowToSeen();
        }}
      />
    </>
  );
}
