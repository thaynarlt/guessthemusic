import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GameScreen } from '@/components/GameScreen';
import type { GameMode } from '@/lib/game/types';

const MODES: GameMode[] = ['trecho', 'banda'];

export function generateStaticParams(): Array<{ modo: GameMode }> {
  return MODES.map((modo) => ({ modo }));
}

export function generateMetadata({ params }: { params: { modo: string } }): Metadata {
  const nome = params.modo === 'banda' ? 'Banda' : 'Trecho';
  return {
    title: `${nome} livre — GuessTheMusic`,
    description: 'Rodadas ilimitadas: jogue quantas musicas quiser, sem esperar o dia virar.',
  };
}

export default function LivrePage({ params }: { params: { modo: string } }) {
  const modo = MODES.find((mode) => mode === params.modo);
  if (!modo) notFound();

  return <GameScreen mode={modo} variant="livre" />;
}
