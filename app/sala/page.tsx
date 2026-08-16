import type { Metadata } from 'next';
import { RoomEntry } from '@/components/RoomEntry';

export const metadata: Metadata = {
  title: 'Sala online — GuessTheMusic',
  description: 'Crie uma sala, chame a galera e disputem a mesma musica em tempo real.',
};

export default function SalaPage() {
  return <RoomEntry />;
}
