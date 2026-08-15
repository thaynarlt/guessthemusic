import type { Metadata } from 'next';
import { GameScreen } from '@/components/GameScreen';

export const metadata: Metadata = {
  title: 'Banda — GuessTheMusic',
  description: 'Comece so na bateria: cada erro traz mais um instrumento da faixa.',
};

export default function BandaPage() {
  return <GameScreen mode="banda" />;
}
