# STATUS

Ultima atualizacao: 2026-10-05

## Resumo

Portfolio em SAPUI5 + TypeScript com o ciclo completo implementado: aplicacao de 8 telas,
camada de dados preparada para troca de fonte, ferramentas de sincronizacao (Credly/GitHub),
gerador de PDF do curriculo e suite de testes.

**Estado:** pronto para revisao visual e publicacao, com dois pontos de conteudo
apontados em "Pendencias".

## Concluido

### Base e build

- [x] Projeto UI5/TypeScript inicializado (`package.json`, `ui5.yaml`, `tsconfig.json`,
      `tsconfig.tools.json`, `eslint.config.mjs`, `.prettierrc`, `.gitignore`).
- [x] OpenUI5 `1.153.0` fixado; `ui5-tooling-transpile` e `ui5-tooling-modules`
      registrados como `customTasks` + `customMiddleware` com `customConfiguration`
      compartilhada por YAML anchor.
- [x] `npm run build` gera `dist/` com modulos AMD (`sap.ui.define`) e sem erros.
- [x] `npm run start` serve a app; validado via HTTP (index, manifest, content e
      controllers respondem 200).

### Dados e regra de negocio

- [x] Contratos em `webapp/model/types.ts` (perfil, experiences, skills, projects,
      certificates, education, courses, github, sections).
- [x] `DataSource` injetavel + `StaticJsonDataSource` (JSON local) e
      `RemoteJsonDataSource` (URL unica, pronta para backend/CAP).
- [x] `content/source.json` escolhe a fonte; padrao `static`.
- [x] `Localizer` (PT/EN em qualquer nivel, sem confundir objeto de dados com texto),
      `validator.ts` (problemas com caminho do campo), `metrics.ts`,
      `viewData.ts` (dados derivados para as views).
- [x] `ContentService` singleton: carrega, valida, traduz, expoe metricas, secoes ativas,
      highlights e listas de destaque.

### Interface (8 telas + 4 fragments)

- [x] Shell: `Component.ts` (models `device`, `ui`, `content`), `index.html`
      (tema, idioma, splash, SEO), `manifest.json`, Topbar e Footer.
- [x] Home, Sobre, Experiencia, Skills, Projetos, Certificacoes, Formacao, Curriculo e 404.
- [x] Filtros: tipo de experiencia (todos/emprego/projeto), tags de projeto,
      ano e validade das certificacoes.
- [x] Formatadores compartilhados (data, periodo, nivel, validade, icone, telefone...).
- [x] Tema claro/escuro e troca de idioma (PT/EN) persistidos.
- [x] `css/components.css` responsivo e `css/print.css` para impressao A4.
- [x] Pagina de CV com botao de download do PDF.

### Ferramentas (Node)

- [x] `tools/shared/nodeContent.ts` - carrega os mesmos JSONs da app via disco.
- [x] `tools/shared/check-content.ts` - `npm run content:check` (falha com `exit 1`).
- [x] `tools/credly/scrape.ts` - 18 badges reais importadas para `certificates.json`;
      preserva entradas manuais; marca "Certified" como destaque; baixa imagens com
      `--download-images`.
- [x] `tools/github/sync.ts` - grava `github.json` (54 repositorios) e atualiza
      estrelas/fors/linguagem dos projetos.
- [x] PDF do curriculo com jsPDF (`webapp/pdf/cvPdf.ts`): gerado na hora no navegador
      pelo botao "Baixar PDF" (idioma ativo) e por `npm run cv:pdf` (arquivo estatico de
      alternativa). A4, duas colunas, 1 pagina sem folha em branco. (05/10/2026)
- [x] Deploy busca Credly/GitHub antes do build (push + diario); sem busca ao vivo no browser.

### Qualidade

- [x] `webapp/typings/` - ponte de tipos entre imports `sap/*` e o namespace global
      (necessaria porque o codigo usa imports ES em modo estrito).
- [x] `npm run lint` sem erros nem avisos.
- [x] `npm run types` passa para app e ferramentas.
- [x] 47 testes Vitest passando (metrics, localizer, viewData, validator, conteudo real).
- [x] `npm run format:check` e `npm run content:check` sem pendencias.
- [x] `README.md` com documentacao completa (inclusive como trocar a fonte de dados).

### Runtime (validado no navegador em 03/10/2026)

- [x] App sobe sem erro no `ui5 serve`: shell completo (topbar, container de rotas,
      footer), splash removido e **0 erros relevantes no console**.
- [x] Layout correto: `.pf-app` com 758px de altura, area de conteudo com 473px, hero
      visivel (topo em 105px), footer em 586px e `scrollTop = 0` na navegacao.
- [x] Tema claro/escuro sincronizado em `Theming`, model `ui>/theme`, atributo
      `data-theme`, `<html>`, fundo do app e `localStorage` - validado com clique real
      (dark inicial -> light -> dark) e persistido apos reload.
- [x] Idioma automatico por navegador (`<html lang="en">` no headless en-US), sem
      toggle PT/EN na interface.
- [x] Os 6 botoes do menu funcionam com clique real e cada rota renderiza conteudo
      (`#/about`, `#/experience`, `#/skills`, `#/projects`, `#/certificates`,
      `#/education`), sem erro de console; rota inexistente cai na tela 404.
- [x] Imagens carregam: avatar em `images/profile.png` (800x800) e as 18 credenciais
      do Credly.
- [x] Impressao do `#/cv`: `print.css` libera a altura/overflow do scroller do
      `sap.m.Page` e o "Salvar como PDF" gera 1 pagina util (1,4 MB) em vez de folha
      em branco.
- [x] `npm run types`, `npm run lint`, `npm test` (47 testes), `npm run content:check`,
      `npm run format:check` e `npm run build` sem pendencias.

### Layout e responsividade (validado por medicao no DOM)

Medido em 360, 390, 768, 1024 e 1440px nas 8 rotas: `scrollWidth` igual a largura da
viewport e **nenhum elemento mais largo que a tela** (topbar e rodape inclusos).

- [x] **Titulo do hero nao estourava a tela.** `sap.m.Title`/`sap.m.Text` nascem com
      `white-space: nowrap`, entao o `<h1>` do hero ficava com 969px de largura e
      empurrava o layout para fora da viewport em tablet e celular (conteudo cortado,
      sem barra de rolagem). `.pf-view .sapMTitle, .pf-view .sapMText` agora quebram
      linha, com `overflow-wrap: break-word`.
- [x] **Itens de flex encolhem.** Itens do UI5 nascem com `min-width: auto`;
      `min-width: 0` foi aplicado nos containers com texto (hero, cartoes, grade de
      duas colunas) para o texto quebrar dentro do cartao em vez de estoura-lo.
- [x] **Barra de filtros quebra linha.** O HBox dos anos de `pf-filterbar` nao tem
      classe `pf-*` e nascia com `sapMFlexBoxWrapNoWrap`: os botoos de ano davam
      474px dentro de 390px. Agora `.pf-filterbar > .sapMHBox/.sapMVBox` quebra linha
      (o mesmo vale para chips, metadados de projeto e acoes do hero).
- [x] **Certificado: titulo sobre a imagem (18 de 18 cards).** O `sap.m.Image` nao
      renderiza a `<img>` direto, cria um div intermediario com altura `auto`; com o
      pai em `auto` o `max-height: 100%` da imagem nao resolve e o badge quadrado do
      Credly (2048x2048) era desenhado na largura do cartao (356px em tela de 390px),
      invadindo o titulo. Agora o intermediario recebe `height: 100%` e a midia tem
      `overflow: hidden`: **0 de 18 cards** com sobreposicao em 1440/1024/768/390px.
- [x] ** Grades responsivas:** colunas de projeto/qualificacao ajustam em 1199px,
      uma coluna por linha abaixo de 600px e o menu passa a rolar na horizontal em
      vez de quebrar em varias linhas abaixo de 900px.
- [x] **Menos redundancia:** o rodape nao repete mais nome, cargo e foto (a terceira
      copia na pagina, alem do topo e do hero). No lugar do bloco de identidade vem o
      convite de contato com o e-mail. O nome agora aparece no topo e no curriculo.

### Correcao: bindings de template em agregacoes (causa raiz)

Sintoma: as agregacoes criavam a quantidade correta de controles, mas todas as
instancias nasciam **sem binding context** - `getBindingContext()` era `null` - e por
iss menu, cards, filtros e links saiam vazios (a home tinha 6 botoes mudos e nenhum
card).

Causa raiz: **o prefixo de model em binding de agregacao** (`items="{path:
'content>/navSections'}"`). No UI5 1.153 ele resolve os dados (o `ListBinding` reportava
`length: 6`) mas o contexto nao e repassado para os itens do template. Bindings de
propriedade com o mesmo prefixo (`{content>/profile/name}`) funcionam; so nas
agregacoes o contexto se perde. Reproduzido isoladamente em um `VBox` criado em JS:
com `path: 'content>/navSections'` os itens ficam sem contexto; com `path:
'/navSections'` + model como model padrao, o mesmo binding traz os textos corretamente.

Correcao aplicada:

- `Component.ts` registra o model de conteudo **duas vezes**: com nome (`content`, para
  os bindings de propriedade) e como model padrao (para as agregacoes).
- Os 23 bindings de agregacao dos XMLs passaram a usar path sem prefixo
  (`items="{path: '/navSections', templateShareable: true}"`).
- `templateShareable: true` foi normalizado em todas as agregacoes: e o valor
  recomendado pelo framework para templates reutilizados e elimina o aviso
  `[FUTURE FATAL]`; nao era a causa dos templates vazios.
- Regra learned: **em agregacao use sempre o model padrao e path sem prefixo.**

## Pendencias

### Conteudo (precisa do usuario)

- [x] **Foto real**: `profile.json -> avatar` aponta para `images/profile.png`.
- [ ] **Dados de exemplo**: `experiences.json`, `skills.json`, `projects.json` e
      `education.json` foram criados como scaffolding (2 experiences, 10 skills,
      3 projetos, 1 formacao com instituicao generica). Revisar e substituir pelo
      historico real - `npm run content:check` garante o formato.
- [ ] **Certificados**: os 18 itens em `certificates.json` sao reais (importados do
      Credly). Falta decidir se as imagens devem ser baixadas localmente
      (`npm run scrape:certificates -- --download-images`).
- [ ] `courses.json` esta vazio (a secao "Cursos" so aparece quando houver itens).

### Revisao final

- [ ] Revisar visualmente as 8 telas no browser (grade, responsivo, tema escuro).
- [ ] Gerar o PDF antes do deploy (`npm run cv:pdf`) - o arquivo e gitignored.
- [ ] Conferir responsividade mobile.
- [ ] Configurar publicacao (GitHub Pages ou servico estatico) e, se quiser, CI
      rodando `lint`, `types`, `test`, `content:check` e `build`.

## Decisoes arquiteturais

| Tema                      | Decisao                                                                           |
| ------------------------- | --------------------------------------------------------------------------------- |
| Views nunca fazem `fetch` | Leem o model `content`; trocar a origem dos dados e so mexer no `DataSource`      |
| Fonte de dados            | `content/source.json` (`static` \| `remote`); `createDataSource` como ponto unico |
| Periodos                  | `YYYY-MM` em experiencias; `to: null` = vinculo atual                             |
| Textos                    | Igual nos dois idiomas = string; traduzido = `{ "pt": "...", "en": "..." }`       |
| Navegacao                 | `sections.json` manda (rota, ordem, icone, `enabled`, `showInNav`)                |
| Contagem de experiencia   | Intervalos unidos antes de somar (projeto dentro da empresa nao conta em dobro)   |
| PDF                       | Gerado dos JSONs e gitignored, para nunca divergir da tela                        |
| Estado                    | 3 models: `device`, `ui` (tema/idioma/loading), `content` (documento)             |
