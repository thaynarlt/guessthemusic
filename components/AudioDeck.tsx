'use client';

import type { ReactNode } from 'react';
import { Drum, Guitar, MicVocal, Music, Piano, Speaker } from 'lucide-react';
import { PlayButton } from '@/components/PlayButton';
import { SnippetBar } from '@/components/SnippetBar';
import { TrackRack, type RackItem } from '@/components/TrackRack';
import { VolumeControl } from '@/components/VolumeControl';
import { SpectrumIcon } from '@/components/icons/SpectrumIcon';
import type { SnippetPlayer } from '@/lib/audio/useSnippetPlayer';
import { FREQUENCY_LAYERS } from '@/lib/audio/layers';
import { songUsesStems } from '@/lib/game/catalog';
import { STEM_ORDER, type GameMode, type Song, type StemName } from '@/lib/game/types';
import { useStrings } from '@/store/useSettings';

/** Icone de cada trilha, quando a musica tem stems de verdade. */
const STEM_ICONS: Record<StemName, ReactNode> = {
  drums: <Drum size={20} aria-hidden="true" />,
  bass: <Speaker size={20} aria-hidden="true" />,
  guitar: <Guitar size={20} aria-hidden="true" />,
  keys: <Piano size={20} aria-hidden="true" />,
  other: <Music size={20} aria-hidden="true" />,
  vocals: <MicVocal size={20} aria-hidden="true" />,
};

interface AudioDeckProps {
  player: SnippetPlayer;
  song: Song;
  mode: GameMode;
  /** Deixa ligar/desligar as camadas ja liberadas. */
  interactive: boolean;
}

/**
 * Bloco de audio: barra do trecho, botao de tocar, rack de trilhas e volume.
 *
 * Os tres modos (diario/livre, duelo e sala) mostram exatamente este bloco; o
 * que muda em volta e de onde vem o nivel liberado.
 */
export function AudioDeck({ player, song, mode, interactive }: AudioDeckProps) {
  const strings = useStrings();
  const usesStems = songUsesStems(song);

  const rackItems: RackItem[] = usesStems
    ? STEM_ORDER.map((stem) => ({
        id: stem,
        label: strings.stems[stem],
        icon: STEM_ICONS[stem],
      }))
    : FREQUENCY_LAYERS.map((layer, index) => ({
        id: layer.id,
        label: strings.layers[layer.id],
        icon: <SpectrumIcon index={index} />,
      }));

  return (
    // wide-bleed: a barra precisa de largura para os trechos curtos aparecerem.
    <section className="surface wide-bleed flex flex-col items-center gap-4 p-4">
      {mode === 'trecho' && <SnippetBar unlocked={player.unlocked} elapsed={player.elapsed} />}

      <PlayButton
        playing={player.playing}
        loading={player.status === 'loading'}
        onToggle={player.toggle}
      />

      {mode === 'banda' && (
        <TrackRack
          items={rackItems}
          unlocked={player.unlockedCount}
          muted={player.muted}
          onToggle={player.toggleTrack}
          interactive={interactive}
        />
      )}

      <VolumeControl />

      {(player.status === 'error' || player.status === 'blocked') && (
        <div className="max-w-sm text-center text-sm">
          <p className="text-red-500">
            {player.status === 'blocked' ? strings.audioBlocked : strings.audioError}
          </p>
          <p className="mt-1 text-xs muted">{strings.audioHint}</p>
          <button type="button" className="btn-ghost mt-2" onClick={player.play}>
            {strings.retry}
          </button>
        </div>
      )}
    </section>
  );
}
