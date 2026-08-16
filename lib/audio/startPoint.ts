import { hashString, mulberry32 } from '@/lib/game/random';

/**
 * Interface minima do AudioBuffer usada aqui. Declarada a mao para a funcao
 * ser testavel no Node, onde nao existe Web Audio.
 */
export interface SampledAudio {
  duration: number;
  sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

/** Quantos pontos de partida sao avaliados antes do sorteio. */
const CANDIDATES = 24;

/** Nao comeca em cima do primeiro instante: quase toda faixa abre em fade. */
const HEAD_GUARD = 0.4;

/**
 * Janela curta usada para reprovar um comeco mudo. Precisa ser da ordem das
 * primeiras tentativas do modo Trecho (0,2s), senao o jogo entrega silencio.
 */
const ONSET_WINDOW = 0.25;

/** Janela longa: mede se o trecho tem musica de verdade, nao so um estalo. */
const BODY_WINDOW = 1;

/** Fracao da energia media da faixa que um candidato precisa alcancar. */
const ENERGY_FLOOR = 0.45;

/** Amostra 1 de cada N: energia nao precisa de precisao de amostra. */
const STRIDE = 4;

function rms(samples: Float32Array, from: number, length: number): number {
  const end = Math.min(samples.length, from + length);
  let sum = 0;
  let count = 0;
  for (let i = Math.max(0, from); i < end; i += STRIDE) {
    const value = samples[i] ?? 0;
    sum += value * value;
    count += 1;
  }
  return count === 0 ? 0 : Math.sqrt(sum / count);
}

/**
 * Sorteia onde o trecho comeca, em segundos.
 *
 * Sem isso todo trecho comecaria no inicio da previa — e as previas do Deezer
 * e do iTunes ja vem cortadas no refrao, que e justamente a parte facil de
 * reconhecer. O sorteio e deterministico: a mesma semente devolve sempre o
 * mesmo ponto, entao o desafio do dia sai igual para todo mundo e nao muda a
 * cada replay dentro da partida.
 *
 * @param audio   Faixa ja decodificada.
 * @param seed    Semente estavel (id da musica + numero do puzzle).
 * @param needed  Segundos que precisam existir depois do ponto escolhido.
 */
export function snippetStart(audio: SampledAudio, seed: number, needed: number): number {
  const usable = audio.duration - needed;
  if (usable <= HEAD_GUARD) return 0;

  const samples = audio.getChannelData(0);
  const rate = audio.sampleRate;
  const onset = Math.round(ONSET_WINDOW * rate);
  const body = Math.round(BODY_WINDOW * rate);
  const floor = rms(samples, 0, samples.length) * ENERGY_FLOOR;

  // Um candidato so vale se o comeco dele ja tiver som: o que reprova e a
  // janela mais fraca, nao a media entre elas.
  const scored = Array.from({ length: CANDIDATES }, (_, index) => {
    const at = HEAD_GUARD + ((usable - HEAD_GUARD) * index) / (CANDIDATES - 1);
    const frame = Math.round(at * rate);
    return { at, score: Math.min(rms(samples, frame, onset), rms(samples, frame, body)) };
  });

  const audible = scored.filter((candidate) => candidate.score >= floor);

  // Faixa toda abafada (ou quase silenciosa): fica com o trecho mais forte.
  if (audible.length === 0) {
    return scored.reduce((best, candidate) => (candidate.score > best.score ? candidate : best)).at;
  }

  const pick = Math.floor(mulberry32(seed)() * audible.length);
  return (audible[Math.min(pick, audible.length - 1)] as { at: number }).at;
}

/**
 * Semente estavel de uma partida: mesma musica no mesmo puzzle, mesmo trecho.
 *
 * O segundo argumento aceita texto porque nem toda partida e numerada: a sala
 * online identifica a rodada por codigo da sala + numero.
 */
export const startSeed = (songId: string, round: number | string): number =>
  hashString(`${songId}:${round}`);
