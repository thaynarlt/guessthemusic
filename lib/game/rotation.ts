import type { Song } from '@/lib/game/types';

/**
 * Uma rodada ja jogada.
 *
 * Guarda o artista junto da musica de proposito: o historico precisa continuar
 * valendo quando o filtro muda e a musica sai do pool, e refazer a busca no
 * catalogo a cada sorteio so para descobrir de quem era seria trabalho a toa.
 */
export interface PlayedSong {
  id: string;
  artist: string;
}

/**
 * Descanso de uma musica, em rodadas: `BLOCK` e a quarentena (nao sai de jeito
 * nenhum) e `FULL` e quando ela volta a valer o mesmo que as outras; entre os
 * dois a chance sobe aos poucos, para o retorno nao ser um interruptor.
 *
 * Sao fracoes do pool para o filtro estreito (um genero, uma epoca) nao travar,
 * com teto absoluto porque, no catalogo inteiro, 40% seriam quase mil rodadas —
 * muito mais do que qualquer sessao, e guardar esse historico todo nao paga.
 */
const SONG_BLOCK = { ratio: 0.4, max: 100 };
const SONG_FULL = { ratio: 0.6, max: 150 };

/**
 * Descanso de um artista. Conta artistas distintos do pool, nao musicas: o que
 * incomoda e ouvir o mesmo cantor de novo, e isso independe de quantas musicas
 * dele o catalogo tem.
 */
const ARTIST_BLOCK = { ratio: 0.15, max: 8 };
const ARTIST_FULL = { ratio: 0.35, max: 25 };

/** Quantas rodadas guardar: passado o descanso mais longo, o resto nao muda nada. */
export const HISTORY_LIMIT = SONG_FULL.max;

/** Anota a rodada no historico, descartando o que ja saiu de todo descanso. */
export function remember(history: readonly PlayedSong[], song: Song): PlayedSong[] {
  return [{ id: song.id, artist: song.artist }, ...history].slice(0, HISTORY_LIMIT);
}

interface Cooldown {
  block: number;
  full: number;
}

/**
 * Traduz as fracoes em rodadas.
 *
 * A quarentena nunca cobre o conjunto inteiro (`size - 1`): com um artista so no
 * filtro, ou com o pool no minimo, um bloqueio total deixaria a partida sem
 * nada para sortear.
 */
function cooldownFor(size: number, block: typeof SONG_BLOCK, full: typeof SONG_FULL): Cooldown {
  const span = (limits: typeof SONG_BLOCK): number =>
    Math.min(limits.max, Math.max(0, Math.floor(size * limits.ratio)));

  const blocked = Math.min(span(block), Math.max(0, size - 1));
  return { block: blocked, full: Math.max(blocked, span(full)) };
}

/** Quanto do descanso ja passou: 0 na quarentena, 1 depois dele, subindo no meio. */
function revival(age: number, { block, full }: Cooldown): number {
  if (age >= full) return 1;
  if (age < block) return 0;
  return (age - block) / (full - block);
}

/**
 * Sorteia a proxima musica dando descanso ao que acabou de tocar.
 *
 * Sorteio uniforme puro repete cedo demais: em 40 rodadas sobre duas mil musicas
 * a chance de cair duas vezes na mesma passa de 30% (paradoxo do aniversario),
 * e como cada artista tem varias musicas no catalogo o mesmo cantor volta muito
 * antes disso. Aqui cada candidata entra na urna com um peso, zerado enquanto a
 * musica — ou o artista dela — esta de quarentena.
 */
export function pickFresh(
  pool: readonly Song[],
  history: readonly PlayedSong[] = [],
  random: () => number = Math.random,
): Song {
  if (pool.length === 0) throw new Error('Catalogo vazio');

  // Primeira ocorrencia vence: e a mais recente, e e ela que manda no descanso.
  const songAge = new Map<string, number>();
  const artistAge = new Map<string, number>();
  history.forEach((play, age) => {
    if (!songAge.has(play.id)) songAge.set(play.id, age);
    if (!artistAge.has(play.artist)) artistAge.set(play.artist, age);
  });

  const songCooldown = cooldownFor(pool.length, SONG_BLOCK, SONG_FULL);
  const artists = new Set(pool.map((song) => song.artist)).size;
  const artistCooldown = cooldownFor(artists, ARTIST_BLOCK, ARTIST_FULL);

  const weights = pool.map(
    (song) =>
      revival(songAge.get(song.id) ?? Infinity, songCooldown) *
      revival(artistAge.get(song.artist) ?? Infinity, artistCooldown),
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  // As duas quarentenas juntas podem, num pool torto (um artista dono de quase
  // tudo), zerar todo mundo. Ai vale a mais esquecida, que e o melhor que sobra.
  const urn = total > 0 ? weights : pool.map((song) => (songAge.get(song.id) ?? HISTORY_LIMIT) + 1);
  const picked = pool[draw(urn, random)];

  if (!picked) throw new Error('Falha ao sortear a musica');
  return picked;
}

/** Roleta ponderada: devolve um indice, com chance proporcional ao peso. */
function draw(weights: readonly number[], random: () => number): number {
  let ticket = random() * weights.reduce((sum, weight) => sum + weight, 0);

  for (let index = 0; index < weights.length; index += 1) {
    ticket -= weights[index] as number;
    if (ticket < 0) return index;
  }
  // So chega aqui por arredondamento, com o ticket colado no total: devolve a
  // ultima candidata que valia alguma coisa, nunca uma que esta de quarentena.
  for (let index = weights.length - 1; index >= 0; index -= 1) {
    if ((weights[index] as number) > 0) return index;
  }
  return 0;
}
