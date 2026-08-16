'use client';

import Link from 'next/link';
import { ArrowLeft, ChartColumn, CircleHelp, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { playSfx } from '@/lib/audio/sfx';
import { LOCALES } from '@/lib/i18n/strings';
import { useSettings, useStrings } from '@/store/useSettings';

interface AppHeaderProps {
  backHref?: string;
  onHowTo: () => void;
  onStats?: () => void;
}

export function AppHeader({ backHref, onHowTo, onStats }: AppHeaderProps) {
  const strings = useStrings();
  const { locale, theme, sfx, setLocale, setTheme, setSfx } = useSettings();

  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const nextLocale = LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length] ?? 'pt-BR';

  return (
    <header className="mb-5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {backHref && (
          <Link href={backHref} className="btn-ghost px-3" aria-label={strings.back}>
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
        )}
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          <span className="text-grape-500">Guess</span>
          <span className="text-neon-500">The</span>
          <span>Music</span>
        </Link>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-ghost px-2 text-xs font-bold"
          onClick={() => setLocale(nextLocale)}
          aria-label={`${strings.language}: ${nextLocale}`}
        >
          {locale === 'pt-BR' ? 'PT' : 'EN'}
        </button>
        <button
          type="button"
          className="btn-ghost px-2"
          aria-pressed={sfx}
          onClick={() => {
            // Ao ligar, toca uma amostra: o botao se explica sozinho, e o
            // clique ja e o gesto que o navegador exige para liberar o audio.
            setSfx(!sfx);
            if (!sfx) playSfx('join');
          }}
          aria-label={`${strings.soundEffects}: ${sfx ? strings.unmuted : strings.muted}`}
        >
          {sfx ? (
            <Volume2 size={18} aria-hidden="true" />
          ) : (
            <VolumeX size={18} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="btn-ghost px-2"
          onClick={() => setTheme(nextTheme)}
          aria-label={`${strings.theme}: ${nextTheme}`}
        >
          {theme === 'dark' ? (
            <Sun size={18} aria-hidden="true" />
          ) : (
            <Moon size={18} aria-hidden="true" />
          )}
        </button>
        {onStats && (
          <button
            type="button"
            className="btn-ghost px-2"
            onClick={onStats}
            aria-label={strings.stats}
          >
            <ChartColumn size={18} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="btn-ghost px-2"
          onClick={onHowTo}
          aria-label={strings.howToPlay}
        >
          <CircleHelp size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
