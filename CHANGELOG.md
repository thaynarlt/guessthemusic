# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [0.7.0] — 2026-08-18

### Adicionado

- **Gênero "Cristã"**, com 218 músicas de 58 artistas do louvor brasileiro — de
  Padre Fábio de Melo, Padre Marcelo Rossi e Anjos de Resgate a Colo de Deus,
  Frei Gilson e Fraternidade São João Paulo II, com o louvor evangélico da mesma
  playlist junto (Kleber Lucas, Jessé Aguiar, Thiago Brado). A lista de artistas
  saiu de uma playlist de referência e virou o preset `crista` do importador,
  então dá para refazer a importação. O gênero aparece sozinho no modo livre, no
  duelo e na sala: a lista sai dos dados, não de uma constante.
  **O catálogo foi de 1871 para 2089 músicas, e por isso as respostas do puzzle
  diário mudaram** — quem estava com a partida do dia em andamento recomeça.
- **`--ao-vivo` e `--titulo-unico` no importador.** O padrão de recusar gravação
  ao vivo esvaziaria este gênero (o Frei Gilson tem 19 das 20 faixas mais
  tocadas ao vivo), então agora dá para aceitá-las — e a marca "- Ao Vivo" sai
  do título, o que de quebra impede a versão de estúdio e a ao vivo de ocuparem
  duas vagas. O `--titulo-unico` resolve o outro traço do gênero: como cada
  comunidade grava o mesmo louvor, duas gravações do mesmo título virariam duas
  respostas certas para o mesmo áudio, e quem escolhesse a outra levaria erro.
- **Grupos dos anos 2000 e 2010**, a era das boy e girl bands, que o catálogo só
  tinha pelos solistas que saíram delas: One Direction, Fifth Harmony, Little
  Mix, Destiny's Child, Spice Girls, \*NSYNC, The Pussycat Dolls, Westlife, Big
  Time Rush, RBD, The Wanted, JLS, Girls Aloud, Sugababes, The Saturdays,
  t.A.T.u., CNCO, Now United, Aly & AJ e Why Don't We em **pop**; 5 Seconds Of
  Summer, Simple Plan, Good Charlotte, All Time Low, The All-American Rejects,
  McFly e Boys Like Girls em **rock**, junto do blink-182 e do Paramore que já
  estavam lá. São 209 músicas.
- **Uma música pode ter mais de um gênero.** O campo `genre` (texto) virou
  `genres` (lista) e o filtro aceita a música por qualquer um deles. Existe
  porque música não respeita gaveta: o disco solo das integrantes do BLACKPINK é
  K-pop e pop ocidental do primeiro ao último compasso, e obrigar a escolher
  escondia a música de metade de quem a procura. São 49 músicas em dois gêneros.
- **Id do artista no preset do importador** (`'LISA#145068682'`), para os nomes
  que a busca do Deezer não resolve. A LISA do BLACKPINK não aparecia nem entre
  os dez primeiros resultados de "LISA", e o desempate por fãs entregava uma
  homônima — por isso ela estava fora do catálogo.

### Alterado

- **Elenco de K-pop revisto**: saíram TREASURE, BOYNEXTDOOR, ATEEZ, ZEROBASEONE,
  THE BOYZ, STAYC, Girls' Generation, G-DRAGON, HyunA, TAEYEON, CL, RAIN, SUNMI,
  Chung Ha e TAEYANG (144 músicas); entraram JISOO e LISA, e BLACKPINK, JENNIE e
  BABYMONSTER ganharam mais música — o BABYMONSTER tinha só uma, porque as
  faixas dele no Deezer são quase todas ao vivo e o importador as recusava.
- **Sorteio do modo livre com descanso de música e de artista.** O histórico
  antigo guardava 8 músicas e só olhava o id: a mesma música podia voltar na
  nona rodada e o mesmo cantor, na seguinte — e como cada artista tem até 12
  músicas no catálogo, isso acontecia o tempo todo em sessão longa. Agora cada
  candidata entra no sorteio com um peso: zero enquanto está de quarentena (40%
  do pool para a música, 15% dos artistas para o cantor), subindo aos poucos até
  voltar ao normal. No catálogo inteiro dá mais de 100 rodadas sem repetir
  música e cerca de 15 sem repetir artista; com filtro estreito os prazos
  encolhem junto, para nunca travar o sorteio. Vale também para o duelo e para a
  sala online. O histórico do modo livre passou a sobreviver a ir ao menu e
  voltar — antes zerava com a tela.

## [0.6.0] — 2026-08-16

### Adicionado

- **Formato Corrida na sala online.** O trecho cresce sozinho a cada 8s, igual
  para todo mundo ao mesmo tempo, e vale um ponto a menos por degrau — a dúvida
  "arrisco agora ou ouço mais?" é o jogo. A versão ingênua de "quem acerta
  primeiro" premiaria quem digita rápido e chuta muito, porque errar liberaria
  mais música; o relógio compartilhado corrige isso. Vem com bônus de 1º, 2º e
  3º (senão a rodada morre no primeiro acerto), trava de 4s ao errar, contador
  de quantos já acertaram, última chamada e pote que dobra depois de rodada
  seca. A ordem de chegada é decidida pelo relógio do anfitrião, não pelo
  cronômetro de cada aparelho — senão quem tem internet pior ganharia a corrida.
- **Filtro de catálogo por gênero, época e artista** no duelo e na sala, tudo
  múltipla escolha. A época sai de graça do campo `year`, que já existia limpo
  nas 1871 músicas; antes de 1990 vira um balde só, porque o catálogo tem 4
  músicas dos anos 60 e 27 dos 70. A contagem aparece ao vivo e o botão de
  começar trava quando sobra pouca música — cruzar dois filtros esvazia rápido
  (k-pop antes de 1990 são zero músicas), e descobrir isso jogando seria pior.

## [0.5.0] — 2026-08-16

### Adicionado

- **Efeitos sonoros no site todo**, gerados na hora por Web Audio — nenhum
  arquivo de áudio, seguindo a mesma lógica das faixas de exemplo. Acerto, erro,
  pulo, revelação, vitória, chat, entrada de jogador e o tique da contagem
  regressiva. **Efeito nenhum toca por cima do trecho**: o jogo pede para
  reconhecer 0,2s de música, e um blip ali seria sabotagem, não enfeite. Tem
  botão de mudo no cabeçalho, com a preferência guardada.
- **Filtro de gênero no lobby da sala**, escolhido pelo anfitrião e propagado
  para todo mundo. Quem não decide agora vê o resumo do que vem aí (modo,
  rodadas, gênero) em vez de um "esperando" sem contexto.
- **"Como funciona a sala"**, com a curva 6→1 desenhada. A regra que mais
  importa só aparecia depois de a pessoa já estar jogando.
- **Conversa da sala**, recolhida por padrão e com contador do que chegou —
  numa tela de celular a partida precisa do espaço mais do que o chat. Quem
  entra e quem sai aparece na mesma lista, deduzido da presença: não custa
  mensagem nenhuma a mais.
- **Aviso de tempo acabando**: o cronômetro da sala vira alerta nos últimos 15s.
- **Confirmação ao sair da sala**, já que sair apaga os pontos e a sessão — o
  diálogo explica que fechar a aba deixa voltar.
- **Pódio** no lugar do placar no fim da partida, no duelo também.
- **Busca e pontuação por artista convidado.** Procurar "Anitta" não achava
  "Major Lazer - Sua Cara", porque o Deezer devolve o título dessa faixa sem o
  featuring. O campo `featuring` (novo) foi preenchido em 343 das 1871 músicas
  por `npm run catalog:featuring`, e chutar a convidada agora marca amarelo.
- **Voltar para a sala recente.** Quem fecha a aba sem querer encontra o
  caminho de volta em `/sala`, e abrir o link da sala de novo reentra sozinho.

### Corrigido

- **Áudio mudo depois de sair do app no celular.** Trocar de app no iOS manda o
  `AudioContext` para `interrupted`, e ao voltar o `resume()` sozinho muitas
  vezes não ressuscita: o contexto ficava preso e o jogo só sabia dizer que o
  navegador tinha bloqueado o áudio. Agora ele é jogado fora e outro é aberto —
  junto com o cache de buffers, que pertencem ao contexto morto.
- **Recarregar a página não perde mais a partida da sala.** O placar indexa os
  pontos pelo id do jogador, e esse id nascia aleatório a cada carregamento:
  quem atualizava voltava zerada e aparecia duas vezes na lista. A sessão agora
  é guardada por duas horas e reentrar na mesma sala reusa o id.

## [0.4.0] — 2026-08-15

### Adicionado

- **Duelo local (`/duelo`).** De 2 a 4 pessoas em um aparelho só, disputando a
  mesma música: quem está com a vez ouve o trecho atual e chuta; se errar ou
  pular, a vez passa para a próxima, que ouve mais tempo e vale menos pontos.
  Quem acertar leva os pontos do degrau e encerra a rodada. Quem abre a rodada
  roda a cada rodada, porque começar vale mais mas entrega o degrau seguinte de
  graça a quem vem depois.
- **Sala online (`/sala`).** Código de 4 letras, até 8 pessoas, todo mundo com a
  mesma música ao mesmo tempo — cada um no seu ritmo. A rodada fecha quando
  todos respondem ou quando estouram 90s, para quem fechou a aba não travar a
  sala. **Não precisa de banco**: usa só os canais de Realtime do Supabase
  (Broadcast + Presence), sem tabela nenhuma, e fica desligada até
  `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` existirem.
- **Pontuação por degrau** (`lib/game/score.ts`), base dos dois modos: 6 pontos
  em 0,2s, caindo um a cada degrau liberado até 1 em 15s, e zero para quem não
  acertou. Como errar e pular consomem o mesmo degrau, custam a mesma coisa —
  pular nunca é vantagem, só economia de tempo.

### Alterado

- **Primeira tentativa do Trecho passou de 0,1s para 0,2s.** Em 0,1s o ouvido
  mal registrava um transiente — a tentativa virava chute puro. A curva agora é
  `0,2s → 0,5s → 2s → 4s → 8s → 15s`.
- **Núcleo de áudio virou um hook** (`lib/audio/useSnippetPlayer.ts`) com o
  bloco visual em `components/AudioDeck.tsx`. Os três modos mostram o mesmo
  player em cima do mesmo comportamento; sem isso, duelo e sala teriam copiado
  a parte mais delicada do jogo. O comportamento do diário e do livre não mudou.

## [0.3.0] — 2026-08-15

### Adicionado

- **Trecho sorteado dentro da música.** O jogo tocava sempre o começo da prévia,
  e as prévias do Deezer/iTunes já vêm cortadas no refrão — ou seja, a parte
  fácil. Agora o ponto de partida é sorteado (`lib/audio/startPoint.ts`) a
  partir de uma semente estável (id da música + número do puzzle): o desafio do
  dia sai igual para todo mundo, o ponto não muda entre as tentativas nem nos
  replays, e no modo Banda todas as trilhas saem do mesmo instante. O sorteio
  mede a energia do sinal e descarta os começos mudos, para a primeira
  tentativa de 0,1s nunca cair num silêncio.

- **Distribuição na tela de revelação.** Terminada a partida do diário, o card
  mostra em qual tentativa a galera acertou (1 a 6, mais a barra `X` de quem não
  acertou), com a sua linha destacada em verde e a frase "você ficou entre os
  X% melhores de hoje". Com o backend desligado, o mesmo gráfico usa o seu
  histórico local; sem partida nenhuma registrada, a seção não aparece.
- **Ícone do site.** Colcheia neon sobre o roxo da marca: `app/icon.svg` na aba
  do navegador, `app/apple-icon.png` (180px) para a tela inicial do iPhone e
  `manifest.webmanifest` com os PNGs de 192/512 e a versão `maskable` para o
  Android — o jogo agora instala como app, em tela cheia.
- **Página `/termos`.** Aviso de projeto de hobby, créditos das inspirações
  (Wordle, Heardle, Songless, Bandle), origem das prévias e o que fica guardado
  no aparelho e no servidor. Bilíngue, como o resto da interface.

- **Compartilhamento no modo livre.** Como cada rodada sorteia uma música, ali
  não há resposta comum a proteger: o card ganhou os botões de compartilhar,
  e a imagem mostra capa, título e artista.

### Corrigido

- **A imagem do desafio do dia entregava a resposta.** O texto já era
  spoiler-free (só placar e emojis), mas a imagem desenhava capa, título e
  artista — quem recebesse no WhatsApp via a música que ainda precisava
  adivinhar. Agora, no diário, a capa vira um cartão fechado com "?" e o lugar
  do título traz "Qual e a musica de hoje?".
- No modo livre o cabeçalho não mostra mais `#1`: ali o número é a contagem de
  rodadas da sessão, que não significa nada para quem recebe. Texto e imagem
  passaram a montar esse título pela mesma função (`shareTitle`), que era de
  onde vinha a divergência.

### Alterado

- `/api/stats` passa a devolver `losses` no agregado do dia, e a barra de
  distribuição virou o componente `GuessDistribution`, usado tanto no card de
  revelação quanto no modal de estatísticas.

## [0.2.1] — 2026-08-15

### Corrigido

- **iPhone tocava sem som.** No iOS o `AudioContext` sai por padrão na categoria
  "ambient", que a chave de silencioso do aparelho corta — o jogo parecia tocar
  (botão virava pause, barra andava) mas ficava mudo, mesmo com o volume alto.
  Agora o motor declara a categoria `playback` (Safari 16.4+), que ignora a
  chave. Em navegadores sem a API, não faz nada.
- O contexto de áudio agora é retomado sempre que não estiver em `running`, e
  não só quando estiver `suspended` — no iOS ele também entra em `interrupted`
  ao receber ligação ou quando outro app toca som.
- Quando o navegador bloqueia o áudio, a tela explica o motivo e sugere conferir
  a chave de silencioso, em vez de ficar em silêncio sem dizer nada.

## [0.2.0] — 2026-08-15

### Alterado

- `.env.example` passa a listar as seis variáveis que o código realmente lê,
  incluindo `NEXT_PUBLIC_SITE_URL`, que faltava. Deixa explícito que todas são
  opcionais e que a service role key do Supabase nunca pode receber o prefixo
  `NEXT_PUBLIC_`, sob pena de ir parar no pacote enviado ao navegador.

## [0.1.0] — 2026-08-15

Primeira versão jogável.

### Adicionado

**Modos de jogo**

- **Trecho** — 6 tentativas, com o trecho crescendo `0,1s → 0,5s → 2s → 4s → 8s → 15s`.
- **Banda** — revelação em camadas: por instrumento quando a música tem trilhas
  isoladas, por faixa de frequência (graves → brilho) quando não tem.
- **Modo livre** — rodadas ilimitadas, sem esperar a virada do dia, com filtro de
  gênero e placar da sessão. Não interfere na sequência do desafio diário.

**Catálogo**

- 1.871 músicas em 5 gêneros (pop, rock, K-pop, hip-hop, eletrônica), usando
  prévias oficiais de 30s — nenhum áudio é hospedado pelo projeto.
- `catalog:import` traz músicas do Deezer/iTunes por preset, busca ou lista de
  artistas; `catalog:clean` remove artistas e normaliza nomes; `catalog:check`
  valida o catálogo e quebra o build se algo estiver inconsistente.

**Áudio**

- Web Audio com corte exato, fade de 80 ms e trilhas em sincronia.
- Provedor plugável: sintetizado, arquivo local ou prévia de API.
- Download direto do CDN (que aceita CORS), com proxy próprio como reserva.
- Controle de volume persistente, com curva quadrática e ganho separado do fade.

**Interface**

- Tema claro/escuro, pt-BR e inglês, ícones Lucide, Space Grotesk + Inter.
- Estatísticas locais com distribuição de acertos e sequência.
- Compartilhamento com imagem 1080×1080 gerada em canvas (capa, música e placar)
  e meta tags Open Graph para a prévia do link.

**Infraestrutura**

- Route Handlers para puzzle do dia, resolução de prévia, proxy de capa e
  estatísticas globais opcionais (Supabase).
- 82 testes de lógica pura; CI com lint, tipos, testes e build.

### Notas

- O progresso do diário vive no `localStorage`: é por navegador e não impede
  que alguém limpe os dados e jogue de novo.
- Reimportar o catálogo muda as respostas do puzzle diário, porque o sorteio
  deriva da lista de músicas.

[0.6.0]: https://github.com/thaynarlt/guessthemusic/releases/tag/v0.6.0
[0.5.0]: https://github.com/thaynarlt/guessthemusic/releases/tag/v0.5.0
[0.4.0]: https://github.com/thaynarlt/guessthemusic/releases/tag/v0.4.0
[0.3.0]: https://github.com/thaynarlt/guessthemusic/releases/tag/v0.3.0
[0.2.1]: https://github.com/thaynarlt/guessthemusic/releases/tag/v0.2.1
[0.2.0]: https://github.com/thaynarlt/guessthemusic/releases/tag/v0.2.0
[0.1.0]: https://github.com/thaynarlt/guessthemusic/releases/tag/v0.1.0
