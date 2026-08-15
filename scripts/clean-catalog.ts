/**
 * Faxina do catalogo, sem precisar reimportar tudo.
 *
 *   npm run catalog:clean -- --remover "SEVENTEEN,EXO"   # tira esses artistas
 *   npm run catalog:clean                                 # so normaliza e checa
 *
 * Sempre: apara espacos sobrando (o Deezer devolve "DAY6 ") e remove entradas
 * duplicadas por id. A comparacao de nomes ignora acentos e caixa.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { normalize } from '../lib/game/normalize';
import type { Song } from '../lib/game/types';

const CATALOG = resolve(__dirname, '..', 'data', 'songs.json');

function parseRemover(argv: string[]): Set<string> {
  const index = argv.indexOf('--remover');
  const raw = index >= 0 ? (argv[index + 1] ?? '') : '';
  return new Set(
    raw
      .split(',')
      .map((nome) => normalize(nome))
      .filter(Boolean),
  );
}

async function main(): Promise<void> {
  const remover = parseRemover(process.argv.slice(2));
  const songs = JSON.parse(await readFile(CATALOG, 'utf8')) as Song[];

  const porId = new Map<string, Song>();
  const removidos = new Map<string, number>();
  let aparados = 0;
  let totalRemovido = 0;

  for (const song of songs) {
    const artist = song.artist.trim();
    const title = song.title.trim();
    if (artist !== song.artist || title !== song.title) aparados += 1;

    if (remover.has(normalize(artist))) {
      removidos.set(artist, (removidos.get(artist) ?? 0) + 1);
      totalRemovido += 1;
      continue;
    }

    porId.set(song.id, { ...song, artist, title });
  }

  const limpo = [...porId.values()];
  await writeFile(CATALOG, `${JSON.stringify(limpo, null, 2)}\n`, 'utf8');

  // Duplicados sao o que sobra depois de descontar os removidos por artista.
  const duplicados = songs.length - totalRemovido - limpo.length;
  for (const [artista, quantas] of [...removidos].sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${artista}: ${quantas}`);
  }

  const pedidosSemMatch = [...remover].filter(
    (alvo) => ![...removidos.keys()].some((nome) => normalize(nome) === alvo),
  );
  for (const alvo of pedidosSemMatch) {
    console.warn(`⚠ nao havia ninguem no catalogo com o nome "${alvo}"`);
  }

  console.log(
    `✔ ${songs.length} -> ${limpo.length} musica(s)` +
      ` | ${aparados} nome(s) aparado(s)` +
      (duplicados > 0 ? ` | ${duplicados} duplicado(s)` : ''),
  );
}

void main();
