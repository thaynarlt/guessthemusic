# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento [SemVer](https://semver.org/lang/pt-BR/).

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

[0.2.1]: https://github.com/thaynarlt/guessthemusic/releases/tag/v0.2.1
[0.2.0]: https://github.com/thaynarlt/guessthemusic/releases/tag/v0.2.0
[0.1.0]: https://github.com/thaynarlt/guessthemusic/releases/tag/v0.1.0
