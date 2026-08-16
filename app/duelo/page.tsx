import type { Metadata } from 'next';
import { DuelScreen } from '@/components/DuelScreen';

export const metadata: Metadata = {
  title: 'Duelo — GuessTheMusic',
  description:
    'Duas a quatro pessoas em um aparelho so: quem reconhecer a musica no trecho mais curto leva mais pontos.',
};

export default function DueloPage() {
  return <DuelScreen />;
}
