/**
 * Valida data/songs.json antes do build. Quebra o build se o catalogo estiver
 * inconsistente — arquivo de audio faltando, id repetido, campo obrigatorio ausente.
 *
 *   npm run catalog:check
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { STEM_ORDER, type Song, type StemName } from '../lib/game/types';

const ROOT = resolve(__dirname, '..');
const CATALOG = join(ROOT, 'data', 'songs.json');
const PUBLIC_DIR = join(ROOT, 'public');

const errors: string[] = [];
const warnings: string[] = [];
let previews = 0;

function fail(id: string, message: string): void {
  errors.push(`[${id}] ${message}`);
}

function checkPublicFile(id: string, field: string, path: string): void {
  if (/^https?:\/\//.test(path)) return;
  if (!path.startsWith('/')) {
    fail(id, `${field}: caminho deve comecar com "/" (recebido: ${path})`);
    return;
  }
  if (!existsSync(join(PUBLIC_DIR, path))) {
    fail(id, `${field}: arquivo nao encontrado em public${path}`);
  }
}

function validate(song: Song, index: number, seen: Set<string>): void {
  const id = song.id ?? `#${index}`;

  for (const field of ['id', 'title', 'artist'] as const) {
    if (typeof song[field] !== 'string' || song[field].trim() === '') {
      fail(id, `campo obrigatorio ausente ou vazio: ${field}`);
    }
  }

  if (typeof song.year !== 'number' || !Number.isInteger(song.year)) {
    fail(id, 'campo obrigatorio ausente ou invalido: year');
  }

  if (seen.has(song.id)) fail(id, 'id duplicado');
  seen.add(song.id);

  for (const field of ['aliases', 'featuring', 'genres'] as const) {
    const list = song[field];
    if (list === undefined) continue;
    if (!Array.isArray(list) || list.some((item) => typeof item !== 'string' || !item.trim())) {
      fail(id, `${field} precisa ser uma lista de textos nao vazios`);
    }
  }

  if (song.cover) checkPublicFile(id, 'cover', song.cover);

  switch (song.source) {
    case 'synth': {
      const spec = song.synth;
      if (!spec) {
        fail(id, 'source "synth" exige o objeto synth');
        break;
      }
      if (!(spec.bpm > 0)) fail(id, 'synth.bpm deve ser maior que zero');
      if (!Number.isFinite(spec.root)) fail(id, 'synth.root deve ser uma nota MIDI');
      if (spec.mode !== 'minor' && spec.mode !== 'major') fail(id, 'synth.mode invalido');
      if (!Array.isArray(spec.progression) || spec.progression.length === 0) {
        fail(id, 'synth.progression precisa de ao menos um acorde');
      }
      break;
    }

    case 'local': {
      if (!song.clip) fail(id, 'source "local" exige clip');
      else checkPublicFile(id, 'clip', song.clip);

      const stems = song.stems;
      if (!stems) break; // sem stems: o modo Banda usa camadas de frequencia

      const missing = STEM_ORDER.filter((stem) => !stems[stem]);
      if (missing.length > 0) {
        warnings.push(
          `[${id}] stems faltando (${missing.join(', ')}): no modo Banda cai para camadas de frequencia`,
        );
      }
      for (const [stem, path] of Object.entries(stems) as Array<[StemName, string]>) {
        if (!STEM_ORDER.includes(stem)) fail(id, `stem desconhecida: ${stem}`);
        checkPublicFile(id, `stems.${stem}`, path);
      }
      break;
    }

    case 'preview': {
      if (song.clip && !/^https?:\/\//.test(song.clip)) {
        fail(id, 'source "preview" espera uma URL absoluta em clip (ou nenhum clip)');
      }
      if (song.previewId && !/^(deezer|itunes):\d+$/.test(song.previewId)) {
        fail(id, `previewId invalido: ${song.previewId} (esperado "deezer:123" ou "itunes:456")`);
      }
      if (!song.clip && !song.previewId) {
        warnings.push(`[${id}] sem clip e sem previewId: cai na busca por artista + titulo`);
      }

      previews += 1;
      break;
    }

    default:
      fail(id, `source invalido: ${String(song.source)}`);
  }
}

async function main(): Promise<void> {
  const raw = await readFile(CATALOG, 'utf8').catch(() => null);
  if (raw === null) {
    console.error(`✖ catalogo nao encontrado: ${CATALOG}`);
    process.exit(1);
  }

  let songs: Song[];
  try {
    songs = JSON.parse(raw) as Song[];
  } catch (error) {
    console.error(`✖ JSON invalido em data/songs.json: ${(error as Error).message}`);
    process.exit(1);
  }

  if (!Array.isArray(songs) || songs.length === 0) {
    console.error('✖ data/songs.json precisa ser um array com ao menos uma musica');
    process.exit(1);
  }

  const seen = new Set<string>();
  songs.forEach((song, index) => validate(song, index, seen));

  // No modo Banda, quem tem trilhas revela instrumento a instrumento;
  // o resto revela por faixa de frequencia. Os dois jogam.
  const comStems = songs.filter(
    (song) => song.source === 'synth' || STEM_ORDER.every((stem) => song.stems?.[stem]),
  ).length;

  for (const warning of warnings) console.warn(`⚠ ${warning}`);

  if (errors.length > 0) {
    for (const error of errors) console.error(`✖ ${error}`);
    console.error(`\n✖ catalogo invalido: ${errors.length} erro(s)`);
    process.exit(1);
  }

  console.log(`✔ catalogo ok: ${songs.length} musica(s)`);
  console.log(
    `  modo Banda: ${comStems} por instrumento, ${songs.length - comStems} por frequencia`,
  );
  if (previews > 0) console.log(`  ${previews} por previa de 30s (fonte externa)`);
}

void main();
