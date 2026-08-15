import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface ITunesResult {
  previewUrl?: string;
}

interface DeezerTrack {
  preview?: string;
}

/** Previas do Deezer sao assinadas e expiram: nunca cachear a URL resolvida. */
const SEARCH_CACHE = 3_600;

async function getJson<T>(url: string, revalidate: number): Promise<T | null> {
  const response = await fetch(url, { next: { revalidate } });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

async function byReference(ref: string): Promise<string | null> {
  const [provider, id] = ref.split(':');
  if (!id || !/^\d+$/.test(id)) return null;

  if (provider === 'deezer') {
    const track = await getJson<DeezerTrack>(`https://api.deezer.com/track/${id}`, 0);
    return track?.preview ?? null;
  }

  if (provider === 'itunes') {
    const data = await getJson<{ results?: ITunesResult[] }>(
      `https://itunes.apple.com/lookup?id=${id}`,
      SEARCH_CACHE,
    );
    return data?.results?.[0]?.previewUrl ?? null;
  }

  return null;
}

async function byTerm(term: string): Promise<string | null> {
  const itunes = await getJson<{ results?: ITunesResult[] }>(
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=1`,
    SEARCH_CACHE,
  );
  const preview = itunes?.results?.[0]?.previewUrl;
  if (preview) return preview;

  const deezer = await getJson<{ data?: DeezerTrack[] }>(
    `https://api.deezer.com/search?limit=1&q=${encodeURIComponent(term)}`,
    0,
  );
  return deezer?.data?.[0]?.preview ?? null;
}

/**
 * Resolve a previa oficial de 30s de uma musica.
 *
 * Prefere `ref` (a faixa exata gravada pelo importador); cai na busca por
 * artista + titulo quando nao houver referencia. O cliente nunca fala direto
 * com as APIs externas: isso evita CORS e mantem a allowlist de hosts sob
 * nosso controle (ver /api/preview/stream).
 */
export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const ref = params.get('ref')?.trim();
  const artist = params.get('artist')?.trim();
  const title = params.get('title')?.trim();

  if (!ref && (!artist || !title)) {
    return NextResponse.json({ error: 'informe ref ou artist + title' }, { status: 400 });
  }

  try {
    const preview =
      (ref ? await byReference(ref) : null) ??
      (artist && title ? await byTerm(`${artist} ${title}`) : null);

    if (!preview) return NextResponse.json({ error: 'previa nao encontrada' }, { status: 404 });

    return NextResponse.json(
      {
        source: preview.includes('dzcdn') ? 'deezer' : 'itunes',
        // Os CDNs de previa aceitam CORS, entao o cliente baixa direto deles.
        // Isso tira todo o trafego de audio do nosso servidor.
        url: preview,
        // Rede de seguranca, caso algum dia parem de mandar o cabecalho.
        stream: `/api/preview/stream?src=${encodeURIComponent(preview)}`,
      },
      // A URL assinada tem validade curta: nao pode ficar guardada no cliente.
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'falha ao consultar a previa' }, { status: 502 });
  }
}
