import { mulberry32 } from '@/lib/game/random';
import { STEM_ORDER, type StemName, type SynthSpec } from '@/lib/game/types';

/**
 * Gerador procedural de faixas — o placeholder que faz o jogo rodar sem nenhum
 * arquivo de audio externo. Tudo aqui e deterministico: a mesma spec produz
 * exatamente as mesmas amostras.
 */

/** Duracao das faixas geradas, em segundos (o modo Trecho precisa de 16s). */
export const SYNTH_DURATION = 17;

const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/** Qualidade do acorde por grau, para a harmonia nao soar aleatoria. */
const MINOR_QUALITIES: Record<number, 'min' | 'maj' | 'dim'> = {
  0: 'min',
  2: 'dim',
  3: 'maj',
  5: 'min',
  7: 'min',
  8: 'maj',
  10: 'maj',
};

const MAJOR_QUALITIES: Record<number, 'min' | 'maj' | 'dim'> = {
  0: 'maj',
  2: 'min',
  4: 'min',
  5: 'maj',
  7: 'maj',
  9: 'min',
  11: 'dim',
};

const GAINS: Record<StemName, number> = {
  drums: 0.9,
  bass: 0.8,
  guitar: 0.5,
  keys: 0.34,
  other: 0.3,
  vocals: 0.5,
};

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function chordTones(spec: SynthSpec, offset: number): number[] {
  const table = spec.mode === 'minor' ? MINOR_QUALITIES : MAJOR_QUALITIES;
  const quality = table[((offset % 12) + 12) % 12] ?? (spec.mode === 'minor' ? 'min' : 'maj');
  const third = quality === 'maj' ? 4 : 3;
  const fifth = quality === 'dim' ? 6 : 7;
  const root = spec.root + offset;
  return [root, root + third, root + fifth];
}

function scaleNote(spec: SynthSpec, degree: number): number {
  const scale = spec.mode === 'minor' ? MINOR_SCALE : MAJOR_SCALE;
  const size = scale.length;
  const index = ((degree % size) + size) % size;
  const octave = Math.floor(degree / size);
  return spec.root + (scale[index] ?? 0) + octave * 12;
}

function mixInto(buffer: Float32Array, index: number, value: number): void {
  if (index < 0 || index >= buffer.length) return;
  buffer[index] = (buffer[index] ?? 0) + value;
}

interface Voice {
  freq: number;
  start: number;
  duration: number;
  gain: number;
  /** 0 = seno, 1 = triangulo, 2 = quadrada suave, 3 = dente de serra */
  wave: 0 | 1 | 2 | 3;
  attack: number;
  vibrato?: number;
}

function wave(shape: Voice['wave'], phase: number): number {
  const t = phase % 1;
  switch (shape) {
    case 0:
      return Math.sin(2 * Math.PI * t);
    case 1:
      return 4 * Math.abs(t - 0.5) - 1;
    case 2:
      return Math.tanh(Math.sin(2 * Math.PI * t) * 3) * 0.7;
    default:
      return (2 * t - 1) * 0.6;
  }
}

function renderVoice(buffer: Float32Array, voice: Voice, sampleRate: number): void {
  const startSample = Math.floor(voice.start * sampleRate);
  const totalSamples = Math.floor(voice.duration * sampleRate);
  const attackSamples = Math.max(1, Math.floor(voice.attack * sampleRate));
  const decay = 3.2 / Math.max(voice.duration, 0.05);

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const attack = i < attackSamples ? i / attackSamples : 1;
    const release = Math.exp(-decay * t);
    const vibrato = voice.vibrato ? 1 + voice.vibrato * Math.sin(2 * Math.PI * 5.2 * t) : 1;
    const sample = wave(voice.wave, voice.freq * vibrato * t) * voice.gain * attack * release;
    mixInto(buffer, startSample + i, sample);
  }
}

function renderKick(buffer: Float32Array, start: number, sampleRate: number, gain: number): void {
  const startSample = Math.floor(start * sampleRate);
  const totalSamples = Math.floor(0.32 * sampleRate);
  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const freq = 45 + 95 * Math.exp(-28 * t);
    const env = Math.exp(-9 * t);
    mixInto(buffer, startSample + i, Math.sin(2 * Math.PI * freq * t) * env * gain);
  }
}

function renderNoise(
  buffer: Float32Array,
  start: number,
  duration: number,
  sampleRate: number,
  gain: number,
  decay: number,
  random: () => number,
  tone: number,
): void {
  const startSample = Math.floor(start * sampleRate);
  const totalSamples = Math.floor(duration * sampleRate);
  let previous = 0;
  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const white = random() * 2 - 1;
    // Filtro de 1a ordem: tone alto = mais agudo (chimbal), baixo = mais corpo (caixa).
    previous = previous + tone * (white - previous);
    const filtered = tone >= 0.5 ? white - previous : previous;
    mixInto(buffer, startSample + i, filtered * Math.exp(-decay * t) * gain);
  }
}

interface Grid {
  beat: number;
  bar: number;
  bars: number;
}

function grid(spec: SynthSpec): Grid {
  const beat = 60 / spec.bpm;
  const bar = beat * 4;
  return { beat, bar, bars: Math.ceil(SYNTH_DURATION / bar) };
}

function chordForBar(spec: SynthSpec, barIndex: number): number[] {
  const offset = spec.progression[barIndex % spec.progression.length] ?? 0;
  return chordTones(spec, offset);
}

/** Renderiza uma trilha isolada como amostras mono normalizadas. */
export function renderStem(spec: SynthSpec, stem: StemName, sampleRate: number): Float32Array {
  const buffer = new Float32Array(Math.ceil(SYNTH_DURATION * sampleRate));
  const { beat, bar, bars } = grid(spec);
  const random = mulberry32(spec.seed + stem.length * 7919);
  const gain = GAINS[stem];

  for (let barIndex = 0; barIndex < bars; barIndex += 1) {
    const barStart = barIndex * bar;
    const tones = chordForBar(spec, barIndex);
    const root = tones[0] ?? spec.root;

    switch (stem) {
      case 'drums': {
        for (let b = 0; b < 4; b += 1) {
          const at = barStart + b * beat;
          if (b === 0 || b === 2) renderKick(buffer, at, sampleRate, gain);
          if (b === 2 && random() > 0.6) renderKick(buffer, at + beat * 0.5, sampleRate, gain * 0.6);
          if (b === 1 || b === 3) {
            renderNoise(buffer, at, 0.22, sampleRate, gain * 0.42, 24, random, 0.22);
          }
          for (let eighth = 0; eighth < 2; eighth += 1) {
            const hatAt = at + eighth * beat * 0.5;
            const velocity = eighth === 0 ? 0.16 : 0.1;
            renderNoise(buffer, hatAt, 0.06, sampleRate, gain * velocity, 90, random, 0.85);
          }
        }
        break;
      }

      case 'bass': {
        const pattern = [0, 1.5, 2, 3.5];
        for (const position of pattern) {
          renderVoice(
            buffer,
            {
              freq: midiToFreq(root - 12),
              start: barStart + position * beat,
              duration: beat * 0.9,
              gain: gain * 0.5,
              wave: 3,
              attack: 0.004,
            },
            sampleRate,
          );
        }
        break;
      }

      case 'guitar': {
        for (const position of [0, 2.5]) {
          tones.forEach((note, i) => {
            renderVoice(
              buffer,
              {
                freq: midiToFreq(note + 12),
                start: barStart + position * beat + i * 0.014,
                duration: beat * 1.4,
                gain: gain * 0.3,
                wave: 2,
                attack: 0.006,
              },
              sampleRate,
            );
          });
        }
        break;
      }

      case 'keys': {
        tones.forEach((note) => {
          renderVoice(
            buffer,
            {
              freq: midiToFreq(note),
              start: barStart,
              duration: bar,
              gain: gain * 0.28,
              wave: 1,
              attack: 0.25,
            },
            sampleRate,
          );
        });
        break;
      }

      case 'other': {
        for (let step = 0; step < 16; step += 1) {
          if (random() < 0.35) continue;
          const note = tones[step % tones.length] ?? root;
          renderVoice(
            buffer,
            {
              freq: midiToFreq(note + 24),
              start: barStart + step * beat * 0.25,
              duration: beat * 0.3,
              gain: gain * 0.22,
              wave: 1,
              attack: 0.003,
            },
            sampleRate,
          );
        }
        break;
      }

      case 'vocals': {
        const phrase = [0, 2, 4, 3, 2, 0, 4, 5];
        for (let note = 0; note < 4; note += 1) {
          const degree = phrase[(barIndex * 2 + note) % phrase.length] ?? 0;
          const length = random() > 0.7 ? beat * 1.6 : beat * 0.85;
          renderVoice(
            buffer,
            {
              freq: midiToFreq(scaleNote(spec, degree + 14)),
              start: barStart + note * beat,
              duration: length,
              gain: gain * 0.3,
              wave: 0,
              attack: 0.05,
              vibrato: 0.006,
            },
            sampleRate,
          );
        }
        break;
      }
    }
  }

  return softClip(buffer);
}

/** Mixagem completa — e o "clipe" das musicas geradas (modo Trecho). */
export function renderMix(spec: SynthSpec, sampleRate: number): Float32Array {
  const stems = STEM_ORDER.map((stem) => renderStem(spec, stem, sampleRate));
  const length = stems[0]?.length ?? 0;
  const mix = new Float32Array(length);

  for (const stem of stems) {
    for (let i = 0; i < length; i += 1) {
      mix[i] = (mix[i] ?? 0) + (stem[i] ?? 0) * 0.62;
    }
  }

  return softClip(mix);
}

function softClip(buffer: Float32Array): Float32Array {
  for (let i = 0; i < buffer.length; i += 1) {
    buffer[i] = Math.tanh((buffer[i] ?? 0) * 1.2);
  }
  return buffer;
}
