/**
 * Endereco publico do jogo, usado nos convites e nas meta tags.
 *
 * Na Vercel, VERCEL_PROJECT_PRODUCTION_URL ja vem preenchida no build, entao
 * o card de previa sai com o dominio certo sem precisar configurar nada.
 */
export const FALLBACK_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://guessthemusic-vfx.vercel.app');

/**
 * Em producao o proprio endereco da aba e a fonte da verdade — assim o convite
 * aponta para o dominio real, seja qual for. Em localhost cai no configurado,
 * para o link compartilhado nao ser inutil.
 */
export function siteUrl(): string {
  if (typeof window === 'undefined') return FALLBACK_SITE_URL;

  const { origin, hostname } = window.location;
  const local = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
  return local ? FALLBACK_SITE_URL : origin;
}
