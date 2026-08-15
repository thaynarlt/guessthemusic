import type { Metadata } from 'next';
import { LegalNotice } from '@/components/LegalNotice';

export const metadata: Metadata = {
  title: 'Termos e privacidade — GuessTheMusic',
  description:
    'Projeto pessoal feito por diversao: creditos das inspiracoes, origem das musicas e o que o jogo guarda (quase nada).',
};

export default function TermosPage() {
  return <LegalNotice />;
}
