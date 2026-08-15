import type { Locale } from '@/lib/i18n/strings';

/** Canal de contato: issue publica, para nao expor e-mail pessoal. */
export const REPO_URL = 'https://github.com/thaynarlt/guessthemusic';

export interface LegalItem {
  term: string;
  text: string;
  /** Link opcional exibido junto do item. */
  href?: string;
}

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  items?: LegalItem[];
}

export interface LegalPage {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
  /** Texto do link de contato no fim da pagina. */
  contact: string;
}

const pt: LegalPage = {
  title: 'Termos e privacidade',
  updated: 'Atualizado em 15 de agosto de 2026',
  intro:
    'Este site e um projeto pessoal, feito por diversao e para estudar Next.js e a Web Audio API. Nao e produto, nao vende nada, nao tem anuncio e nao tem cadastro. O texto abaixo esta em portugues claro de proposito: e para explicar como o jogo funciona por dentro, nao para parecer contrato.',
  sections: [
    {
      heading: 'Um projeto de hobby',
      paragraphs: [
        'Construi o GuessTheMusic por gosto pela musica e para praticar programacao. Nao ganho dinheiro com ele, nao veiculo publicidade e nao tenho plano comercial para o jogo.',
        'O site e oferecido como esta, sem garantia de funcionamento ou de disponibilidade. Ele pode mudar, sair do ar ou perder o progresso guardado no navegador a qualquer momento.',
      ],
    },
    {
      heading: 'Inspiracoes e creditos',
      paragraphs: [
        'O formato de puzzle diario e varias decisoes de mecanica vieram de jogos que eu jogo. Cito todos aqui porque credito e o minimo:',
        'Todo o codigo, os textos, a arte e as faixas de exemplo deste site sao meus ou foram gerados por sintese aqui mesmo. Nao copiei codigo, arquivos, catalogo nem layout desses jogos: o que reaproveitei foram ideias de mecanica, do jeito que todo jogo do genero faz. Nao tenho vinculo, patrocinio nem aprovacao de nenhum deles, e as marcas citadas pertencem aos seus donos.',
      ],
      items: [
        {
          term: 'Wordle',
          text: 'seis tentativas, um puzzle novo por dia e o resultado compartilhavel em emojis.',
          href: 'https://www.nytimes.com/games/wordle',
        },
        {
          term: 'Heardle',
          text: 'a ideia de adivinhar a musica ouvindo trechos que crescem a cada erro.',
        },
        {
          term: 'Songless',
          text: 'a curva de duracao do modo Trecho (0,1s ate 15s) e o player da revelacao.',
          href: 'https://www.songless.app',
        },
        {
          term: 'Bandle',
          text: 'a revelacao instrumento por instrumento, que virou o modo Banda.',
          href: 'https://bandle.app',
        },
      ],
    },
    {
      heading: 'Musica, capas e direitos',
      paragraphs: [
        'O jogo nao hospeda nem redistribui musica. As previas oficiais de 30 segundos e as capas vem das APIs publicas do Deezer e do iTunes, e a musica completa toca dentro do widget oficial do Deezer.',
        'O trecho e cortado e filtrado no seu proprio navegador, so durante a partida: nada e salvo, convertido ou oferecido para download. Se voce e titular de algum direito e quer uma faixa fora do jogo, e so pedir que eu removo.',
      ],
    },
    {
      heading: 'O que o site guarda sobre voce',
      paragraphs: [
        'Nao existe conta, login, cookie de rastreio, anuncio nem ferramenta de analytics. Na pratica:',
        'Nao faco perfil de usuario, nao cruzo dados e nao vendo nada para ninguem — ate porque nao ha o que vender.',
      ],
      items: [
        {
          term: 'No seu aparelho',
          text: 'o progresso do dia, as estatisticas, a sequencia e as preferencias (idioma, tema, volume) ficam no localStorage do navegador, em chaves que comecam com "gtm:v1:". Isso nao sai do seu aparelho e some quando voce limpa os dados do site.',
        },
        {
          term: 'No servidor',
          text: 'se as estatisticas globais estiverem ligadas, ao terminar a partida o site envia apenas o modo, o numero do puzzle, quantas tentativas voce usou e se acertou. Sem nome, sem identificador, sem nada que ligue o resultado a voce — e o que monta a barra de "como foi a galera hoje".',
        },
        {
          term: 'De terceiros',
          text: 'o audio do jogo passa pelo proprio dominio, mas as capas e o player da revelacao vem do Deezer. Nesses dois casos o seu navegador fala direto com eles, que enxergam o seu IP e podem usar os proprios cookies, sob a politica deles.',
        },
        {
          term: 'Registros tecnicos',
          text: 'a hospedagem pode manter logs comuns de acesso (IP, horario e pagina) por seguranca e funcionamento, como qualquer site.',
        },
      ],
    },
    {
      heading: 'Uso do site',
      paragraphs: [
        'Pode jogar, compartilhar o resultado e mostrar para quem quiser. So peco que nao automatize chamadas as rotas do jogo nem tente sobrecarregar o servidor.',
        'O codigo fica publico no GitHub para quem quiser estudar. Se voce for reaproveitar alguma parte, lembre que isso vale para o codigo: a musica nao vem junto, e cada previa segue os termos da API de origem.',
      ],
    },
    {
      heading: 'Duvidas ou pedido de remocao',
      paragraphs: [
        'Qualquer coisa sobre credito, direitos ou privacidade pode ser aberta como issue no repositorio. Respondo e ajusto o que for preciso.',
      ],
    },
  ],
  contact: 'Abrir uma issue no repositorio',
};

const en: LegalPage = {
  title: 'Terms and privacy',
  updated: 'Updated on August 15, 2026',
  intro:
    'This site is a personal project, built for fun and to practice Next.js and the Web Audio API. It is not a product, it sells nothing, it has no ads and no sign-up. The text below is deliberately plain: it explains how the game works, it is not meant to read like a contract.',
  sections: [
    {
      heading: 'A hobby project',
      paragraphs: [
        'I built GuessTheMusic because I like music and wanted to practice coding. I make no money from it, run no advertising and have no commercial plan for it.',
        'The site is provided as is, with no guarantee that it works or stays online. It may change, go away, or lose the progress stored in your browser at any time.',
      ],
    },
    {
      heading: 'Inspirations and credits',
      paragraphs: [
        'The daily-puzzle format and several mechanics came from games I play. Crediting all of them is the least I can do:',
        'All the code, text, artwork and sample tracks on this site are mine or were synthesized right here. I copied no code, no files, no catalog and no layout from those games: what I reused were gameplay ideas, the way every game in the genre does. I have no affiliation with, sponsorship from or endorsement by any of them, and the names above belong to their owners.',
      ],
      items: [
        {
          term: 'Wordle',
          text: 'six tries, one new puzzle a day and the emoji-shareable result.',
          href: 'https://www.nytimes.com/games/wordle',
        },
        {
          term: 'Heardle',
          text: 'the idea of guessing a song from snippets that grow with every miss.',
        },
        {
          term: 'Songless',
          text: 'the snippet curve of the Snippet mode (0.1s up to 15s) and the reveal player.',
          href: 'https://www.songless.app',
        },
        {
          term: 'Bandle',
          text: 'the instrument-by-instrument reveal that became the Band mode.',
          href: 'https://bandle.app',
        },
      ],
    },
    {
      heading: 'Music, artwork and rights',
      paragraphs: [
        'The game neither hosts nor redistributes music. The official 30-second previews and the cover art come from the public Deezer and iTunes APIs, and the full song plays inside the official Deezer widget.',
        'The snippet is cut and filtered in your own browser, only while you play: nothing is stored, converted or offered for download. If you hold rights to a track and want it out of the game, just ask and I will remove it.',
      ],
    },
    {
      heading: 'What the site keeps about you',
      paragraphs: [
        'There is no account, no login, no tracking cookie, no ad and no analytics tool. In practice:',
        'I build no user profiles, cross no data and sell nothing to anyone — there would be nothing to sell anyway.',
      ],
      items: [
        {
          term: 'On your device',
          text: "today's progress, your stats, your streak and your preferences (language, theme, volume) live in the browser's localStorage, under keys starting with \"gtm:v1:\". None of it leaves your device, and clearing the site data wipes it.",
        },
        {
          term: 'On the server',
          text: 'when global stats are enabled, finishing a game sends only the mode, the puzzle number, how many tries you used and whether you got it. No name, no identifier, nothing tying the result back to you — that is what builds the "how everyone did today" bars.',
        },
        {
          term: 'Third parties',
          text: 'the game audio is proxied through this domain, but the cover art and the reveal player come from Deezer. In those two cases your browser talks to them directly, so they see your IP and may set their own cookies, under their policy.',
        },
        {
          term: 'Technical logs',
          text: 'the host may keep ordinary access logs (IP, timestamp and page) for security and operations, like any website.',
        },
      ],
    },
    {
      heading: 'Using the site',
      paragraphs: [
        'Play as much as you like and share your results with anyone. I only ask that you do not automate calls to the game routes or try to overload the server.',
        'The code is public on GitHub for anyone who wants to study it. If you reuse any of it, remember that this covers the code only: the music does not come with it, and every preview follows the terms of the API it comes from.',
      ],
    },
    {
      heading: 'Questions or takedown requests',
      paragraphs: [
        'Anything about credit, rights or privacy can be filed as an issue in the repository. I answer and fix whatever needs fixing.',
      ],
    },
  ],
  contact: 'Open an issue in the repository',
};

export const legalPages: Record<Locale, LegalPage> = { 'pt-BR': pt, en };
