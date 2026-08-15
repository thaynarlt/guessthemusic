'use client';

import type { Song } from '@/lib/game/types';
import { useStrings } from '@/store/useSettings';

/** Id da faixa no Deezer, quando a musica veio de la. */
function deezerTrackId(song: Song): string | null {
  return /^deezer:(\d+)$/.exec(song.previewId ?? '')?.[1] ?? null;
}

/**
 * Player da musica completa na revelacao — o equivalente ao embed que o
 * Songless usa. Widget oficial do Deezer: nao precisa de chave de API, e a
 * reproducao acontece no player deles, nao no nosso.
 */
export function FullTrackPlayer({ song }: { song: Song }) {
  const strings = useStrings();
  const id = deezerTrackId(song);
  if (!id) return null;

  return (
    <div className="space-y-1">
      <iframe
        title={`${song.artist} - ${song.title}`}
        src={`https://widget.deezer.com/widget/dark/track/${id}?tracklist=false&radius=true`}
        className="w-full rounded-xl"
        height={150}
        loading="lazy"
        allow="encrypted-media; clipboard-write"
        style={{ border: 0 }}
      />
      <p className="text-center text-xs muted">
        {strings.fullTrackNote}{' '}
        <a
          href={`https://www.deezer.com/track/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {strings.openInDeezer}
        </a>
      </p>
    </div>
  );
}
