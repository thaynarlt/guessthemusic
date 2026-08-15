'use client';

import { useEffect, useState } from 'react';
import { msUntilNextPuzzle } from '@/lib/game/daily';
import { useStrings } from '@/store/useSettings';

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

/** Relogio ate o proximo puzzle; recarrega sozinho na virada do dia. */
export function Countdown() {
  const strings = useStrings();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    setRemaining(msUntilNextPuzzle());
    const timer = setInterval(() => {
      const next = msUntilNextPuzzle();
      setRemaining(next);
      if (next >= 86_399_000) window.location.reload();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center text-sm muted">
      <div>{strings.nextPuzzle}</div>
      <div className="font-mono text-2xl font-bold tabular-nums" style={{ color: 'rgb(var(--text))' }}>
        {remaining === null ? '--:--:--' : format(remaining)}
      </div>
    </div>
  );
}
