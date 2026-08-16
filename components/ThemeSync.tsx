'use client';

import { useEffect } from 'react';
import { setSfxEnabled } from '@/lib/audio/sfx';
import { useSettings } from '@/store/useSettings';

/** Mantem a classe `dark` do <html> em sincronia com a preferencia escolhida. */
export function ThemeSync() {
  const theme = useSettings((state) => state.theme);
  const locale = useSettings((state) => state.locale);
  const sfx = useSettings((state) => state.sfx);

  // Os efeitos vivem fora do React (as stores os disparam), entao a preferencia
  // precisa ser empurrada para la em vez de lida de dentro.
  useEffect(() => setSfxEnabled(sfx), [sfx]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
    };

    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
