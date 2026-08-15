import type { MetadataRoute } from 'next';

/**
 * Manifesto do "adicionar a tela inicial": abre sem barra de navegador e usa
 * os icones de public/. O `maskable` e o que o Android recorta no formato do
 * launcher — sem ele o icone vira um adesivo dentro de um circulo branco.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GuessTheMusic — adivinhe a musica do dia',
    short_name: 'GuessTheMusic',
    description:
      'Dois puzzles musicais por dia: adivinhe pelo trecho que cresce a cada erro ou pela musica que vai se abrindo em camadas.',
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0713',
    theme_color: '#0a0713',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
