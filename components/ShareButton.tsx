'use client';

import { useState } from 'react';
import { Check, Image as ImageIcon, MessageCircle, Share2 } from 'lucide-react';
import { buildInvite, shareScore, shareTitle } from '@/lib/game/share';
import { renderShareImage } from '@/lib/share/image';
import { siteUrl } from '@/lib/share/url';
import type { GameState, GameVariant, Song } from '@/lib/game/types';
import { useStrings } from '@/store/useSettings';

type Feedback = 'idle' | 'working' | 'copied';

interface ShareButtonProps {
  state: GameState;
  song: Song;
  variant: GameVariant;
}

/**
 * Compartilhamento do resultado.
 *
 * A imagem vai anexada pela folha nativa do sistema (`navigator.share` com
 * arquivos), que e o unico caminho da web para entregar um arquivo a outro
 * app. Nao existe API que jogue a imagem direto no WhatsApp: o link `wa.me`
 * so carrega texto. Onde a folha nao aceita arquivos, sobra o texto — e ali
 * o link rende a previa gerada pelas meta tags do site.
 */
export function ShareButton({ state, song, variant }: ShareButtonProps) {
  const strings = useStrings();
  const [feedback, setFeedback] = useState<Feedback>('idle');

  const url = siteUrl();
  const message = buildInvite(state, url, strings.inviteCta, variant);

  // No diario todo mundo joga a mesma musica: revelar a capa na imagem
  // entregaria a resposta para quem ainda vai jogar.
  const reveal = variant === 'livre';

  const buildFile = async (): Promise<File | null> => {
    try {
      const fontFamily =
        getComputedStyle(document.body).getPropertyValue('--font-display') || 'sans-serif';
      const blob = await renderShareImage(state, {
        song,
        title: shareTitle(state, variant),
        score: shareScore(state),
        invite: strings.inviteCta,
        url,
        fontFamily: `${fontFamily}, sans-serif`,
        reveal,
        mystery: strings.shareMystery,
      });
      return new File([blob], 'guessthemusic.jpg', { type: 'image/jpeg' });
    } catch {
      return null;
    }
  };

  /** Tenta a folha nativa com a imagem; devolve false se nao rolou. */
  const shareWithImage = async (): Promise<boolean> => {
    const file = await buildFile();
    if (!file || !navigator.canShare?.({ files: [file] })) return false;

    await navigator.share({ files: [file], text: message });
    return true;
  };

  const share = async () => {
    setFeedback('working');
    try {
      if (await shareWithImage()) {
        setFeedback('idle');
        return;
      }

      if (navigator.share) {
        await navigator.share({ text: message });
        setFeedback('idle');
        return;
      }

      await navigator.clipboard.writeText(message);
      setFeedback('copied');
      setTimeout(() => setFeedback('idle'), 2000);
    } catch {
      // Cancelar a folha de compartilhamento tambem cai aqui: nao e erro.
      setFeedback('idle');
    }
  };

  const shareOnWhatsApp = async () => {
    setFeedback('working');
    try {
      // No celular, a folha abre com o WhatsApp na frente e a imagem ja anexada.
      if (await shareWithImage()) return;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    } catch {
      /* compartilhamento cancelado */
    } finally {
      setFeedback('idle');
    }
  };

  /** Baixa a imagem — util no desktop, onde a folha nativa nao aceita arquivos. */
  const downloadImage = async () => {
    const file = await buildFile();
    if (!file) return;

    const href = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = href;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(href);
  };

  const busy = feedback === 'working';

  return (
    <div className="space-y-2">
      <button type="button" className="btn-primary w-full" onClick={share} disabled={busy}>
        {feedback === 'copied' ? (
          <Check size={18} aria-hidden="true" />
        ) : (
          <Share2 size={18} aria-hidden="true" />
        )}
        {feedback === 'copied' ? strings.copied : strings.share}
      </button>

      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1" onClick={shareOnWhatsApp} disabled={busy}>
          <MessageCircle size={16} aria-hidden="true" />
          WhatsApp
        </button>
        <button type="button" className="btn-ghost flex-1" onClick={downloadImage} disabled={busy}>
          <ImageIcon size={16} aria-hidden="true" />
          {strings.saveImage}
        </button>
      </div>
    </div>
  );
}
