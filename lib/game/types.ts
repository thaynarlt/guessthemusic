export const STEM_ORDER = ['drums', 'bass', 'guitar', 'keys', 'other', 'vocals'] as const;

export type StemName = (typeof STEM_ORDER)[number];

/** Fonte do audio de uma musica do catalogo. */
export type SongSource = 'synth' | 'local' | 'preview';

export interface SynthSpec {
  /** Batidas por minuto. */
  bpm: number;
  /** Nota MIDI da tonica (ex.: 45 = A2). */
  root: number;
  mode: 'minor' | 'major';
  /** Progressao harmonica em semitons relativos a tonica, um acorde por compasso. */
  progression: number[];
  /** Semente do gerador deterministico. */
  seed: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  year: number;
  /** Caminho da capa. Ausente => capa procedural gerada a partir do id. */
  cover?: string;
  source: SongSource;
  /** Clipe completo (modo Trecho). Obrigatorio quando source = "local". */
  clip?: string;
  /** Trilhas isoladas (modo Banda). Obrigatorio quando source = "local". */
  stems?: Partial<Record<StemName, string>>;
  /** Parametros do gerador. Obrigatorio quando source = "synth". */
  synth?: SynthSpec;
  /**
   * Referencia estavel da previa: "deezer:123" ou "itunes:456".
   *
   * URLs de previa do Deezer sao assinadas e expiram em cerca de um dia — por
   * isso guardamos a faixa, nao o link, e resolvemos a URL na hora de tocar.
   */
  previewId?: string;
  /** Grafias alternativas aceitas na busca. */
  aliases?: string[];
  /** Genero para o filtro do modo livre (ex.: "rock", "pop", "kpop"). */
  genre?: string;
}

export type GameMode = 'trecho' | 'banda';

/**
 * `diario` = um puzzle por dia, com estatisticas e sequencia.
 * `livre` = rodadas ilimitadas, sem esperar a virada do dia e sem mexer na sequencia.
 */
export type GameVariant = 'diario' | 'livre';

/** Chave de uma partida em andamento: cada variante tem o seu proprio jogo. */
export const sessionId = (variant: GameVariant, mode: GameMode): string => `${variant}:${mode}`;

export const MAX_ATTEMPTS = 6;

/**
 * Duracao liberada (em segundos) por tentativa no modo Trecho.
 * Mesma curva do Songless: comeca em um piscar de olho e cresce rapido.
 */
export const SNIPPET_STEPS = [0.2, 0.5, 2, 4, 8, 15] as const;

/** Formata a duracao do trecho sem casas decimais desnecessarias (0.2s, 2s). */
export const formatSeconds = (value: number): string =>
  `${Number(value.toFixed(1))}s`;

export type GuessResult = 'correct' | 'artist' | 'wrong' | 'skipped';

export interface Attempt {
  /** Id da musica palpitada. Nulo quando a tentativa foi um skip. */
  songId: string | null;
  /** Rotulo exibido na linha da tentativa. */
  label: string;
  result: GuessResult;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  mode: GameMode;
  /** Numero do puzzle diario (#1 = dia da estreia). */
  puzzleNumber: number;
  answerId: string;
  attempts: Attempt[];
  status: GameStatus;
}
