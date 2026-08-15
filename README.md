# GuessTheMusic

Jogo diário de adivinhar música, com dois modos:

- **Trecho** — você ouve um piscar de olho. Cada erro ou pulo libera mais tempo: `0,1s → 0,5s → 2s → 4s → 8s → 15s` (a mesma curva do Songless).
- **Banda** — a música vai se abrindo em camadas, uma por erro, até tocar inteira. Como a fonte manda:
  - **por instrumento** (`bateria → baixo → guitarra → teclado → outros → vocal`) quando a música tem trilhas isoladas;
  - **por faixa de frequência** (`graves → médios-graves → médios → médios-agudos → agudos → brilho`) quando não tem — que é o caso das prévias de streaming. Em ambos dá para ligar/desligar cada camada já liberada; na revelação final o clipe toca limpo, sem filtro.

São 6 tentativas por modo, um puzzle novo por dia (meia-noite UTC), estatísticas locais e resultado compartilhável em emojis.

Cada modo tem duas variantes:

- **Diário** (`/trecho`, `/banda`) — um puzzle por dia, com sequência, estatísticas e compartilhamento.
- **Livre** (`/livre/trecho`, `/livre/banda`) — rodadas ilimitadas, sem esperar o dia virar. Sorteia uma música na hora, evita repetir as últimas e mantém um placar da sessão. **Não grava nada e não mexe na sequência do diário.**

## Rodando

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. **Não precisa de backend, banco nem arquivo de áudio**: o catálogo vem com 8 faixas geradas proceduralmente (Web Audio puro), então o jogo é jogável no primeiro `npm run dev`.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Valida o catálogo e faz o build de produção |
| `npm start` | Sobe o build de produção |
| `npm test` | Testes da lógica pura e do gerador de áudio (Vitest) |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npm run catalog:check` | Valida `data/songs.json` sozinho |
| `npm run catalog:import` | Importa músicas reais das APIs do Deezer/iTunes |
| `npm run format` | Prettier |

## Stack

- **Next.js 14.2** (App Router) + **React 18.3** + **TypeScript 5.5** (`strict`, alias `@/*`)
- **Tailwind CSS 3.4** — tema claro/escuro por classe, respeitando `prefers-color-scheme`
- **Zustand 4** — estado de jogo e preferências, persistidos em `localStorage`
- **Web Audio API** — corte no milissegundo, fade de 80 ms e trilhas sincronizadas (não usa `<audio>`)
- **Route Handlers (Node)** — puzzle do dia, prévias de áudio e estatísticas globais opcionais
- **Vitest** — 54 testes sobre a lógica pura, sem tocar na UI

```
app/            rotas (menu, /trecho, /banda) + /api
components/     UI (client components)
lib/game/       lógica pura: sorteio diário, palpites, máquina de estados, stats, share
lib/audio/      gerador procedural, provedor plugável e motor de reprodução
lib/puzzle/     resolução do puzzle do dia (local ou via API)
store/          Zustand (jogo + preferências)
data/songs.json catálogo
scripts/        validação do catálogo (roda antes do build)
```

## Importando músicas reais (sem hospedar áudio)

Em vez de baixar e servir mp3, dá pra puxar **prévias oficiais de 30s** de APIs públicas e gratuitas — sem chave, sem OAuth:

```bash
npm run catalog:import -- --fonte deezer --preset classicos     # ~47 artistas consagrados
npm run catalog:import -- --fonte deezer --preset kpop --juntar # acrescenta K-pop
npm run catalog:import -- --fonte deezer --limite 50            # chart do Brasil
npm run catalog:import -- --fonte deezer --busca "rock nacional" --limite 30 --juntar
```

| Opção | Padrão | O que faz |
| --- | --- | --- |
| `--fonte` | `deezer` | `deezer` (1 chamada, já traz a prévia) ou `itunes` (chart + busca, mais lento) |
| `--preset` | — | `classicos` ou `kpop`: listas curadas de artistas em `scripts/import-catalog.ts` |
| `--por-artista` | `3` | Faixas por artista no preset |
| `--pais` | `br` | País do chart |
| `--limite` | `50` | Quantas músicas importar (chart/busca) |
| `--busca` | — | Importa de uma busca em vez do chart |
| `--juntar` | — | Acrescenta ao catálogo atual em vez de substituir |
| `--saida` | `data/songs.json` | Arquivo de destino |

O importador descarta versões ao vivo, remix e karaokê (atrapalham o reconhecimento) e evita que a mesma música entre duas vezes por causa de "Remastered".

Depois rode `npm run catalog:check`.

Duas coisas que o importador resolve por você:

- **As URLs de prévia do Deezer são assinadas e expiram em cerca de um dia.** Por isso o catálogo guarda a referência da faixa (`"previewId": "deezer:123"`), não o link; `/api/preview` resolve a URL fresca a cada partida. As do iTunes são estáveis e ficam gravadas em `clip`.
- **Nada de CORS nem de chamadas externas no cliente**: o áudio passa por `/api/preview/stream`, que só aceita hosts da allowlist.

Prévia não tem trilhas isoladas, mas isso **não** deixa a música de fora do modo Banda: sem stems, a revelação acontece por faixa de frequência (`lib/audio/layers.ts`), aplicada com filtros do Web Audio no próprio navegador.

Na tela de revelação, músicas com id do Deezer ganham o **widget oficial** da faixa (`components/FullTrackPlayer.tsx`) — o mesmo papel que o embed do SoundCloud cumpre no Songless, e também sem chave de API. O widget toca 30s para quem não está logado no Deezer, e a faixa inteira para quem está.

### Por que Deezer e não SoundCloud

Testado em 14/08/2026:

| | SoundCloud | Deezer / iTunes |
| --- | --- | --- |
| Busca sem chave | `401` na API pública e na `api-v2` interna | `200`, sem cadastro |
| Descobrir a faixa por artista/título | sem caminho público | `/search/artist` + `/artist/{id}/top` |
| oEmbed sem chave | funciona, mas exige já saber a URL da faixa | — |
| Bytes do áudio | `resolve` → `401`; iframe cross-origin bloqueia | mp3 baixável e decodificável |
| Música inteira deslogado | sim (vantagem real dele) | 30s sem login |

O jogo precisa do `AudioBuffer`, não de um player: sem as amostras não dá para cortar em 0,1s com fade, nem para aplicar os filtros do modo Banda. Um widget em iframe de outra origem não entrega isso — o que também explica por que o Songless, que usa SoundCloud, não tem um modo estilo Bandle.

## Precisa de banco de dados?

Não — e por bastante tempo. O catálogo é um JSON lido em tempo de build:

| Catálogo | `songs.json` | Peso no bundle (gzip) |
| --- | --- | --- |
| 236 músicas (atual) | 69 KB | ~13 KB |
| ~1.000 músicas | ~290 KB | ~50 KB |

Regra prática: **até ~1.000 músicas o JSON resolve**. O áudio nunca pesa, porque mora no CDN da fonte.

Vale migrar para banco (Supabase — a rota `/api/stats` já está preparada) quando aparecer alguma destas necessidades:

- passar de alguns milhares de músicas;
- editar o catálogo sem fazer deploy (painel de curadoria);
- ranking global, contas de usuário ou histórico entre dispositivos;
- programar a fila de puzzles à mão em vez de sortear.

Antes disso, existe um degrau mais barato: manter o JSON como fonte e servi-lo por um Route Handler com cache, tirando o catálogo do bundle — sem banco nenhum.

## Adicionando músicas

Edite `data/songs.json`. Cada entrada aceita três fontes de áudio (`source`):

### 1. `local` — seus arquivos em `public/audio`

```json
{
  "id": "song-100",
  "title": "Nome da Música",
  "artist": "Artista",
  "year": 1997,
  "cover": "/covers/song-100.jpg",
  "source": "local",
  "clip": "/audio/song-100/clip.mp3",
  "stems": {
    "drums": "/audio/song-100/drums.mp3",
    "bass": "/audio/song-100/bass.mp3",
    "guitar": "/audio/song-100/guitar.mp3",
    "keys": "/audio/song-100/keys.mp3",
    "other": "/audio/song-100/other.mp3",
    "vocals": "/audio/song-100/vocals.mp3"
  }
}
```

O `clip` alimenta o modo Trecho; as `stems` alimentam o modo Banda. **Sem as 6 stems a música só aparece no modo Trecho** — `npm run catalog:check` avisa quando isso acontece e quebra o build se um arquivo declarado não existir.

### 2. `preview` — prévia oficial de 30s

Normalmente vem do `catalog:import`, mas dá pra escrever à mão:

```json
{
  "id": "deezer-3135556", "title": "...", "artist": "...", "year": 2001,
  "source": "preview", "previewId": "deezer:3135556"
}
```

`/api/preview` resolve a prévia — por `previewId` (exato) ou, sem ele, por busca de artista + título — e `/api/preview/stream` repassa o mp3 pelo seu domínio. Prévias **não têm trilhas separadas**, então só servem o modo Trecho.

### 3. `synth` — faixa gerada (padrão do repo)

```json
{
  "id": "song-001", "title": "...", "artist": "...", "year": 2019, "source": "synth",
  "synth": { "bpm": 92, "root": 45, "mode": "minor", "progression": [0, 8, 3, 10], "seed": 1001 }
}
```

`root` é uma nota MIDI, `progression` são semitons relativos à tônica (um acorde por compasso) e `seed` deixa o resultado determinístico. O gerador (`lib/audio/synth.ts`) monta as 6 trilhas separadas, então **músicas `synth` funcionam nos dois modos**.

Campos opcionais úteis: `cover` (sem ele, uma capa em gradiente é gerada a partir do `id`) e `aliases` (grafias alternativas aceitas na busca — a busca já ignora acentos e maiúsculas).

## Trocando o provedor de áudio

`lib/audio/provider.ts` define a interface `AudioProvider` (`loadClip` / `loadStem`). Há quatro implementações: `SynthProvider`, `LocalFileProvider`, `PreviewApiProvider` e `CompositeProvider` (escolhe música a música pelo campo `source` — é o padrão).

Para forçar um provedor, use `NEXT_PUBLIC_AUDIO_PROVIDER` (`auto` | `synth` | `local` | `preview`). Para plugar outra fonte (S3, CDN própria, outra API), implemente a interface e devolva-a em `createProvider()` — nem a UI nem o motor de reprodução mudam.

## Backend (opcional)

Copie `.env.example` para `.env.local`.

**Puzzle do dia.** Por padrão (`NEXT_PUBLIC_PUZZLE_SOURCE=local`) tudo é resolvido no cliente a partir do catálogo — como no Wordle, a resposta é descobrível no devtools. Com `NEXT_PUBLIC_PUZZLE_SOURCE=api`, o puzzle vem de `/api/puzzle`, que usa **a data do servidor e não aceita parâmetro de data** — não há como pedir a resposta de amanhã. Se a rota falhar, o cliente cai no modo local.

**Estatísticas globais.** Desligadas por padrão. Preencha `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` e ligue `NEXT_PUBLIC_GLOBAL_STATS=on` para que `/api/stats` registre e agregue os resultados do dia (a chave de serviço nunca sai do servidor):

```sql
create table results (
  id bigint generated always as identity primary key,
  mode text not null check (mode in ('trecho','banda')),
  puzzle_number int not null,
  attempts int not null check (attempts between 0 and 6),
  won boolean not null,
  created_at timestamptz not null default now()
);
create index results_lookup on results (mode, puzzle_number);
alter table results enable row level security; -- só a service role escreve
```

As estatísticas pessoais continuam em `localStorage` (`gtm:v1:*`, com migração segura de schema) e funcionam offline mesmo com o backend ligado.

## Licenciamento do conteúdo musical

O código é seu; **a música não vem junto**. As 8 faixas que acompanham o repositório são geradas por síntese (originais, sem terceiros envolvidos) justamente para o jogo rodar sem material de terceiros.

Para publicar com músicas reais, use apenas conteúdo que você pode usar:

- **próprio** ou de domínio público;
- **licenciado** — Creative Commons, Free Music Archive, Jamendo, ccMixter (respeitando cada licença e atribuindo quando exigido);
- **prévias oficiais** de 30s via iTunes/Deezer, dentro dos termos de cada API.

O modo Banda **não** exige separação de stems: com prévias ele revela por faixa de frequência, que é só filtragem em tempo real do áudio autorizado, sem gerar nem distribuir derivado. Se você quiser a revelação instrumento a instrumento de verdade, aí sim precisa de multipistas próprias, material licenciado para esse uso, ou separação por IA (Demucs, Spleeter) aplicada **somente** a faixas que você tem direito de processar e distribuir — separar stems de música comercial e publicá-las não é coberto por uso legítimo.

## Acessibilidade

Navegação completa por teclado (`Espaço` toca/para, `Enter` envia, setas percorrem o autocomplete, `Esc` fecha), foco visível, `aria-live` anunciando cada tentativa, combobox com `role`/`aria-activedescendant`, alvos de toque ≥44px, contraste AA e `prefers-reduced-motion` respeitado.
