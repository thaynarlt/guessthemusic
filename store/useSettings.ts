'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dictionaries, type Locale, type Strings } from '@/lib/i18n/strings';
import { settingsKey } from '@/lib/game/stats';
import { ALL_GENRES } from '@/lib/game/genres';

export type ThemeChoice = 'system' | 'light' | 'dark';

interface SettingsState {
  locale: Locale;
  theme: ThemeChoice;
  seenHowTo: boolean;
  /** Posicao do controle de volume (0 a 1), nao o ganho aplicado. */
  volume: number;
  /** Genero escolhido no modo livre. */
  freeGenre: string;
  /** Efeitos de interface. Separado do volume, que e da musica. */
  sfx: boolean;
  /** Falso ate o localStorage ser lido — sem isso o "Como jogar" reabre sozinho. */
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemeChoice) => void;
  setVolume: (volume: number) => void;
  setFreeGenre: (genre: string) => void;
  setSfx: (sfx: boolean) => void;
  markHowToSeen: () => void;
}

/**
 * Converte a posicao do controle em ganho. O ouvido responde de forma
 * aproximadamente logaritmica: sem a curva, a metade do curso ja soaria alta
 * demais e o ajuste fino ficaria todo espremido no comeco.
 */
export const volumeToGain = (position: number): number => position * position;

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      locale: 'pt-BR',
      theme: 'system',
      seenHowTo: false,
      volume: 0.6,
      freeGenre: ALL_GENRES,
      sfx: true,
      hydrated: false,
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      setFreeGenre: (freeGenre) => set({ freeGenre }),
      setSfx: (sfx) => set({ sfx }),
      markHowToSeen: () => set({ seenHowTo: true }),
    }),
    {
      name: settingsKey(),
      partialize: ({ locale, theme, seenHowTo, volume, freeGenre, sfx }) => ({
        locale,
        theme,
        seenHowTo,
        volume,
        freeGenre,
        sfx,
      }),
      onRehydrateStorage: () => () => {
        useSettings.setState({ hydrated: true });
      },
    },
  ),
);

/**
 * Decide se a tela de "Como jogar" abre sozinha. So responde `true` depois da
 * reidratacao, para nao mostrar o tutorial a quem ja jogou.
 */
export function useAutoHowTo(): boolean {
  const hydrated = useSettings((state) => state.hydrated);
  const seenHowTo = useSettings((state) => state.seenHowTo);
  return hydrated && !seenHowTo;
}

/** Dicionario do idioma ativo. */
export function useStrings(): Strings {
  const locale = useSettings((state) => state.locale);
  return dictionaries[locale];
}
