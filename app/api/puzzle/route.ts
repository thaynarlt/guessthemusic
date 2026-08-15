import { NextResponse } from 'next/server';
import { dailyAnswer } from '@/lib/game/catalog';
import { dateKey, puzzleNumberFor } from '@/lib/game/daily';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Puzzle do dia. A data e sempre a do servidor (UTC): nao existe parametro de
 * data, entao nao ha como pedir a resposta de amanha.
 */
export function GET(request: Request): NextResponse {
  const mode = new URL(request.url).searchParams.get('mode');
  if (mode !== 'trecho' && mode !== 'banda') {
    return NextResponse.json({ error: 'modo invalido' }, { status: 400 });
  }

  const today = dateKey();
  const puzzleNumber = puzzleNumberFor(today);
  const song = dailyAnswer(mode, puzzleNumber);

  return NextResponse.json(
    { date: today, puzzleNumber, song },
    { headers: { 'cache-control': 'no-store' } },
  );
}
