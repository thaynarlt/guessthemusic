import type { Metadata } from 'next';
import { GameScreen } from '@/components/GameScreen';

export const metadata: Metadata = {
  title: 'Trecho — GuessTheMusic',
  description: 'Ouca 1 segundo da musica. Cada erro libera mais alguns segundos.',
};

export default function TrechoPage() {
  return <GameScreen mode="trecho" />;
}
