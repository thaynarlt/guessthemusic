import { hashString } from '@/lib/game/random';
import { coverUrl } from '@/lib/share/cover';
import { MAX_ATTEMPTS, type GameState, type GuessResult, type Song } from '@/lib/game/types';

/**
 * Desenha o resultado como imagem para compartilhar (WhatsApp, Instagram...).
 *
 * Quadrado de 1080px porque e o formato que chega inteiro na conversa sem
 * corte. Mostra a musica revelada: capa, titulo e artista.
 */
const SIZE = 1080;

const COLORS: Record<GuessResult, string> = {
  correct: '#22e58a',
  artist: '#f59e0b',
  wrong: '#ef4444',
  skipped: '#4b4560',
};

const EMPTY = '#2a2440';
const TEXT_SOFT = 'rgba(233, 228, 250, 0.72)';

interface ShareImageOptions {
  song: Song;
  modeLabel: string;
  /** Chamada convidando a jogar. */
  invite: string;
  url: string;
  /** Familia tipografica ja carregada na pagina. */
  fontFamily: string;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/** Escreve varios trechos coloridos em sequencia, centralizados no conjunto. */
function drawColoredLine(
  ctx: CanvasRenderingContext2D,
  parts: Array<{ text: string; color: string }>,
  centerX: number,
  y: number,
): void {
  const total = parts.reduce((sum, part) => sum + ctx.measureText(part.text).width, 0);
  let x = centerX - total / 2;

  for (const part of parts) {
    ctx.fillStyle = part.color;
    ctx.fillText(part.text, x, y);
    x += ctx.measureText(part.text).width;
  }
}

/**
 * Escolhe o maior corpo que cabe na largura; se nem o menor couber, corta com
 * reticencias. Titulos de musica variam muito de tamanho.
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  sizes: number[],
  weight: number,
  fontFamily: string,
): string {
  for (const size of sizes) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) return text;
  }

  let cut = text;
  while (cut.length > 4 && ctx.measureText(`${cut}...`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trim()}...`;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
    // Nao deixa o compartilhamento travar se a capa demorar.
    setTimeout(() => resolve(null), 4000);
  });
}

/** Capa procedural, igual a da tela, para musicas sem arte. */
function drawFallbackCover(
  ctx: CanvasRenderingContext2D,
  song: Song,
  x: number,
  y: number,
  size: number,
): void {
  const hue = hashString(song.id) % 360;
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, `hsl(${hue} 80% 55%)`);
  gradient.addColorStop(1, `hsl(${(hue + 70) % 360} 75% 40%)`);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.26, 0, Math.PI * 2);
  ctx.fill();
}

export async function renderShareImage(
  state: GameState,
  { song, modeLabel, invite, url, fontFamily }: ShareImageOptions,
): Promise<Blob> {
  const cover = coverUrl(song);
  const coverImage = cover ? await loadImage(cover) : null;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponivel');

  // Fundo: mesmo roxo escuro do tema, com um brilho no topo.
  ctx.fillStyle = '#0a0713';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const glow = ctx.createRadialGradient(SIZE / 2, 90, 0, SIZE / 2, 90, 780);
  glow.addColorStop(0, 'rgba(124, 58, 237, 0.5)');
  glow.addColorStop(1, 'rgba(10, 7, 19, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.textBaseline = 'middle';

  // Marca
  ctx.textAlign = 'left';
  ctx.font = `700 52px ${fontFamily}`;
  drawColoredLine(
    ctx,
    [
      { text: 'Guess', color: '#b78bff' },
      { text: 'The', color: '#5cffb1' },
      { text: 'Music', color: '#ffffff' },
    ],
    SIZE / 2,
    92,
  );

  // Capa do album
  const coverSize = 380;
  const coverX = (SIZE - coverSize) / 2;
  const coverY = 168;

  ctx.save();
  roundedRectPath(ctx, coverX, coverY, coverSize, coverSize, 36);
  ctx.clip();
  if (coverImage) {
    ctx.drawImage(coverImage, coverX, coverY, coverSize, coverSize);
  } else {
    drawFallbackCover(ctx, song, coverX, coverY, coverSize);
  }
  ctx.restore();

  // Musica revelada
  ctx.textAlign = 'center';
  const maxWidth = SIZE - 140;

  const title = fitText(ctx, song.title, maxWidth, [64, 56, 48, 42], 700, fontFamily);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, SIZE / 2, 626);

  const artist = fitText(ctx, `${song.artist} · ${song.year}`, maxWidth, [42, 38, 34], 500, fontFamily);
  ctx.fillStyle = TEXT_SOFT;
  ctx.fillText(artist, SIZE / 2, 690);

  // Placar e grade de tentativas
  const won = state.status === 'won';
  const score = won ? `${state.attempts.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;

  ctx.font = `700 46px ${fontFamily}`;
  ctx.fillStyle = won ? '#5cffb1' : TEXT_SOFT;
  ctx.fillText(`${modeLabel} #${state.puzzleNumber} · ${score}`, SIZE / 2, 782);

  const box = 82;
  const gap = 16;
  const totalWidth = MAX_ATTEMPTS * box + (MAX_ATTEMPTS - 1) * gap;
  const startX = (SIZE - totalWidth) / 2;
  const boxY = 826;

  for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
    const attempt = state.attempts[i];
    ctx.fillStyle = attempt ? COLORS[attempt.result] : EMPTY;
    roundedRectPath(ctx, startX + i * (box + gap), boxY, box, box, 20);
    ctx.fill();
  }

  // Convite e endereco
  ctx.font = `500 38px ${fontFamily}`;
  ctx.fillStyle = TEXT_SOFT;
  ctx.fillText(invite, SIZE / 2, 972);

  ctx.font = `700 44px ${fontFamily}`;
  ctx.fillStyle = '#b78bff';
  ctx.fillText(url.replace(/^https?:\/\//, ''), SIZE / 2, 1030);

  // JPEG em vez de PNG: o degrade do fundo faz o PNG passar de 700 KB, e o
  // share sheet do celular fica lento com anexo grande. Nao ha transparencia.
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem'))),
      'image/jpeg',
      0.92,
    );
  });
}
