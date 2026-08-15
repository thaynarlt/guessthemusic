import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ThemeSync } from '@/components/ThemeSync';
import { settingsKey } from '@/lib/game/stats';
import { FALLBACK_SITE_URL } from '@/lib/share/url';

/** Titulos e numeros: geometrica, com desenho proprio. */
const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700'],
});

/** Texto corrido e interface: neutra e legivel em corpo pequeno. */
const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const description =
  'Dois puzzles musicais por dia: adivinhe pelo trecho que cresce a cada erro ou pela musica que vai se abrindo em camadas.';

export const metadata: Metadata = {
  // metadataBase deixa as imagens de previa com URL absoluta, que e o que
  // WhatsApp e Telegram exigem para montar o card do link.
  metadataBase: new URL(FALLBACK_SITE_URL),
  title: 'GuessTheMusic — adivinhe a musica do dia',
  description,
  openGraph: {
    type: 'website',
    siteName: 'GuessTheMusic',
    title: 'GuessTheMusic — adivinhe a musica do dia',
    description,
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GuessTheMusic — adivinhe a musica do dia',
    description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0713' },
  ],
};

/**
 * Aplica o tema antes da primeira pintura, para nao piscar branco no modo escuro.
 * Le a mesma chave que o store de settings persiste.
 */
const themeScript = `(function(){try{
  var raw = localStorage.getItem(${JSON.stringify(settingsKey())});
  var choice = raw ? (JSON.parse(raw).state || {}).theme : 'system';
  var dark = choice === 'dark' || ((!choice || choice === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', !!dark);
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeSync />
        <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-10 pt-4">
          {children}
        </div>
      </body>
    </html>
  );
}
