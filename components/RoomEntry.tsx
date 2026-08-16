'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DoorOpen, Plus, Radio } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { isValidRoomCode, normalizeRoomCode, randomRoomCode } from '@/lib/room/code';
import { roomsEnabled } from '@/lib/room/client';
import { useStrings } from '@/store/useSettings';

/** Porta de entrada: cria uma sala nova ou entra em uma que ja existe. */
export function RoomEntry() {
  const strings = useStrings();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);

  const enabled = roomsEnabled();
  const valid = isValidRoomCode(code);

  return (
    <>
      <AppHeader backHref="/" onHowTo={() => router.push('/')} />

      <main className="flex flex-1 flex-col gap-6">
        <div className="text-center">
          <h1 className="flex items-center justify-center gap-2 text-3xl font-extrabold tracking-tight">
            <Radio size={26} aria-hidden="true" className="text-neon-500" />
            {strings.roomName}
          </h1>
          <p className="mt-1 text-sm muted">{strings.roomPitch}</p>
        </div>

        {!enabled ? (
          <section className="surface space-y-2 p-4 text-center">
            <p className="font-semibold text-amber-500">{strings.roomOffline}</p>
            <p className="text-sm muted">{strings.roomOfflineHint}</p>
          </section>
        ) : (
          <>
            <p className="surface p-3 text-center text-sm muted">{strings.scoringPitch}</p>

            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => router.push(`/sala/${randomRoomCode()}`)}
            >
              <Plus size={18} aria-hidden="true" />
              {strings.createRoom}
            </button>

            <section className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider muted">
                {strings.joinRoom}
              </h2>
              <input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                value={code}
                placeholder={strings.roomCode}
                aria-label={strings.roomCode}
                aria-invalid={touched && !valid}
                onChange={(event) => {
                  setCode(normalizeRoomCode(event.target.value));
                  setTouched(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && valid) router.push(`/sala/${code}`);
                }}
                className="tap w-full rounded-xl border bg-transparent px-3 py-3 text-center font-display text-2xl font-extrabold uppercase tracking-[0.4em] outline-none"
                style={{ borderColor: 'rgb(var(--border))' }}
              />
              {touched && !valid && code.length > 0 && (
                <p className="text-center text-sm text-red-500">{strings.roomCodeInvalid}</p>
              )}
              <button
                type="button"
                className="btn-ghost w-full disabled:opacity-40"
                disabled={!valid}
                onClick={() => router.push(`/sala/${code}`)}
              >
                <DoorOpen size={18} aria-hidden="true" />
                {strings.enterRoom}
              </button>
            </section>
          </>
        )}
      </main>
    </>
  );
}
