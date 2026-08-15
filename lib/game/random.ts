/** PRNG deterministico (mulberry32) — mesma semente, mesma sequencia. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash de string estavel (FNV-1a de 32 bits). */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Fisher-Yates deterministico; nao altera o array recebido. */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const random = mulberry32(seed);
  const output = items.slice();
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = output[i] as T;
    const b = output[j] as T;
    output[i] = b;
    output[j] = a;
  }
  return output;
}
