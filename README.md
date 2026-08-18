# GuessTheMusic

Jogo diário de adivinhar música, com dois modos:

- **Trecho** — você ouve um piscar de olho. Cada erro ou pulo libera mais tempo: `0,2s → 0,5s → 2s → 4s → 8s → 15s` (a mesma curva do Songless). O ponto de partida é **sorteado dentro da música**, não o começo da prévia — que as APIs já entregam cortada no refrão. O sorteio é determinístico (semente = id da música + número do puzzle), então o desafio do dia é o mesmo para todo mundo e o trecho não muda entre as tentativas; começos mudos são descartados por energia do sinal (`lib/audio/startPoint.ts`).
- **Banda** — a música vai se abrindo em camadas, uma por erro, até tocar inteira. Como a fonte manda:
  - **por instrumento** (`bateria → baixo → guitarra → teclado → outros → vocal`) quando a música tem trilhas isoladas;
  - **por faixa de frequência** (`graves → médios-graves → médios → médios-agudos → agudos → brilho`) quando não tem — que é o caso das prévias de streaming. Em ambos dá para ligar/desligar cada camada já liberada; na revelação final o clipe toca limpo, sem filtro.

São 6 tentativas por modo, um puzzle novo por dia (meia-noite UTC), estatísticas locais e resultado compartilhável em emojis.

Cada modo tem duas variantes:

- **Diário** (`/trecho`, `/banda`) — um puzzle por dia, com sequência, estatísticas e compartilhamento.
- **Livre** (`/livre/trecho`, `/livre/banda`) — rodadas ilimitadas, sem esperar o dia virar. Sorteia uma música na hora, dá um bom descanso à música e ao artista que acabaram de sair (`lib/game/rotation.ts`) e mantém um placar da sessão. **Não grava nada e não mexe na sequência do diário.**

## Multijogador

Os dois modos multijogador usam a mesma pontuação: **acertar no trecho de 0,2s vale 6 pontos, e cada degrau liberado vale um ponto a menos** — 6, 5, 4, 3, 2, 1, e zero para quem não acertou. Como errar e pular consomem o mesmo degrau, custam a mesma coisa; pular só serve para não perder tempo, nunca é vantagem. Nenhum dos dois grava nada nem mexe na sequência do diário.

- **Duelo** (`/duelo`) — de 2 a 4 pessoas em um aparelho só, **disputando a mesma música**. A primeira ouve 0,2s e chuta; se errar ou pular, a vez passa para a próxima, que ouve 0,5s mas já vale só 5 pontos. Quem acertar leva os pontos daquele degrau e a rodada acaba. Quem abre a rodada roda a cada rodada, porque começar é vantagem e desvantagem ao mesmo tempo: vale mais, mas entrega o degrau seguinte de graça a quem vem depois.
- **Sala online** (`/sala`) — estilo Gartic: cria uma sala, compartilha um código de 4 letras e todo mundo ouve **a mesma música ao mesmo tempo**, cada um no seu ritmo, até 8 pessoas. Quem reconhece antes pontua mais. A rodada fecha quando todo mundo responde ou quando estouram 90s — assim quem fechou a aba não trava a sala. Empate no total é desempatado pelo tempo de resposta. Tem conversa, aviso de quem entra e sai, e pódio no fim. A sala tem dois formatos:

  - **No seu ritmo** — cada um libera o próprio trecho, sem pressa.
  - **Corrida** — o trecho cresce sozinho a cada 8s, igual para todos ao mesmo tempo, e vale um ponto a menos por degrau. Arriscar cedo paga mais; ouvir mais custa. Quem chega em 1º, 2º e 3º ganha bônus (senão a rodada morre no primeiro acerto), errar trava seu palpite por 4s, e rodada em que ninguém acerta faz a próxima valer em dobro.

Nos dois dá para **filtrar o sorteio por gênero, época e artista** — tudo múltipla escolha, com a contagem de músicas ao vivo. Como cruzar filtros esvazia o catálogo rápido (k-pop antes de 1990 são zero músicas), a tela avisa quando as músicas vão repetir e trava quando não dá para jogar.

A sala online é o **único** pedaço do jogo que precisa de infraestrutura; o resto continua rodando com `npm run dev` e mais nada. Veja [Sala online](#sala-online-opcional).

## Rodando

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. **Não precisa de backend, banco nem arquivo de áudio**: o catálogo vem com 8 faixas geradas proceduralmente (Web Audio puro), então o jogo é jogável no primeiro `npm run dev`.

| Comando                     | O que faz                                            |
| --------------------------- | ---------------------------------------------------- |
| `npm run dev`               | Servidor de desenvolvimento                          |
| `npm run build`             | Valida o catálogo e faz o build de produção          |
| `npm start`                 | Sobe o build de produção                             |
| `npm test`                  | Testes da lógica pura e do gerador de áudio (Vitest) |
| `npm run lint`              | ESLint (`eslint-config-next`)                        |
| `npm run catalog:check`     | Valida `data/songs.json` sozinho                     |
| `npm run catalog:import`    | Importa músicas reais das APIs do Deezer/iTunes      |
| `npm run catalog:featuring` | Preenche os artistas convidados de cada música       |
| `npm run format`            | Prettier                                             |

## Stack

- **Next.js 14.2** (App Router) + **React 18.3** + **TypeScript 5.5** (`strict`, alias `@/*`)
- **Tailwind CSS 3.4** — tema claro/escuro por classe, respeitando `prefers-color-scheme`
- **Zustand 4** — estado de jogo e preferências, persistidos em `localStorage`
- **Web Audio API** — corte no milissegundo, fade de 80 ms, trilhas sincronizadas (não usa `<audio>`) e os efeitos de interface, gerados na hora em vez de servidos como arquivo
- **Route Handlers (Node)** — puzzle do dia, prévias de áudio e estatísticas globais opcionais
- **Supabase Realtime** — só a sala online, e só os canais: sem tabela e carregado sob demanda
- **Vitest** — 264 testes sobre a lógica pura, a sala e os scripts, sem tocar na UI

```
app/            rotas (menu, /trecho, /banda, /duelo, /sala) + /api
components/     UI (client components)
lib/game/       lógica pura: sorteio diário, rotação do modo livre, palpites, máquina de estados, duelo, pontos, filtro, stats, share
lib/audio/      gerador procedural, provedor plugável e motor de reprodução
lib/puzzle/     resolução do puzzle do dia (local ou via API)
lib/room/       sala online: protocolo, código e canal de Realtime
store/          Zustand (jogo, duelo, sala + preferências)
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
npm run catalog:import -- --preset crista --por-artista 6 --ao-vivo --titulo-unico --juntar
```

| Opção            | Padrão            | O que faz                                                                                                                         |
| ---------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `--fonte`        | `deezer`          | `deezer` (1 chamada, já traz a prévia) ou `itunes` (chart + busca, mais lento)                                                    |
| `--preset`       | —                 | `classicos`, `rock`, `pop`, `hiphop`, `eletronica`, `kpop` ou `crista`: listas curadas de artistas em `scripts/import-catalog.ts` |
| `--por-artista`  | `3`               | Faixas por artista no preset                                                                                                      |
| `--pais`         | `br`              | País do chart                                                                                                                     |
| `--limite`       | `50`              | Quantas músicas importar (chart/busca)                                                                                            |
| `--busca`        | —                 | Importa de uma busca em vez do chart                                                                                              |
| `--juntar`       | —                 | Acrescenta ao catálogo atual em vez de substituir                                                                                 |
| `--ao-vivo`      | —                 | Aceita gravações ao vivo (e apaga o "- Ao Vivo" do título)                                                                        |
| `--titulo-unico` | —                 | Uma gravação por título, mesmo de artistas diferentes                                                                             |
| `--saida`        | `data/songs.json` | Arquivo de destino                                                                                                                |

O importador descarta remix, karaokê e afins (atrapalham o reconhecimento) e evita que a mesma música entre duas vezes por causa de "Remastered".

Gravação **ao vivo** também fica de fora por padrão, mas com `--ao-vivo` ela entra e a marca some do título — em gêneros onde o ao vivo é a gravação de referência (o louvor católico, por exemplo, em que o Frei Gilson tem 19 das 20 faixas mais tocadas ao vivo) o padrão esvaziaria o preset. Nesses gêneros vale somar `--titulo-unico`: quando várias comunidades gravam o mesmo louvor, duas gravações do mesmo título viram duas respostas certas para o mesmo áudio, e quem escolhesse a outra levaria erro. Vence a primeira, ou seja, a ordem do preset.

Depois rode `npm run catalog:featuring` e `npm run catalog:check`.

O `--genero` grava **uma** categoria por importação, mas o campo é lista (`genres`): uma música pode estar em dois gêneros ao mesmo tempo e aparece no filtro dos dois. É o caso do disco solo das integrantes do BLACKPINK, que é K-pop e pop ocidental ao mesmo tempo — o segundo gênero é curadoria, aplicada depois da importação.

Um preset também aceita o id do artista no Deezer (`'LISA#145068682'`), para os nomes que a busca não resolve: "LISA" não aparece nem entre os dez primeiros resultados dela mesma, e o desempate por fãs entregaria uma homônima.

### Artistas convidados

O Deezer é inconsistente com participações: "Uptown Funk (feat. Bruno Mars)" vem com o crédito no título, mas "Sua Cara" vem seco — e aí ninguém acha a música procurando por "Anitta". Os convidados só existem em `/track/{id}`, que os endpoints de busca e de chart não trazem, então buscá-los faria o importador demorar o dobro. Por isso é um passo à parte:

```bash
npm run catalog:featuring              # preenche só o que falta
npm run catalog:featuring -- --forcar  # refaz tudo
```

O script **só acrescenta o campo `featuring`**: não mexe em `id`, na ordem do array nem em nenhum valor existente. Isso importa porque o sorteio do puzzle diário deriva da lista de músicas — mudar a ordem faria todo mundo perder a partida do dia. Os convidados entram na busca e valem como "artista certo" no palpite.

Duas coisas que o importador resolve por você:

- **As URLs de prévia do Deezer são assinadas e expiram em cerca de um dia.** Por isso o catálogo guarda a referência da faixa (`"previewId": "deezer:123"`), não o link; `/api/preview` resolve a URL fresca a cada partida. As do iTunes são estáveis e ficam gravadas em `clip`.
- **Nada de CORS nem de chamadas externas no cliente**: o áudio passa por `/api/preview/stream`, que só aceita hosts da allowlist.

Prévia não tem trilhas isoladas, mas isso **não** deixa a música de fora do modo Banda: sem stems, a revelação acontece por faixa de frequência (`lib/audio/layers.ts`), aplicada com filtros do Web Audio no próprio navegador.

Na tela de revelação, músicas com id do Deezer ganham o **widget oficial** da faixa (`components/FullTrackPlayer.tsx`) — o mesmo papel que o embed do SoundCloud cumpre no Songless, e também sem chave de API. O widget toca 30s para quem não está logado no Deezer, e a faixa inteira para quem está.

### Por que Deezer e não SoundCloud

Testado em 14/08/2026:

|                                      | SoundCloud                                      | Deezer / iTunes                       |
| ------------------------------------ | ----------------------------------------------- | ------------------------------------- |
| Busca sem chave                      | `401` na API pública e na `api-v2` interna      | `200`, sem cadastro                   |
| Descobrir a faixa por artista/título | sem caminho público                             | `/search/artist` + `/artist/{id}/top` |
| oEmbed sem chave                     | funciona, mas exige já saber a URL da faixa     | —                                     |
| Bytes do áudio                       | `resolve` → `401`; iframe cross-origin bloqueia | mp3 baixável e decodificável          |
| Música inteira deslogado             | sim (vantagem real dele)                        | 30s sem login                         |

O jogo precisa do `AudioBuffer`, não de um player: sem as amostras não dá para cortar em 0,2s com fade, nem para aplicar os filtros do modo Banda. Um widget em iframe de outra origem não entrega isso — o que também explica por que o Songless, que usa SoundCloud, não tem um modo estilo Bandle.

## Precisa de banco de dados?

Não — e por bastante tempo. Nem para o multijogador: o **Duelo** é local e a **Sala online** precisa de _estado compartilhado_, que é coisa diferente de banco. A sala vive uns dez minutos e morre com a última aba; não há nada para persistir, então ela usa só os canais de Realtime do Supabase (Broadcast + Presence) — **sem tabela, sem schema, sem migração**.

O catálogo é um JSON lido em tempo de build:

| Catálogo              | `songs.json` | Peso no bundle (gzip) |
| --------------------- | ------------ | --------------------- |
| 236 músicas           | 69 KB        | ~13 KB                |
| 2.205 músicas (atual) | 740 KB       | ~98 KB                |

Regra prática: **até uns poucos milhares de músicas o JSON resolve**. O áudio nunca pesa, porque mora no CDN da fonte.

Vale migrar para banco (Supabase — a rota `/api/stats` já está preparada) quando aparecer alguma destas necessidades:

- passar de alguns milhares de músicas;
- editar o catálogo sem fazer deploy (painel de curadoria);
- ranking global, contas de usuário ou histórico entre dispositivos;
- programar a fila de puzzles à mão em vez de sortear;
- guardar o resultado das salas depois que elas acabam (ranking entre amigos que sobrevive ao fim da partida).

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
  "id": "deezer-3135556",
  "title": "...",
  "artist": "...",
  "year": 2001,
  "source": "preview",
  "previewId": "deezer:3135556"
}
```

`/api/preview` resolve a prévia — por `previewId` (exato) ou, sem ele, por busca de artista + título — e `/api/preview/stream` repassa o mp3 pelo seu domínio. Prévias **não têm trilhas separadas**, então só servem o modo Trecho.

### 3. `synth` — faixa gerada (padrão do repo)

```json
{
  "id": "song-001",
  "title": "...",
  "artist": "...",
  "year": 2019,
  "source": "synth",
  "synth": { "bpm": 92, "root": 45, "mode": "minor", "progression": [0, 8, 3, 10], "seed": 1001 }
}
```

`root` é uma nota MIDI, `progression` são semitons relativos à tônica (um acorde por compasso) e `seed` deixa o resultado determinístico. O gerador (`lib/audio/synth.ts`) monta as 6 trilhas separadas, então **músicas `synth` funcionam nos dois modos**.

Campos opcionais úteis: `cover` (sem ele, uma capa em gradiente é gerada a partir do `id`), `aliases` (grafias alternativas aceitas na busca — a busca já ignora acentos e maiúsculas) e `featuring` (artistas convidados, preenchido por `catalog:featuring`).

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

### Sala online (opcional)

Desligada por padrão: sem as variáveis, `/sala` explica o que falta e o resto do jogo — inclusive o Duelo local — segue igual.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

**Não rode SQL nenhum.** Basta criar um projeto no Supabase e copiar as duas chaves de _Settings → API_. A sala usa apenas os canais de Realtime:

- **Broadcast** — as mensagens da partida (`state` e `done`). Não ficam gravadas em lugar nenhum.
- **Presence** — a lista de quem está na sala, com queda de conexão detectada de graça.

Diferente da `SUPABASE_SERVICE_ROLE_KEY` das estatísticas, a chave `anon` **é pública por design** — ela vai para o navegador, e por isso leva o prefixo `NEXT_PUBLIC_`. Como não há tabela, também não há RLS para configurar nem dado exposto.

O plano gratuito cobre 200 conexões simultâneas e 2 milhões de mensagens por mês — uma partida de 6 pessoas gasta algumas dezenas.

Como isso funciona por dentro:

| Peça                    | Onde             | O que faz                                                                             |
| ----------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| `lib/room/protocol.ts`  | puro, testado    | ciclo da rodada, eleição do anfitrião, placar                                         |
| `lib/room/code.ts`      | puro, testado    | código de 4 letras (sem `I`, `O`, `0`, `1`, que confundem quando ditados)             |
| `lib/room/client.ts`    | cliente          | canal do Realtime; `import()` dinâmico, então quem só joga o diário nunca baixa a lib |
| `store/useRoomStore.ts` | cliente, testado | amarra tudo; o teste sobe dois clientes em um canal falso e joga uma partida inteira  |

**Quem manda na sala** é quem chegou primeiro (empate resolvido pelo id, para todo cliente chegar ao mesmo nome sem negociar). Só o anfitriao sorteia a música e fecha a rodada; ele transmite o estado inteiro a cada mudança, em vez de deltas — são poucos bytes e resolve de graça quem entra no meio ou perde uma mensagem. Se ele cair, o próximo da fila assume sozinho.

**Cada jogador roda a máquina de estados de sempre** (`lib/game/machine.ts`) na música da rodada; o que trafega é só o resultado. Por isso a sala não precisou de uma segunda implementação das regras.

**Sobre trapaça:** a resposta está no bundle do cliente, então dá para vê-la no devtools — o mesmo já vale para o desafio diário. Entre amigos, tudo bem. Deixar isso à prova de trapaça exigiria a resposta ficar só no servidor e um token opaco por rodada, o que é outro projeto.

## Licenciamento do conteúdo musical

O código é seu; **a música não vem junto**. As 8 faixas que acompanham o repositório são geradas por síntese (originais, sem terceiros envolvidos) justamente para o jogo rodar sem material de terceiros.

Para publicar com músicas reais, use apenas conteúdo que você pode usar:

- **próprio** ou de domínio público;
- **licenciado** — Creative Commons, Free Music Archive, Jamendo, ccMixter (respeitando cada licença e atribuindo quando exigido);
- **prévias oficiais** de 30s via iTunes/Deezer, dentro dos termos de cada API.

O modo Banda **não** exige separação de stems: com prévias ele revela por faixa de frequência, que é só filtragem em tempo real do áudio autorizado, sem gerar nem distribuir derivado. Se você quiser a revelação instrumento a instrumento de verdade, aí sim precisa de multipistas próprias, material licenciado para esse uso, ou separação por IA (Demucs, Spleeter) aplicada **somente** a faixas que você tem direito de processar e distribuir — separar stems de música comercial e publicá-las não é coberto por uso legítimo.

## Acessibilidade

Navegação completa por teclado (`Espaço` toca/para, `Enter` envia, setas percorrem o autocomplete, `Esc` fecha), foco visível, `aria-live` anunciando cada tentativa, combobox com `role`/`aria-activedescendant`, alvos de toque ≥44px, contraste AA e `prefers-reduced-motion` respeitado.

Nada depende só de som: os efeitos sonoros duplicam informação que já está na tela, e o botão de mudo no cabeçalho desliga todos. Na sala, o cronômetro é anunciado uma vez ao entrar na reta final, e não a cada segundo — repetir seria impossível de acompanhar por leitor de tela.
