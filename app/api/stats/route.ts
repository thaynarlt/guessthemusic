import { NextResponse } from 'next/server';
import { MAX_ATTEMPTS } from '@/lib/game/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Estatisticas globais — opcional. Sem SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * a rota responde `{ enabled: false }` e o jogo segue 100% no localStorage.
 *
 * Tabela esperada (SQL no README):
 *   results(mode text, puzzle_number int, attempts int, won bool, created_at timestamptz)
 */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const enabled = (): boolean => Boolean(SUPABASE_URL && SUPABASE_KEY);

function headers(): HeadersInit {
  return {
    apikey: SUPABASE_KEY ?? '',
    authorization: `Bearer ${SUPABASE_KEY ?? ''}`,
    'content-type': 'application/json',
  };
}

interface ResultRow {
  mode: string;
  puzzle_number: number;
  attempts: number;
  won: boolean;
}

function parseBody(raw: unknown): ResultRow | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;

  const mode = value.mode;
  const puzzleNumber = value.puzzleNumber;
  const attempts = value.attempts;
  const won = value.won;

  if (mode !== 'trecho' && mode !== 'banda') return null;
  if (typeof puzzleNumber !== 'number' || !Number.isInteger(puzzleNumber)) return null;
  if (typeof attempts !== 'number' || attempts < 0 || attempts > MAX_ATTEMPTS) return null;
  if (typeof won !== 'boolean') return null;

  return { mode, puzzle_number: puzzleNumber, attempts, won };
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!enabled()) return NextResponse.json({ enabled: false });

  const row = parseBody(await request.json().catch(() => null));
  if (!row) return NextResponse.json({ error: 'payload invalido' }, { status: 400 });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/results`, {
    method: 'POST',
    headers: { ...headers(), prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });

  if (!response.ok) return NextResponse.json({ error: 'falha ao gravar' }, { status: 502 });
  return NextResponse.json({ enabled: true, ok: true });
}

/** Distribuicao agregada de um puzzle: quantos acertaram em cada tentativa. */
export async function GET(request: Request): Promise<NextResponse> {
  if (!enabled()) return NextResponse.json({ enabled: false });

  const params = new URL(request.url).searchParams;
  const mode = params.get('mode');
  const puzzleNumber = Number(params.get('puzzleNumber'));

  if ((mode !== 'trecho' && mode !== 'banda') || !Number.isInteger(puzzleNumber)) {
    return NextResponse.json({ error: 'parametros invalidos' }, { status: 400 });
  }

  const query = `select=attempts,won&mode=eq.${mode}&puzzle_number=eq.${puzzleNumber}`;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/results?${query}`, { headers: headers() });
  if (!response.ok) return NextResponse.json({ error: 'falha ao ler' }, { status: 502 });

  const rows = (await response.json()) as Array<{ attempts: number; won: boolean }>;
  const distribution = new Array<number>(MAX_ATTEMPTS).fill(0);
  let wins = 0;

  for (const row of rows) {
    if (!row.won) continue;
    wins += 1;
    const slot = Math.min(Math.max(row.attempts, 1), MAX_ATTEMPTS) - 1;
    distribution[slot] = (distribution[slot] ?? 0) + 1;
  }

  return NextResponse.json({ enabled: true, players: rows.length, wins, distribution });
}
