/**
 * Importa musicas reais para o catalogo usando APIs publicas e gratuitas, sem
 * chave e sem hospedar audio: as previas oficiais de 30s ficam no CDN da fonte.
 *
 *   npm run catalog:import -- --fonte deezer --pais br --limite 50
 *   npm run catalog:import -- --fonte itunes --pais us --limite 25 --juntar
 *   npm run catalog:import -- --fonte deezer --busca "rock nacional" --limite 30
 *
 * Opcoes:
 *   --fonte    deezer (padrao) | itunes
 *   --pais     codigo ISO de 2 letras (padrao: br)
 *   --limite   quantas musicas importar (padrao: 50)
 *   --busca    importa a partir de uma busca em vez do chart do pais
 *   --juntar   mantem o catalogo atual e acrescenta as novas (padrao: substitui)
 *   --saida    arquivo de destino (padrao: data/songs.json)
 *
 * Importante: previas nao tem trilhas isoladas, entao as musicas importadas
 * valem para o modo Trecho. O modo Banda continua exigindo stems (synth/local).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { normalize } from '../lib/game/normalize';
import type { Song } from '../lib/game/types';

const ROOT = resolve(__dirname, '..');

/**
 * Listas curadas de artistas, usadas com --preset. A chave vira o genero da
 * musica no catalogo, que alimenta o filtro do modo livre.
 */
const PRESETS: Record<string, string[]> = {
  rock: [
    'Queen',
    'The Beatles',
    'Led Zeppelin',
    'Pink Floyd',
    'The Rolling Stones',
    'AC/DC',
    'Guns N Roses',
    'Nirvana',
    'Metallica',
    'Aerosmith',
    'Bon Jovi',
    'The Police',
    'U2',
    'Oasis',
    'Radiohead',
    'Red Hot Chili Peppers',
    'Green Day',
    'Linkin Park',
    'Coldplay',
    'Imagine Dragons',
    'David Bowie',
    'Eagles',
    'a-ha',
    'The Who',
    'Deep Purple',
    'Black Sabbath',
    'Creedence Clearwater Revival',
    'Fleetwood Mac',
    'The Doors',
    'Journey',
    'Toto',
    'Scorpions',
    'Dire Straits',
    'Bryan Adams',
    'Foo Fighters',
    'Pearl Jam',
    'The Killers',
    'Arctic Monkeys',
    'Muse',
    'The Strokes',
    'blink-182',
    'Paramore',
    'Evanescence',
    'My Chemical Romance',
    'Fall Out Boy',
    'Panic! At The Disco',
    'Twenty One Pilots',
    'System of a Down',
    'Rage Against The Machine',
    'The Cure',
    'Nickelback',
  ],
  pop: [
    'Michael Jackson',
    'ABBA',
    'Madonna',
    'Whitney Houston',
    'Prince',
    'Stevie Wonder',
    'Bee Gees',
    'Elvis Presley',
    'Backstreet Boys',
    'Britney Spears',
    'Amy Winehouse',
    'Adele',
    'Bruno Mars',
    'Rihanna',
    'Lady Gaga',
    'Beyonce',
    'Maroon 5',
    'Ed Sheeran',
    'Taylor Swift',
    'The Weeknd',
    'Dua Lipa',
    'Billie Eilish',
    'Ariana Grande',
    'Miley Cyrus',
    'Charli xcx',
    'Mariah Carey',
    'Elton John',
    'Katy Perry',
    'Justin Bieber',
    'Justin Timberlake',
    'Shakira',
    'Sia',
    'Lorde',
    'Olivia Rodrigo',
    'Sabrina Carpenter',
    'Selena Gomez',
    'Camila Cabello',
    'Halsey',
    'SZA',
    'Harry Styles',
    'Lana Del Rey',
    'P!nk',
    'Christina Aguilera',
    'Kelly Clarkson',
    'Avril Lavigne',
    'Jason Derulo',
    'OneRepublic',
    'Sam Smith',
    'Shawn Mendes',
    'Alicia Keys',
    'Meghan Trainor',
    'Jonas Brothers',
    'Cyndi Lauper',
    'George Michael',
    'Phil Collins',
    'Lionel Richie',
    'Alex Warren',
    'Pabllo Vittar',
  ],

  hiphop: [
    'Eminem',
    'Drake',
    'Kendrick Lamar',
    'Kanye West',
    'Travis Scott',
    'Post Malone',
    'Cardi B',
    'Nicki Minaj',
    'Snoop Dogg',
    'Dr. Dre',
    '2Pac',
    'The Notorious B.I.G.',
    'JAY-Z',
    'Lil Nas X',
    'Doja Cat',
    'Megan Thee Stallion',
    'Childish Gambino',
    'J. Cole',
    'Future',
    '21 Savage',
    'Tyler, The Creator',
    'Wiz Khalifa',
    'Macklemore',
    'Flo Rida',
    'Pitbull',
    'Black Eyed Peas',
    'OutKast',
    'Ice Cube',
    '50 Cent',
    'Metro Boomin',
  ],

  eletronica: [
    'Daft Punk',
    'Calvin Harris',
    'Martin Garrix',
    'Kygo',
    'David Guetta',
    'Avicii',
    'Swedish House Mafia',
    'Alan Walker',
    'Marshmello',
    'Tiesto',
    'Zedd',
    'Skrillex',
    'deadmau5',
    'The Chainsmokers',
    'Alok',
    'Robin Schulz',
    'Major Lazer',
    'Disclosure',
    'Fatboy Slim',
    'Mark Ronson',
    'Diplo',
  ],
  kpop: [
    'BTS',
    'BLACKPINK',
    'TWICE',
    'Stray Kids',
    'NewJeans',
    'aespa',
    'IVE',
    'LE SSERAFIM',
    'ITZY',
    'i-dle',
    'BIGBANG',
    '2NE1',
    "Girls' Generation",
    'ATEEZ',
    'IU',
    'PSY',
    'Jungkook',
    'Jimin',
    // "LISA" fica de fora de proposito: colide com a LiSA japonesa (anime),
    // que tem mais fas no Deezer e venceria o desempate.
    'JENNIE',
    'ROSE',
    'BABYMONSTER',
    'KATSEYE',
    'BOYNEXTDOOR',
    'RIIZE',
    'ZEROBASEONE',
    'TREASURE',
    'THE BOYZ',
    'STAYC',
    'NMIXX',
    'G-DRAGON',
    'Taeyang',
    'Zico',
    'Agust D',
    'j-hope',
    'RM',
    'Taeyeon',
    'CHUNG HA',
    'SUNMI',
    'HyunA',
    'CL',
    'Rain',
  ],
};

/** Mantido por compatibilidade: "classicos" e a uniao de rock + pop. */
const CLASSICOS_LEGADO = [
  'Queen',
  'The Beatles',
  'Michael Jackson',
  'ABBA',
  'Elvis Presley',
  'Led Zeppelin',
  'Pink Floyd',
  'The Rolling Stones',
  'David Bowie',
  'Prince',
  'Stevie Wonder',
  'Bee Gees',
  'Eagles',
  'AC/DC',
  'Guns N Roses',
  'Bon Jovi',
  'Nirvana',
  'Metallica',
  'Aerosmith',
  'a-ha',
  'The Police',
  'U2',
  'Madonna',
  'Whitney Houston',
  'Backstreet Boys',
  'Britney Spears',
  'Oasis',
  'Radiohead',
  'Red Hot Chili Peppers',
  'Green Day',
  'Linkin Park',
  'Coldplay',
  'Eminem',
  'Amy Winehouse',
  'Daft Punk',
  'Adele',
  'Bruno Mars',
  'Rihanna',
  'Lady Gaga',
  'Beyonce',
  'Maroon 5',
  'Imagine Dragons',
  'Ed Sheeran',
  'Taylor Swift',
  'The Weeknd',
  'Dua Lipa',
  'Billie Eilish',
];

PRESETS.classicos = CLASSICOS_LEGADO;

const presetArtists = (name: string): string[] => PRESETS[name] ?? [];

/** Genero gravado no catalogo: o preset define, salvo se --genero disser outro. */
function generoDe(options: Options): string | undefined {
  if (options.genero) return options.genero;
  if (!options.preset || options.preset === 'classicos') return undefined;
  return options.preset;
}

/** Versoes que atrapalham o reconhecimento: ao vivo, remix, karaoke... */
const VERSAO_RUIM = /\b(live|ao vivo|remix|karaoke|instrumental|cover|acoustic|demo|reprise)\b/i;

interface Options {
  fonte: 'deezer' | 'itunes';
  pais: string;
  limite: number;
  busca: string | null;
  preset: string | null;
  /** Lista avulsa de artistas, separada por virgula (alternativa ao preset). */
  artistas: string[];
  /** Genero gravado nas musicas importadas (filtro do modo livre). */
  genero: string | null;
  porArtista: number;
  juntar: boolean;
  saida: string;
}

function parseArgs(argv: string[]): Options {
  const get = (name: string): string | null => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? (argv[index + 1] ?? null) : null;
  };

  const fonte = get('fonte') === 'itunes' ? 'itunes' : 'deezer';
  const limite = Number(get('limite') ?? 50);
  const porArtista = Number(get('por-artista') ?? 3);

  return {
    fonte,
    pais: (get('pais') ?? 'br').toLowerCase(),
    limite: Number.isFinite(limite) && limite > 0 ? Math.min(limite, 200) : 50,
    busca: get('busca'),
    preset: get('preset'),
    artistas: (get('artistas') ?? '')
      .split(',')
      .map((nome) => nome.trim())
      .filter(Boolean),
    genero: get('genero'),
    porArtista: Number.isFinite(porArtista) && porArtista > 0 ? Math.min(porArtista, 30) : 3,
    juntar: argv.includes('--juntar'),
    saida: get('saida') ?? join('data', 'songs.json'),
  };
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { 'user-agent': 'guessthemusic-importer' } });
  if (!response.ok) throw new Error(`${response.status} em ${url}`);
  return (await response.json()) as T;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Ano a partir de "2016-03-04" ou "2016-03-04T12:00:00Z". */
function yearOf(date: string | undefined): number {
  const year = Number(String(date ?? '').slice(0, 4));
  return Number.isInteger(year) && year > 1900 ? year : new Date().getFullYear();
}

/* ------------------------------- Deezer -------------------------------- */

interface DeezerTrack {
  id: number;
  title: string;
  title_short?: string;
  preview?: string;
  artist?: { name?: string };
  album?: { cover_medium?: string; id?: number };
}

/**
 * Ano de lancamento. O endpoint de top tracks nao traz a data, entao ela vem
 * do album — e o cache evita repetir a consulta a cada faixa do mesmo disco,
 * que e o caso comum quando se importa muitas musicas por artista.
 */
const anoPorAlbum = new Map<number, number>();

async function anoDaFaixa(track: DeezerTrack): Promise<number> {
  const albumId = track.album?.id;
  if (albumId !== undefined) {
    const cacheado = anoPorAlbum.get(albumId);
    if (cacheado !== undefined) return cacheado;

    try {
      const album = await getJson<{ release_date?: string }>(
        `https://api.deezer.com/album/${albumId}`,
      );
      const ano = yearOf(album.release_date);
      anoPorAlbum.set(albumId, ano);
      await sleep(110);
      return ano;
    } catch {
      /* cai no fallback abaixo */
    }
  }

  try {
    const detalhe = await getJson<{ release_date?: string }>(
      `https://api.deezer.com/track/${track.id}`,
    );
    await sleep(110);
    return yearOf(detalhe.release_date);
  } catch {
    return new Date().getFullYear();
  }
}

/**
 * Faixas mais tocadas de cada artista do preset.
 *
 * Usa /search/artist + /artist/{id}/top, e nao `q=artist:"Nome"`: a busca por
 * texto do Deezer nao filtra de verdade e traz bandas cover e homonimos
 * (ex.: "Psycho Killer" de uma banda tributo em vez do Talking Heads).
 */
async function deezerPreset(options: Options, artistas: string[]): Promise<DeezerTrack[]> {
  const tracks: DeezerTrack[] = [];

  for (const artista of artistas) {
    try {
      const busca = await getJson<{ data?: Array<{ id: number; name: string; nb_fan?: number }> }>(
        `https://api.deezer.com/search/artist?limit=10&q=${encodeURIComponent(artista)}`,
      );

      // Confere o nome (evita tributo/homonimo) e, entre os homonimos exatos,
      // fica com o de mais fas — "Lisa" e "Rose" existem as dezenas no Deezer.
      const alvo = normalize(artista);
      const encontrado = (busca.data ?? [])
        .filter((item) => normalize(item.name) === alvo)
        .sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0))[0];

      if (!encontrado) {
        console.warn(`⚠ artista nao encontrado com nome exato: ${artista}`);
        await sleep(150);
        continue;
      }

      // Pede com folga: o filtro de ao vivo/remix derruba parte das faixas.
      const limite = Math.min(100, Math.max(15, options.porArtista * 3));
      const top = await getJson<{ data?: DeezerTrack[] }>(
        `https://api.deezer.com/artist/${encontrado.id}/top?limit=${limite}`,
      );
      const boas = (top.data ?? [])
        .filter((track) => track.preview && !VERSAO_RUIM.test(track.title ?? ''))
        .slice(0, options.porArtista);

      tracks.push(...boas);
      console.log(`  ${encontrado.name}: ${boas.length}`);
    } catch {
      console.warn(`⚠ falha ao buscar ${artista}`);
    }
    await sleep(150);
  }

  return tracks;
}

async function fromDeezer(options: Options): Promise<Song[]> {
  let tracks: DeezerTrack[];

  if (options.artistas.length > 0) {
    tracks = await deezerPreset(options, options.artistas);
  } else if (options.preset) {
    tracks = await deezerPreset(options, presetArtists(options.preset));
  } else {
    const url = options.busca
      ? `https://api.deezer.com/search?limit=${options.limite}&q=${encodeURIComponent(options.busca)}`
      : `https://api.deezer.com/chart/0/tracks?limit=${options.limite}`;
    tracks = (await getJson<{ data?: DeezerTrack[] }>(url)).data ?? [];
  }

  const songs: Song[] = [];
  const vistas = new Set<string>();

  for (const track of tracks) {
    if (!track.preview || !track.artist?.name) continue;

    // Evita "Song" e "Song - Remastered 2011" ocupando duas vagas.
    const chave = normalize(`${track.artist.name} ${track.title_short ?? track.title}`);
    if (vistas.has(chave)) continue;
    vistas.add(chave);

    const year = await anoDaFaixa(track);
    const genero = generoDe(options);
    songs.push({
      id: `deezer-${track.id}`,
      // trim: o Deezer devolve alguns nomes com espaco sobrando ("DAY6 ").
      title: (track.title_short ?? track.title).trim(),
      artist: track.artist.name.trim(),
      year,
      ...(genero ? { genre: genero } : {}),
      source: 'preview',
      // Sem `clip`: a URL do Deezer e assinada e expira em cerca de um dia.
      // Guardamos a faixa; /api/preview resolve a URL fresca na hora de tocar.
      previewId: `deezer:${track.id}`,
      ...(track.album?.cover_medium ? { cover: track.album.cover_medium } : {}),
    });
  }

  return songs;
}

/* ------------------------------- iTunes -------------------------------- */

interface ITunesTrack {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  previewUrl?: string;
  releaseDate?: string;
  artworkUrl100?: string;
}

async function fromItunes(options: Options): Promise<Song[]> {
  if (options.busca) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(options.busca)}&entity=song&limit=${options.limite}`;
    const payload = await getJson<{ results?: ITunesTrack[] }>(url);
    return (payload.results ?? []).flatMap(toItunesSong);
  }

  // O chart do iTunes nao traz previewUrl: pega os titulos e resolve um a um.
  const chart = await getJson<{ feed?: { results?: Array<{ name: string; artistName: string }> } }>(
    `https://rss.marketingtools.apple.com/api/v2/${options.pais}/music/most-played/${options.limite}/songs.json`,
  );

  const songs: Song[] = [];
  for (const entry of chart.feed?.results ?? []) {
    const term = `${entry.artistName} ${entry.name}`;
    try {
      const payload = await getJson<{ results?: ITunesTrack[] }>(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=1`,
      );
      songs.push(...(payload.results ?? []).flatMap(toItunesSong));
    } catch {
      console.warn(`⚠ nao encontrado no iTunes: ${term}`);
    }
    // A Search API do iTunes pede ~20 chamadas/minuto.
    await sleep(3200);
  }

  return songs;
}

function toItunesSong(track: ITunesTrack): Song[] {
  if (!track.trackId || !track.trackName || !track.artistName || !track.previewUrl) return [];
  return [
    {
      id: `itunes-${track.trackId}`,
      title: track.trackName,
      artist: track.artistName,
      year: yearOf(track.releaseDate),
      source: 'preview',
      // A URL do iTunes nao expira, entao vale guardar (evita uma ida a API).
      clip: track.previewUrl,
      previewId: `itunes:${track.trackId}`,
      ...(track.artworkUrl100 ? { cover: track.artworkUrl100.replace('100x100', '300x300') } : {}),
    },
  ];
}

/* -------------------------------- main --------------------------------- */

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  // resolve (e nao join) para aceitar tambem caminhos absolutos em --saida.
  const destino = resolve(ROOT, options.saida);

  if (options.preset && presetArtists(options.preset).length === 0) {
    console.error(
      `✖ preset desconhecido: ${options.preset} (disponiveis: ${Object.keys(PRESETS).join(', ')})`,
    );
    process.exit(1);
  }

  const origem = options.artistas.length
    ? `artistas avulsos (${options.artistas.length} x ${options.porArtista})`
    : options.preset
      ? `preset ${options.preset} (${presetArtists(options.preset).length} artistas x ${options.porArtista})`
      : options.busca
      ? `busca: "${options.busca}"`
      : `chart ${options.pais.toUpperCase()}`;
  console.log(`→ importando de ${options.fonte} — ${origem}`);

  const importadas = options.fonte === 'deezer' ? await fromDeezer(options) : await fromItunes(options);
  if (importadas.length === 0) {
    console.error('✖ nenhuma musica com previa disponivel foi encontrada');
    process.exit(1);
  }

  const atuais: Song[] = options.juntar
    ? ((JSON.parse(await readFile(destino, 'utf8').catch(() => '[]')) as Song[]) ?? [])
    : [];

  const porId = new Map(atuais.map((song) => [song.id, song]));
  let novas = 0;
  for (const song of importadas) {
    if (!porId.has(song.id)) novas += 1;
    porId.set(song.id, song);
  }

  const catalogo = [...porId.values()];
  await writeFile(destino, `${JSON.stringify(catalogo, null, 2)}\n`, 'utf8');

  console.log(`✔ ${novas} nova(s) musica(s); catalogo agora com ${catalogo.length}`);
  console.log('  rode "npm run catalog:check" para validar.');
  console.log('  lembrete: previas so valem para o modo Trecho (nao tem trilhas isoladas).');
}

void main();
