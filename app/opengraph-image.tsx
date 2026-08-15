import { ImageResponse } from 'next/og';

/**
 * Card que WhatsApp, Telegram e redes mostram quando alguem compartilha o link.
 * Gerado no build; sem ele o convite chega como URL crua.
 */
export const runtime = 'edge';
export const alt = 'GuessTheMusic — adivinhe a musica do dia';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #271b48 0%, #0a0713 60%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 92, fontWeight: 700, letterSpacing: -2 }}>
          <span style={{ color: '#b78bff' }}>Guess</span>
          <span style={{ color: '#5cffb1' }}>The</span>
          <span>Music</span>
        </div>

        <div style={{ marginTop: 24, fontSize: 34, color: 'rgba(233,228,250,0.75)' }}>
          Adivinhe a musica do dia
        </div>

        <div style={{ display: 'flex', gap: 18, marginTop: 56 }}>
          {['#ef4444', '#f59e0b', '#22e58a', '#2a2440', '#2a2440', '#2a2440'].map((color, i) => (
            <div
              key={i}
              style={{ width: 86, height: 86, borderRadius: 20, backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
