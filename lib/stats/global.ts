import type { GameResult } from '@/lib/game/stats';
import type { GameMode } from '@/lib/game/types';

/** Estatisticas globais so existem quando o backend opcional esta ligado. */
export const globalStatsEnabled = (): boolean => process.env.NEXT_PUBLIC_GLOBAL_STATS === 'on';

export interface GlobalDistribution {
  players: number;
  wins: number;
  /** Quem jogou e nao acertou — a barra "X" do grafico. */
  losses: number;
  distribution: number[];
}

/**
 * Em que fatia dos jogadores de hoje voce ficou, em % (1 = melhor de todos).
 * Acertar em menos tentativas e melhor; quem nao acertou fica no fim da fila.
 *
 * O seu resultado pode ainda nao ter chegado ao agregado (o POST e disparado
 * sem espera), entao a sua propria partida entra na conta a mao e o total
 * cresce junto — assim o numero nunca passa de 100%.
 */
export function topPercent(global: GlobalDistribution, result: GameResult): number | null {
  if (global.players <= 0) return null;

  let better = 0;
  if (result.won) {
    for (let i = 0; i < result.attempts - 1; i += 1) better += global.distribution[i] ?? 0;
  } else {
    // Toda vitoria alheia vale mais do que uma derrota.
    better = global.wins;
  }

  const total = Math.max(global.players, better + 1);
  return Math.round(((better + 1) / total) * 1000) / 10;
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
    const players = data.players ?? 0;
    const wins = data.wins ?? 0;
    return {
      players,
      wins,
      losses: data.losses ?? Math.max(0, players - wins),
      distribution: data.distribution,
    };
  } catch {
    return null;
  }
}
