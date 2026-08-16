'use client';

import { Modal } from '@/components/Modal';
import { MAX_POINTS } from '@/lib/game/score';
import { SNIPPET_STEPS, formatSeconds } from '@/lib/game/types';
import { ROUND_TIMEOUT_MS } from '@/lib/room/protocol';
import { useStrings } from '@/store/useSettings';

/** A curva 6..1 desenhada: o degrau curto vale mais, e isso e a regra do jogo. */
function ScoreLadder() {
  return (
    <ol className="flex items-end justify-between gap-1" aria-hidden="true">
      {SNIPPET_STEPS.map((seconds, level) => {
        const points = MAX_POINTS - level;
        return (
          <li key={seconds} className="flex flex-1 flex-col items-center gap-1">
            <span className="font-display text-sm font-extrabold">{points}</span>
            <div
              className="w-full rounded-t bg-grape-500"
              style={{ height: `${points * 8}px`, opacity: 0.35 + points * 0.1 }}
            />
            <span className="text-[10px] muted">{formatSeconds(seconds)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function HowToRoomModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const strings = useStrings();
  const seconds = Math.round(ROUND_TIMEOUT_MS / 1000);

  return (
    <Modal open={open} title={strings.howToRoom} onClose={onClose}>
      <div className="space-y-5 text-sm">
        <p className="muted">{strings.howToRoomIntro}</p>

        <section className="space-y-2">
          <h3 className="font-bold">{strings.howToRoomScoreTitle}</h3>
          <ScoreLadder />
          <p className="muted">{strings.howToRoomScore}</p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold">{strings.howToRoomRoundTitle}</h3>
          <p className="muted">{strings.howToRoomRound.replace('{seconds}', String(seconds))}</p>
        </section>

        <button type="button" className="btn-primary w-full" onClick={onClose}>
          {strings.gotIt}
        </button>
      </div>
    </Modal>
  );
}
