import { getEngine } from '@/lib/audio/engine';
import type { GuessResult } from '@/lib/game/types';

/**
 * Efeitos de interface, gerados na hora.
 *
 * Nenhum arquivo de audio: o repo ja sintetiza as faixas de exemplo, e sons de
 * clique sao simples o bastante para sairem de dois osciladores. Isso evita
 * peso no bundle, requisicao de rede e a pergunta de quem e a licenca do som.
 *
 * A regra que manda em todo o resto: **efeito nenhum toca por cima do trecho**.
 * O jogo pede para a pessoa reconhecer 0,2s de musica; um blip em cima disso
 * nao seria enfeite, seria sabotagem.
 */

/** Um toque do efeito. */
export interface Tone {
  /** Frequencia em Hz. */
  freq: number;
  /** Quando entra, em segundos depois do inicio do efeito. */
  at: number;
  duration: number;
  type?: OscillatorType;
  /** 0 a 1, dentro do volume ja discreto dos efeitos. */
  gain?: number;
}

export type SfxName =
  | 'correct'
  | 'wrong'
  | 'skip'
  | 'reveal'
  | 'tick'
  | 'victory'
  | 'join'
  | 'chat';

/** Teto de duracao de qualquer efeito. Passar disso ja e musica, nao aviso. */
export const MAX_SFX_SECONDS = 1;

/**
 * Os efeitos, em notas.
 *
 * Intervalos escolhidos a dedo, nao frequencias soltas: acerto sobe uma triade
 * maior, erro desce um semitom (o intervalo mais desconfortavel que existe) e
 * a vitoria fecha na oitava.
 */
export const SFX: Record<SfxName, readonly Tone[]> = {
  // Do-Mi-Sol subindo: resolve, soa como "certo".
  correct: [
    { freq: 523.25, at: 0, duration: 0.1 },
    { freq: 659.25, at: 0.08, duration: 0.1 },
    { freq: 783.99, at: 0.16, duration: 0.22 },
  ],
  // Segunda menor descendente, grave: incomoda de proposito.
  wrong: [
    { freq: 196, at: 0, duration: 0.14, type: 'triangle' },
    { freq: 185, at: 0.1, duration: 0.24, type: 'triangle' },
  ],
  skip: [{ freq: 392, at: 0, duration: 0.07, gain: 0.5 }],
  // Duas notas abrindo, para a revelacao da musica.
  reveal: [
    { freq: 392, at: 0, duration: 0.12, gain: 0.7 },
    { freq: 587.33, at: 0.1, duration: 0.26, gain: 0.7 },
  ],
  // Curto e discreto: toca uma vez por segundo na reta final.
  tick: [{ freq: 880, at: 0, duration: 0.05, gain: 0.35 }],
  victory: [
    { freq: 523.25, at: 0, duration: 0.11 },
    { freq: 659.25, at: 0.1, duration: 0.11 },
    { freq: 783.99, at: 0.2, duration: 0.11 },
    { freq: 1046.5, at: 0.3, duration: 0.34 },
  ],
  join: [
    { freq: 587.33, at: 0, duration: 0.07, gain: 0.4 },
    { freq: 880, at: 0.06, duration: 0.1, gain: 0.4 },
  ],
  chat: [{ freq: 698.46, at: 0, duration: 0.07, gain: 0.35 }],
};

/**
 * Som de uma jogada do modo de um jogador so.
 *
 * Vencer ganha a fanfarra. Perder na ultima tentativa ganha a revelacao, que e
 * neutra de proposito: a tela ja diz que nao foi, o som nao precisa esfregar.
 */
export function sfxForResult(
  result: GuessResult | undefined,
  finished: boolean,
  won: boolean,
): SfxName {
  if (won) return 'victory';
  if (finished) return 'reveal';
  if (result === 'skipped') return 'skip';
  if (result === 'correct') return 'correct';
  return 'wrong';
}

/**
 * Volume dos efeitos, bem abaixo do da musica.
 *
 * Nao passa pelo controle de volume da tela: aquele e da musica, e quem quer
 * silencio de aviso usa o botao de som, nao o mesmo slider.
 */
const SFX_GAIN = 0.14;

/** Fade de entrada e saida: sem isso todo toque estala. */
const RAMP = 0.012;

let enabled = true;

/** Liga/desliga os efeitos. Chamado pelo `SfxSync` a partir das preferencias. */
export function setSfxEnabled(value: boolean): void {
  enabled = value;
}

export function sfxEnabled(): boolean {
  return enabled;
}

/**
 * Toca um efeito, se der.
 *
 * Falha em silencio de proposito: efeito de interface nunca pode derrubar uma
 * jogada. Sem Web Audio, com o contexto suspenso ou com musica tocando, o jogo
 * segue exatamente igual.
 */
export function playSfx(name: SfxName): void {
  if (!enabled || typeof window === 'undefined') return;

  try {
    const engine = getEngine();

    // A regra principal: nunca por cima do trecho.
    if (engine.isPlaying) return;

    const ctx = engine.getContext();
    // Sem gesto do usuario o contexto fica suspenso. Nao chamamos resume aqui
    // para nao disputar com o audio do jogo — o efeito simplesmente nao sai.
    if (ctx.state !== 'running') return;

    const start = ctx.currentTime + 0.005;

    for (const tone of SFX[name]) {
      const oscillator = ctx.createOscillator();
      oscillator.type = tone.type ?? 'sine';
      oscillator.frequency.value = tone.freq;

      const gain = ctx.createGain();
      const peak = SFX_GAIN * (tone.gain ?? 1);
      const from = start + tone.at;
      const to = from + tone.duration;

      gain.gain.setValueAtTime(0, from);
      gain.gain.linearRampToValueAtTime(peak, from + RAMP);
      gain.gain.setValueAtTime(peak, Math.max(from + RAMP, to - RAMP));
      gain.gain.linearRampToValueAtTime(0, to);

      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(from);
      oscillator.stop(to + 0.02);
    }
  } catch {
    /* sem audio disponivel: o jogo nao depende disto */
  }
}
