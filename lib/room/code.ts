/**
 * Alfabeto do codigo da sala: sem I, O, 0 e 1.
 *
 * O codigo e ditado em voz alta ou no grupo do zap — as letras que se confundem
 * com numeros custam mais do que valem os 4 simbolos a mais.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export const ROOM_CODE_LENGTH = 4;

/** Sorteia um codigo novo. O `random` injetavel deixa o teste deterministico. */
export function randomRoomCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    const index = Math.min(ALPHABET.length - 1, Math.floor(random() * ALPHABET.length));
    code += ALPHABET[index];
  }
  return code;
}

/**
 * Limpa o que a pessoa digitou: maiusculas, sem espacos e sem os simbolos que
 * nao existem no alfabeto — colar "sala abcd" ou "a-b-c-d" precisa funcionar.
 */
export function normalizeRoomCode(input: string): string {
  return [...input.toUpperCase()]
    .filter((char) => ALPHABET.includes(char))
    .slice(0, ROOM_CODE_LENGTH)
    .join('');
}

export const isValidRoomCode = (code: string): boolean =>
  code.length === ROOM_CODE_LENGTH && [...code].every((char) => ALPHABET.includes(char));
