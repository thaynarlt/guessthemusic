import type { GameResult } from '@/lib/game/stats';
import type { GameMode } from '@/lib/game/types';

/** Estatisticas globais so existem quando o backend opcional esta ligado. */
export const globalStatsEnabled = (): boolean => process.env.NEXT_PUBLIC_GLOBAL_STATS === 'on';

export interface GlobalDistribution {
  players: number;
  wins: number;
  distribution: number[];
}

/** Envia o resultado do dia. Falhar aqui nunca pode atrapalhar a partida. */
export async function reportResult(mode: GameMode, result: GameResult): Promise<void> {
  if (!globalStatsEnabled()) return;
  try {
    await fetch('/api/stats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode, ...result }),
      keepalive: true,
    });
  } catch {
    /* offline ou backend desligado: as estatisticas locais ja foram salvas */
  }
}

export async function fetchGlobalDistribution(
  mode: GameMode,
  puzzleNumber: number,
): Promise<GlobalDistribution | null> {
  if (!globalStatsEnabled()) return null;
  try {
    const response = await fetch(`/api/stats?mode=${mode}&puzzleNumber=${puzzleNumber}`);
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<GlobalDistribution> & { enabled?: boolean };
    if (!data.enabled || !Array.isArray(data.distribution)) return null;
    return {
      players: data.players ?? 0,
      wins: data.wins ?? 0,
      distribution: data.distribution,
    };
  } catch {
    return null;
  }
}
