/** Marcas combinantes (acentos) produzidas pela decomposicao NFD. */
const COMBINING_MARKS = /\p{M}/gu;

/**
 * Normaliza texto para busca e comparacao de palpites:
 * minusculas, sem acentos, sem pontuacao e com espacos colapsados.
 */
export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Divide a consulta em termos para busca "todos os termos precisam aparecer". */
export function terms(input: string): string[] {
  const normalized = normalize(input);
  return normalized.length === 0 ? [] : normalized.split(' ');
}

/** Verifica se `haystack` contem todos os termos de `query`. */
export function matchesAllTerms(haystack: string, query: string): boolean {
  const list = terms(query);
  if (list.length === 0) return false;
  return list.every((term) => haystack.includes(term));
}
