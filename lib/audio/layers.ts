/**
 * Camadas de frequencia do modo Banda.
 *
 * Previas de streaming nao vem com trilhas isoladas por instrumento, entao a
 * revelacao progressiva acontece pelo espectro: primeiro so os graves (onde
 * moram bumbo e baixo), depois os medios (harmonia e voz) e por fim o brilho
 * (pratos e ar). O efeito de "ir ganhando camada" e o mesmo; o que muda e o
 * criterio do corte.
 *
 * Musicas que tem trilhas de verdade (synth ou local com stems) continuam
 * usando as trilhas — ver `songUsesStems`.
 */
export type LayerId = 'bass' | 'lowmid' | 'mid' | 'highmid' | 'high' | 'air';

export interface FrequencyLayer {
  id: LayerId;
  /** Corte inferior em Hz (null = sem passa-altas). */
  low: number | null;
  /** Corte superior em Hz (null = sem passa-baixas). */
  high: number | null;
}

export const FREQUENCY_LAYERS: FrequencyLayer[] = [
  { id: 'bass', low: null, high: 200 },
  { id: 'lowmid', low: 200, high: 500 },
  { id: 'mid', low: 500, high: 1200 },
  { id: 'highmid', low: 1200, high: 3000 },
  { id: 'high', low: 3000, high: 7000 },
  { id: 'air', low: 7000, high: null },
];
