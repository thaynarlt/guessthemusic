'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Countdown } from '@/components/Countdown';
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

function Distribution({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <ul className="space-y-1">
      {values.map((count, index) => (
        <li key={index} className="flex items-center gap-2 text-sm">
          <span className="w-3 tabular-nums muted">{index + 1}</span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-grape-500/15">
            <div
              className="flex h-full items-center justify-end rounded bg-grape-500 px-2 text-xs font-semibold text-white transition-all"
              style={{ width: `${Math.max(6, (count / max) * 100)}%` }}
            >
              {count}
            </div>
          </div>
        </li>
      ))}
    </ul>
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
          <Distribution values={data.distribution.slice(0, MAX_ATTEMPTS)} />
        </section>

        {global && (
          <section>
            <h3 className="mb-2 text-sm font-bold">
              {strings.statsDistribution} · {global.players}
            </h3>
            <Distribution values={global.distribution.slice(0, MAX_ATTEMPTS)} />
          </section>
        )}

        <Countdown />
      </div>
    </Modal>
  );
}
