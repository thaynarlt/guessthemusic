import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Hosts de capa aceitos. Sem a lista, a rota viraria um proxy aberto (SSRF).
 */
const ALLOWED_HOSTS = ['.dzcdn.net', '.mzstatic.com', '.deezer.com'];

function isAllowed(url: URL): boolean {
  if (url.protocol !== 'https:') return false;
  return ALLOWED_HOSTS.some((host) =>
    host.startsWith('.') ? url.hostname.endsWith(host) : url.hostname === host,
  );
}

/**
 * Repassa a capa pelo nosso dominio.
 *
 * O CDN do Deezer nao envia `access-control-allow-origin`, entao a imagem
 * carregada direto contamina o canvas e `toBlob()` passa a falhar — o que
 * quebraria a imagem de compartilhamento.
 */
export async function GET(request: Request): Promise<Response> {
  const src = new URL(request.url).searchParams.get('src');
  if (!src) return NextResponse.json({ error: 'informe src' }, { status: 400 });

  let target: URL;
  try {
    target = new URL(src);
  } catch {
    return NextResponse.json({ error: 'url invalida' }, { status: 400 });
  }

  if (!isAllowed(target)) {
    return NextResponse.json({ error: 'host nao permitido' }, { status: 403 });
  }

  const upstream = await fetch(target, { next: { revalidate: 604_800 } });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'capa indisponivel' }, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'image/jpeg',
      'cache-control': 'public, max-age=604800, immutable',
      'access-control-allow-origin': '*',
    },
  });
}
