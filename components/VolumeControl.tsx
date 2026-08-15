'use client';

import { useEffect, useRef } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { getEngine } from '@/lib/audio/engine';
import { useSettings, useStrings, volumeToGain } from '@/store/useSettings';

/**
 * Volume do jogo. Fica salvo entre partidas e vale tambem para o som que ja
 * esta tocando — o ganho e um no separado do envelope de fade.
 */
export function VolumeControl() {
  const volume = useSettings((state) => state.volume);
  const setVolume = useSettings((state) => state.setVolume);
  const strings = useStrings();
  const anterior = useRef(volume || 0.6);

  // Mantem o motor em sincronia, inclusive depois da reidratacao do storage.
  useEffect(() => {
    getEngine().setVolume(volumeToGain(volume));
  }, [volume]);

  const mudo = volume === 0;
  const Icone = mudo ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const alternarMudo = () => {
    if (mudo) {
      setVolume(anterior.current || 0.6);
      return;
    }
    anterior.current = volume;
    setVolume(0);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={alternarMudo}
        aria-label={mudo ? strings.unmuted : strings.muted}
        title={strings.volume}
        className="flex h-9 w-9 items-center justify-center rounded-lg muted transition hover:bg-grape-500/10"
      >
        <Icone size={18} aria-hidden="true" />
      </button>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(volume * 100)}
        onChange={(event) => setVolume(Number(event.target.value) / 100)}
        aria-label={strings.volume}
        aria-valuetext={`${Math.round(volume * 100)}%`}
        className="volume-slider h-1.5 w-32 cursor-pointer appearance-none rounded-full"
        style={{
          background: `linear-gradient(to right, rgb(154 92 255) ${volume * 100}%, rgb(var(--border)) ${volume * 100}%)`,
        }}
      />
    </div>
  );
}
