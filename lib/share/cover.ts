import type { Song } from '@/lib/game/types';

/**
 * URL da capa pronta para uso em canvas.
 *
 * Capas externas passam pelo proxy `/api/cover`: o CDN do Deezer nao envia
 * cabecalho de CORS, e sem ele o canvas fica contaminado e nao exporta.
 */
export function coverUrl(song: Song): string | null {
  if (!song.cover) return null;
  return /^https?:\/\//.test(song.cover)
    ? `/api/cover?src=${encodeURIComponent(song.cover)}`
    : song.cover;
}
