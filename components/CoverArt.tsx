import { hashString } from '@/lib/game/random';
import type { Song } from '@/lib/game/types';

/** Capa procedural: evita depender de arquivos de imagem para cada musica. */
export function CoverArt({ song, size = 96 }: { song: Song; size?: number }) {
  if (song.cover) {
    return (
      <img
        src={song.cover}
        alt=""
        width={size}
        height={size}
        className="rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  const seed = hashString(song.id);
  const hue = seed % 360;
  const hue2 = (hue + 60 + (seed % 90)) % 360;
  const initials = song.title.slice(0, 1).toUpperCase() + song.artist.slice(0, 1).toUpperCase();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role="img"
      aria-hidden="true"
      className="rounded-xl"
    >
      <defs>
        <linearGradient id={`g-${song.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue} 85% 58%)`} />
          <stop offset="100%" stopColor={`hsl(${hue2} 80% 42%)`} />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="14" fill={`url(#g-${song.id})`} />
      <circle cx="48" cy="48" r="26" fill="rgba(0,0,0,0.35)" />
      <circle cx="48" cy="48" r="6" fill="rgba(255,255,255,0.8)" />
      <text
        x="48"
        y="88"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="rgba(255,255,255,0.85)"
      >
        {initials}
      </text>
    </svg>
  );
}
