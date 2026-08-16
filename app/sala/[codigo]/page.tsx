import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RoomScreen } from '@/components/RoomScreen';
import { isValidRoomCode, normalizeRoomCode } from '@/lib/room/code';

export function generateMetadata({ params }: { params: { codigo: string } }): Metadata {
  return {
    title: `Sala ${normalizeRoomCode(params.codigo)} — GuessTheMusic`,
    description: 'Entre na sala e dispute a mesma musica com a galera, em tempo real.',
  };
}

export default function SalaCodigoPage({ params }: { params: { codigo: string } }) {
  const code = normalizeRoomCode(params.codigo);
  if (!isValidRoomCode(code)) notFound();

  return <RoomScreen code={code} />;
}
