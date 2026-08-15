'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Countdown } from '@/components/Countdown';
import { GuessDistribution } from '@/components/GuessDistribution';
import { emptyStats, winRate, type Stats } from '@/lib/game/stats';
import { fetchGlobalDistribution, type GlobalDistribution } from '@/lib/stats/global';
import { MAX_ATTEMPTS, type GameMode } from '@/lib/game/types';
import { useStrings } from '@/store/useSettings';

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  mode: GameMode;
  stats: Stats | undefined;
  puzzleNumber: number | null;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs muted">{label}</div>
    </div>
  );
}

export function StatsModal({ open, onClose, mode, stats, puzzleNumber }: StatsModalProps) {
  const strings = useStrings();
  const data = stats ?? emptyStats();
  const [global, setGlobal] = useState<GlobalDistribution | null>(null);

  useEffect(() => {
    if (!open || puzzleNumber === null) return;
    let active = true;
    void fetchGlobalDistribution(mode, puzzleNumber).then((result) => {
      if (active) setGlobal(result);
    });
    return () => {
      active = false;
    };
  }, [open, mode, puzzleNumber]);

  return (
    <Modal open={open} title={strings.stats} onClose={onClose}>
      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-2">
          <Metric label={strings.statsPlayed} value={data.played} />
          <Metric label={strings.statsWinRate} value={winRate(data)} />
          <Metric label={strings.statsStreak} value={data.currentStreak} />
          <Metric label={strings.statsMaxStreak} value={data.maxStreak} />
        </div>

        <section>
          <h3 className="mb-2 text-sm font-bold">{strings.statsDistribution}</h3>
          <GuessDistribution values={data.distribution.slice(0, MAX_ATTEMPTS)} />
        </section>

        {global && (
          <section>
            <h3 className="mb-2 text-sm font-bold">
              {strings.statsGlobalDistribution} · {global.players} {strings.statsPlayers}
            </h3>
            <GuessDistribution
              values={global.distribution.slice(0, MAX_ATTEMPTS)}
              losses={global.losses}
            />
          </section>
        )}

        <Countdown />
      </div>
    </Modal>
  );
}
