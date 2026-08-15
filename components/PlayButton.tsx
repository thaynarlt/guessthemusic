'use client';

import { LoaderCircle, Pause, Play } from 'lucide-react';
import { useStrings } from '@/store/useSettings';

interface PlayButtonProps {
  playing: boolean;
  loading: boolean;
  onToggle: () => void;
  size?: 'md' | 'lg';
}

export function PlayButton({ playing, loading, onToggle, size = 'lg' }: PlayButtonProps) {
  const strings = useStrings();
  const large = size === 'lg';
  const dimension = large ? 'h-20 w-20' : 'h-14 w-14';
  const iconSize = large ? 30 : 20;

  return (
    <div className="relative flex items-center justify-center">
      {playing && (
        <span
          aria-hidden="true"
          className={`absolute rounded-full bg-grape-500/40 animate-pulse-ring ${dimension}`}
        />
      )}
      <button
        type="button"
        onClick={onToggle}
        disabled={loading}
        aria-label={playing ? strings.pause : strings.play}
        className={`relative flex items-center justify-center rounded-full bg-grape-600 text-white shadow-lg transition hover:bg-grape-500 active:scale-95 disabled:opacity-60 ${dimension}`}
      >
        {loading ? (
          <LoaderCircle size={iconSize} className="animate-spin" aria-hidden="true" />
        ) : playing ? (
          <Pause size={iconSize} fill="currentColor" aria-hidden="true" />
        ) : (
          // Deslocamento otico: o triangulo parece torto quando centralizado.
          <Play size={iconSize} fill="currentColor" className="ml-0.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
