import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** Hosts de previa aceitos. Sem isto, a rota viraria um proxy aberto (SSRF). */
const ALLOWED_HOSTS = [
  'audio-ssl.itunes.apple.com',
  '.mzstatic.com',
  '.dzcdn.net',
  '.deezer.com',
];

function isAllowed(url: URL): boolean {
  if (url.protocol !== 'https:') return false;
  return ALLOWED_HOSTS.some((host) =>
    host.startsWith('.') ? url.hostname.endsWith(host) : url.hostname === host,
  );
}

/** Repassa o mp3 da previa pelo nosso dominio, para o fetch do cliente nao esbarrar em CORS. */
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

  const upstream = await fetch(target, { next: { revalidate: 86_400 } });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'previa indisponivel' }, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'audio/mpeg',
      'cache-control': 'public, max-age=86400, immutable',
    },
  });
}
