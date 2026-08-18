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
 *   --ao-vivo  aceita gravacoes ao vivo (padrao: so estudio)
 *   --titulo-unico  uma gravacao por titulo, mesmo de artistas diferentes
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

    // Pop-punk dos anos 2000/2010. Fica em rock, e nao em pop, para acompanhar
    // o blink-182, o Paramore e o Fall Out Boy, que ja estao aqui.
    '5 Seconds Of Summer',
    'Simple Plan',
    'Good Charlotte',
    'All Time Low',
    'The All-American Rejects',
    'McFly',
    'Boys Like Girls',
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

    // Grupos dos anos 2000 e 2010 — a era das boy/girl bands, que o catalogo
    // so tinha pelos solistas que sairam delas.
    'One Direction',
    'Fifth Harmony',
    'Little Mix',
    'The Pussycat Dolls',
    "Destiny's Child",
    'Spice Girls',
    '*NSYNC',
    'Westlife',
    'Big Time Rush',
    'RBD',
    'Girls Aloud',
    'Sugababes',
    't.A.T.u.',
    'The Saturdays',
    'The Wanted',
    'JLS',
    'CNCO',
    'Now United',
    'Aly & AJ',
    "Why Don't We",
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
    'IU',
    'PSY',
    'Jungkook',
    'Jimin',
    'JENNIE',
    'ROSE',
    'JISOO',
    // Nome nenhum resolve a LISA do BLACKPINK: ela nao sai na busca por "LISA",
    // que devolve homonimas, e o desempate por fas entregaria a errada.
    'LISA#145068682',
    'BABYMONSTER',
    'KATSEYE',
    'RIIZE',
    'NMIXX',
    'Zico',
    'Agust D',
    'j-hope',
    'RM',
  ],

  /**
   * Louvor cristao brasileiro. A lista sai dos artistas de uma playlist de
   * referencia (open.spotify.com/playlist/0RjAuFbB00jD9i1fUIFImO), incluindo
   * quem so aparece em participacao mas tem repertorio proprio. E de maioria
   * catolica, mas nao so: a mesma playlist traz Kleber Lucas, Jesse Aguiar e
   * outros nomes do louvor evangelico, e o genero cobre os dois.
   *
   * Importar com --ao-vivo: neste genero a gravacao ao vivo e a de referencia
   * (o Frei Gilson tem 19 das 20 faixas mais tocadas ao vivo), e o padrao de
   * so-estudio deixaria o preset quase vazio.
   */
  crista: [
    'Colo de Deus',
    'Padre Fábio de Melo',
    'Fraternidade São João Paulo II',
    'Frei Gilson',
    'Ministério Adoração e Vida',
    'Missionário Shalom',
    'Comunidade Católica Shalom',
    'Juninho Cassimiro',
    'Eliana Ribeiro',
    'Tony Allysson',
    'Davidson Silva',
    // O nome no Deezer leva a comunidade junto; sem isso nao ha match exato.
    'Irmã Ana Paula, CMES',
    'Padre Rodrigo Natal',
    'Anjos de Resgate',
    'Projeto 2ou+',
    'Rosa de Saron',
    'Banda DOM',
    'Adriana Arydes',
    'Padre Roger Luis',
    'GBA Stage',
    'Flavio Vitor Jr.',
    'Martín Valverde',
    'Diego Fernandes',
    'Giselli Cristina',
    'Marquinhos Gomes',
    'Régis Danese',
    'Kleber Lucas',
    'Walmir Alencar',
    'André e Felipe',
    'Fraterno Amor',
    'Toca de Assis',
    'Gemerson Roque',
    'Ministério Amor e Adoração',
    'Comunidade Doce Mãe de Deus',
    'Dunga',
    'Padre Marcelo Rossi',
    'Guilherme de Sá',
    'Celina Borges',
    'Thiago Brado',
    'Jessé Aguiar',
    'André Leono',
    'Fátima Souza',
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

/** Versoes que atrapalham o reconhecimento: outro arranjo, outra letra, outra voz. */
const VERSAO_RUIM = /\b(remix|karaoke|instrumental|cover|acoustic|demo|reprise)\b/i;

/**
 * Marca de gravacao ao vivo. Fica fora de VERSAO_RUIM porque nao muda a musica,
 * so a gravacao — e em generos onde o ao vivo e a gravacao de referencia (o
 * louvor catolico, por exemplo) recusar tudo esvaziaria o preset inteiro.
 */
const AO_VIVO = /\b(ao vivo|live|en vivo)\b/i;

/**
 * Tira a marca de gravacao do fim do titulo: "Casa - Ao Vivo", "Casa (Live)",
 * "Casa (Ao Vivo no Hopi Hari)". So no fim, para nao mutilar "Live and Let Die".
 *
 * Serve tambem de chave: sem isso, a versao de estudio e a ao vivo da mesma
 * musica ocupariam duas vagas do catalogo e o jogo pediria a mesma resposta
 * duas vezes.
 */
function semMarcaDeVersao(titulo: string): string {
  return titulo
    .replace(/\s*[([]\s*(ao vivo|live|en vivo)\b[^)\]]*[)\]]\s*$/i, '')
    .replace(/\s*[-–—]\s*(ao vivo|live|en vivo)\b.*$/i, '')
    .trim();
}

/**
 * Participacao no fim do titulo: "Nas Asas do Senhor (feat. Celina Borges)".
 * Sai da chave de --titulo-unico para a mesma musica nao entrar duas vezes so
 * porque uma das gravacoes credita o convidado no titulo e a outra nao.
 */
const PARTICIPACAO = /\s*[([]\s*(feat|ft)\.?\s[^)\]]*[)\]]\s*$/i;

/** A faixa entra? Versao ruim nunca; ao vivo so quando o import pede. */
const faixaServe = (titulo: string, aceitaAoVivo: boolean): boolean =>
  !VERSAO_RUIM.test(titulo) && (aceitaAoVivo || !AO_VIVO.test(titulo));

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
  /** Aceita gravacoes ao vivo (e apaga a marca do titulo). */
  aoVivo: boolean;
  /** Uma gravacao por titulo, mesmo quando os artistas sao outros. */
  tituloUnico: boolean;
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
    aoVivo: argv.includes('--ao-vivo'),
    tituloUnico: argv.includes('--titulo-unico'),
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
 * Resolve uma entrada de preset no artista do Deezer.
 *
 * Usa /search/artist, e nao `q=artist:"Nome"`: a busca por texto do Deezer nao
 * filtra de verdade e traz bandas cover e homonimos (ex.: "Psycho Killer" de uma
 * banda tributo em vez do Talking Heads). Confere o nome exato e, entre os
 * homonimos, fica com o de mais fas.
 *
 * A entrada pode trazer o id junto ("LISA#145068682"), para os casos em que nome
 * nenhum resolve: a LISA do BLACKPINK nao aparece nem entre os dez primeiros
 * resultados de "LISA", e o desempate por fas entregaria uma homonima.
 */
async function resolveArtista(
  entrada: string,
): Promise<{ id: number | string; name: string } | null> {
  const [nomeBruto, idFixo] = entrada.split('#');
  const nome = (nomeBruto ?? '').trim();
  if (idFixo?.trim()) return { id: idFixo.trim(), name: nome };

  const busca = await getJson<{ data?: Array<{ id: number; name: string; nb_fan?: number }> }>(
    `https://api.deezer.com/search/artist?limit=10&q=${encodeURIComponent(nome)}`,
  );

  const alvo = normalize(nome);
  return (
    (busca.data ?? [])
      .filter((item) => normalize(item.name) === alvo)
      .sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0))[0] ?? null
  );
}

/** Faixas mais tocadas de cada artista do preset. */
async function deezerPreset(options: Options, artistas: string[]): Promise<DeezerTrack[]> {
  const tracks: DeezerTrack[] = [];

  for (const artista of artistas) {
    try {
      const encontrado = await resolveArtista(artista);

      if (!encontrado) {
        console.warn(`⚠ artista nao encontrado com nome exato: ${artista}`);
        await sleep(150);
        continue;
      }

      // Pede com folga: o filtro de versao e a deduplicacao derrubam parte das faixas.
      const limite = Math.min(100, Math.max(15, options.porArtista * 3));
      const top = await getJson<{ data?: DeezerTrack[] }>(
        `https://api.deezer.com/artist/${encontrado.id}/top?limit=${limite}`,
      );

      // Dedup antes do corte, senao "--por-artista 5" traria 5 faixas e
      // entregaria 3: o Deezer lista estudio e ao vivo da mesma musica, e as
      // duas so viram uma depois de tirar a marca do titulo.
      const vistas = new Set<string>();
      const boas: DeezerTrack[] = [];
      for (const track of top.data ?? []) {
        const titulo = track.title_short ?? track.title ?? '';
        if (!track.preview || !faixaServe(titulo, options.aoVivo)) continue;

        const chave = normalize(semMarcaDeVersao(titulo));
        if (chave === '' || vistas.has(chave)) continue;
        vistas.add(chave);

        boas.push(track);
        if (boas.length >= options.porArtista) break;
      }

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

    // trim: o Deezer devolve alguns nomes com espaco sobrando ("DAY6 ").
    const titulo = semMarcaDeVersao((track.title_short ?? track.title).trim());
    if (titulo === '') continue;

    // Evita "Song" e "Song - Remastered 2011" ocupando duas vagas. Com
    // --titulo-unico o artista sai da chave: em repertorio compartilhado (o
    // louvor catolico, onde cada comunidade grava a mesma musica) duas
    // gravacoes do mesmo titulo viram duas respostas certas para o mesmo audio,
    // e quem escolhesse a outra levaria erro. Vence quem vier primeiro, ou seja,
    // a ordem do preset.
    const chave = options.tituloUnico
      ? normalize(titulo.replace(PARTICIPACAO, ''))
      : normalize(`${track.artist.name} ${titulo}`);
    if (vistas.has(chave)) continue;
    vistas.add(chave);

    const year = await anoDaFaixa(track);
    const genero = generoDe(options);
    songs.push({
      id: `deezer-${track.id}`,
      title: titulo,
      artist: track.artist.name.trim(),
      year,
      ...(genero ? { genres: [genero] } : {}),
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

  const importadas =
    options.fonte === 'deezer' ? await fromDeezer(options) : await fromItunes(options);
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
