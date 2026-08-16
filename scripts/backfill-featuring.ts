/**
 * Preenche o campo `featuring` do catalogo com os artistas convidados.
 *
 * Existe porque o titulo do Deezer nem sempre carrega a participacao: "Uptown
 * Funk (feat. Bruno Mars)" vem completo, mas "Sua Cara" vem seco — e sem os
 * creditos ninguem acha a musica procurando por "Anitta". Os convidados so
 * aparecem em /track/{id}, que os endpoints de busca e de chart nao trazem;
 * por isso este passo e separado do `catalog:import`, que ficaria duas vezes
 * mais lento se buscasse faixa por faixa.
 *
 * O script SO ACRESCENTA campo: nao mexe em id, nem na ordem do array, nem em
 * nenhum valor existente. Isso importa porque o sorteio do puzzle diario deriva
 * da lista de musicas — mudar a ordem faria todo mundo perder a partida do dia.
 *
 *   npm run catalog:featuring              # preenche o que falta
 *   npm run catalog:featuring -- --forcar  # refaz tudo, inclusive o ja preenchido
 *   npm run catalog:featuring -- --limite 50
 */
import { readFile, writeFile } from 'node:fs/promises';
import { normalize } from '../lib/game/normalize';
import type { Song } from '../lib/game/types';

const DEFAULT_FILE = 'data/songs.json';

/** O Deezer aceita cerca de 50 chamadas a cada 5s; 110ms deixa folga. */
const THROTTLE_MS = 110;

interface Options {
  arquivo: string;
  forcar: boolean;
  limite: number;
}

function parseArgs(argv: string[]): Options {
  const get = (flag: string): string | undefined => {
    const at = argv.indexOf(flag);
    return at >= 0 ? argv[at + 1] : undefined;
  };

  const limite = Number(get('--limite'));
  return {
    arquivo: get('--arquivo') ?? DEFAULT_FILE,
    forcar: argv.includes('--forcar'),
    limite: Number.isInteger(limite) && limite > 0 ? limite : Number.POSITIVE_INFINITY,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Id numerico da faixa no Deezer, ou null se a musica nao vier de la. */
function deezerId(song: Song): string | null {
  const fromPreview = /^deezer:(\d+)$/.exec(song.previewId ?? '');
  if (fromPreview?.[1]) return fromPreview[1];
  const fromId = /^deezer-(\d+)$/.exec(song.id);
  return fromId?.[1] ?? null;
}

/**
 * Convidados que valem a pena guardar.
 *
 * Fora o artista principal (obvio) e quem o titulo ja denuncia — nesses casos a
 * busca ja encontrava, e repetir o nome so incharia o catalogo.
 */
export function guestsOf(
  song: Pick<Song, 'artist' | 'title'>,
  contributors: readonly string[],
): string[] {
  const known = normalize(`${song.artist} ${song.title}`);
  const seen = new Set<string>();
  const guests: string[] = [];

  for (const raw of contributors) {
    const name = raw.trim();
    const key = normalize(name);
    if (!key || seen.has(key) || known.includes(key)) continue;
    seen.add(key);
    guests.push(name);
  }

  return guests;
}

interface DeezerTrackDetail {
  contributors?: Array<{ name?: string }>;
}

async function contributorsOf(trackId: string): Promise<string[] | null> {
  const response = await fetch(`https://api.deezer.com/track/${trackId}`, {
    headers: { 'user-agent': 'guessthemusic-featuring' },
  });
  if (!response.ok) return null;

  const detail = (await response.json()) as DeezerTrackDetail & { error?: unknown };
  if (detail.error) return null;

  return (detail.contributors ?? [])
    .map((entry) => entry.name?.trim() ?? '')
    .filter((name) => name.length > 0);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const songs = JSON.parse(await readFile(options.arquivo, 'utf8')) as Song[];

  const pendentes = songs.filter(
    (song) => deezerId(song) !== null && (options.forcar || song.featuring === undefined),
  );
  const alvo = pendentes.slice(0, options.limite);

  console.log(`${songs.length} musicas no catalogo`);
  console.log(
    `${alvo.length} a consultar no Deezer (~${Math.ceil((alvo.length * THROTTLE_MS) / 1000)}s)`,
  );
  if (alvo.length === 0) return;

  const encontrados = new Map<string, string[]>();
  let falhas = 0;

  for (const [i, song] of alvo.entries()) {
    const trackId = deezerId(song);
    if (!trackId) continue;

    try {
      const contributors = await contributorsOf(trackId);
      if (contributors === null) falhas += 1;
      else {
        const guests = guestsOf(song, contributors);
        if (guests.length > 0) encontrados.set(song.id, guests);
      }
    } catch {
      falhas += 1;
    }

    if ((i + 1) % 100 === 0 || i + 1 === alvo.length) {
      console.log(`  ${i + 1}/${alvo.length} — ${encontrados.size} com participacao`);
    }
    await sleep(THROTTLE_MS);
  }

  // Reescreve preservando ordem e todos os campos: so o featuring entra.
  const atualizado = songs.map((song) => {
    const guests = encontrados.get(song.id);
    return guests ? { ...song, featuring: guests } : song;
  });

  await writeFile(options.arquivo, `${JSON.stringify(atualizado, null, 2)}\n`, 'utf8');

  console.log(`\n${encontrados.size} musicas ganharam participacao`);
  if (falhas > 0) console.log(`${falhas} faixas nao responderam (rode de novo para tentar essas)`);

  const exemplos = [...encontrados.entries()].slice(0, 5);
  for (const [id, guests] of exemplos) {
    const song = songs.find((entry) => entry.id === id);
    console.log(`  ${song?.artist} - ${song?.title} -> ${guests.join(', ')}`);
  }
}

// Sem top-level await: o tsx roda isto como CommonJS.
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
