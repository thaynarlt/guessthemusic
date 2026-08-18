# Fluxo de trabalho (GitFlow)

## Branches permanentes

| Branch | Papel |
| --- | --- |
| `main` | Produção. Só recebe merge de `release/*` e `hotfix/*`. Todo commit aqui é uma versão publicada e leva tag. |
| `develop` | Integração. É a base do dia a dia e o alvo dos `feature/*`. |

`develop` é a branch de trabalho: nunca commite direto em `main`.

## Branches temporárias

| Prefixo | Sai de | Volta para | Para quê |
| --- | --- | --- | --- |
| `feature/*` | `develop` | `develop` | Funcionalidade nova ou refatoração |
| `release/*` | `develop` | `main` **e** `develop` | Preparar uma versão (ajuste de versão, correções finais) |
| `hotfix/*` | `main` | `main` **e** `develop` | Correção urgente do que está no ar |

Nomeie pelo assunto, em kebab-case: `feature/modo-livre`, `hotfix/audio-mudo-no-safari`.

## Comandos

### Funcionalidade

```bash
git checkout develop && git pull
git checkout -b feature/nome-da-feature
# ... commits ...
git push -u origin feature/nome-da-feature
# abre Pull Request para develop
```

### Release

```bash
git checkout develop && git pull
git checkout -b release/0.2.0
npm version 0.2.0 --no-git-tag-version && git commit -am "chore: versao 0.2.0"
git checkout main && git merge --no-ff release/0.2.0
git tag -a v0.2.0 -m "v0.2.0" && git push origin main --tags
git checkout develop && git merge --no-ff release/0.2.0 && git push
git branch -d release/0.2.0
```

### Hotfix

```bash
git checkout main && git pull
git checkout -b hotfix/descricao-curta
# ... correção ...
git checkout main && git merge --no-ff hotfix/descricao-curta
git tag -a v0.2.1 -m "v0.2.1" && git push origin main --tags
git checkout develop && git merge --no-ff hotfix/descricao-curta && git push
```

O `--no-ff` é proposital: preserva o agrupamento dos commits da branch no histórico.

## Antes de abrir Pull Request

```bash
npm test          # 264 testes da lógica pura, da sala e dos scripts
npm run lint
npm run build     # valida o catálogo e compila
```

## Mensagens de commit

Padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona filtro de genero no modo livre
fix: corrige volume que ignorava o fade
chore: atualiza catalogo para 1871 musicas
docs: documenta o fluxo de branches
test: cobre o sorteio do modo livre
refactor: extrai o rack de trilhas
```

## Deploy

`main` é a branch de produção na Vercel. `develop` gera preview automático a cada push.

Atenção: reimportar o catálogo (`npm run catalog:import`) muda as respostas do puzzle diário, porque o sorteio deriva da lista de músicas. Quem estiver com partida em andamento perde o progresso do dia — evite fazer isso em horário de pico.
