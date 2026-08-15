'use client';

import { useEffect } from 'react';
import { useSettings } from '@/store/useSettings';

/** Mantem a classe `dark` do <html> em sincronia com a preferencia escolhida. */
export function ThemeSync() {
  const theme = useSettings((state) => state.theme);
  const locale = useSettings((state) => state.locale);

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
