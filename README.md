# SAP-UI5-Portfolio

Portfolio profissional em **SAPUI5 (OpenUI5) + TypeScript**, bilíngue (PT/EN), com tema
claro/escuro, currículo em PDF gerado a partir dos dados e sincronização automática de
certificações (Credly) e do GitHub.

Tudo o que aparece na tela vem de arquivos JSON versionados: para atualizar o portfolio
**não se mexe em nenhuma view**.

---

## Sumario

- [Como rodar](#como-rodar)
- [Scripts](#scripts)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como editar o conteudo](#como-editar-o-conteudo)
- [Como trocar a fonte de dados (hoje JSON, amanha CAP)](#como-trocar-a-fonte-de-dados-hoje-json-amanha-cap)
- [Internacionalizacao](#internacionalizacao)
- [Ferramentas de linha de comando](#ferramentas-de-linha-de-comando)
- [Testes e qualidade](#testes-e-qualidade)
- [Decisoes tecnicas](#decisoes-tecnicas)

---

## Como rodar

Requisitos: **Node.js >= 20** (testado com Node 22).

```bash
npm install
npm start
```

O app abre em <http://localhost:8080/index.html>.

- `npm run start:ci` sobe o servidor sem abrir o navegador (usado em pipeline).
- `npm run build` gera a aplicacao de producao em `dist/`.
- `npm run build:preview` faz build e sobe o servidor ja com o bundle gerado.

## Scripts

| Script                        | O que faz                                                     |
| ----------------------------- | ------------------------------------------------------------- |
| `npm start`                   | Servidor de desenvolvimento com transpilacao em memoria       |
| `npm run build`               | Build de producao em `dist/`                                  |
| `npm run types`               | `tsc --noEmit` na app e nas ferramentas/testes                |
| `npm run lint`                | ESLint (TypeScript)                                           |
| `npm test`                    | Testes unitarios (Vitest)                                     |
| `npm run content:check`       | Valida os JSONs do portfolio (falha se algo estiver invalido) |
| `npm run scrape:certificates` | Importa as badges do Credly para `certificates.json`          |
| `npm run sync:github`         | Atualiza `github.json` e as estrelas/fors dos projetos        |
| `npm run cv:pdf`              | Gera o PDF estatico do curriculo em `webapp/cv/`              |
| `npm run format`              | Prettier em todo o codigo                                     |

## Estrutura do projeto

MVC no padrao do UI5: **view** (XML) so declara, **controller** so liga a view ao
model, e toda regra fica em **model** - em TypeScript puro, sem controles UI5, testavel
com Vitest e reaproveitada pelos scripts Node.

```text
webapp/
  Component.ts              # cria os models (device, ui, content) e aplica o tema
  index.html / manifest.json
  content/                  # <- DADOS do portfolio (um JSON por secao + source.json)

  view/  fragment/          # V: XMLViews e pedacos reutilizaveis (cards, topo, rodape)

  controller/               # C: um controller por tela, todos finos
    BaseController.ts       #    acesso a models/router, links, `formatter`, acoes comuns
    App.controller.ts       #    shell: rotas, titulo da secao, tema, splash
    support/                #    comportamentos reutilizaveis
      ClickableCards.ts     #      cartao inteiro clicavel (mouse + teclado + a11y)
      CvPdfAction.ts        #      "Ver PDF": gera, abre a pre-visualizacao, fallback

  model/                    # M: dados e regras (sem UI5)
    types.ts                #    contratos dos JSONs
    models.ts               #    fabricas dos JSONModels
    formatter.ts            #    UNICO lugar onde dado vira texto de tela
    dates.ts                #    datas em texto (usado pelo formatter e pelo PDF)
    data/                   #    de onde os dados vem
      DataSource.ts  StaticJsonDataSource.ts  liveSources.ts (Credly/GitHub)
    content/                #    o que se faz com eles
      ContentLoader.ts      #      entrada unica: fonte -> validacao -> traducao -> model
      ContentService.ts     #      conteudo carregado + metricas e listas derivadas
      Localizer.ts  validator.ts  metrics.ts
      ordering.ts           #      regras de ordem (formacao, projetos por recencia)
      filters.ts            #      filtros das telas (funcoes puras)
      viewData.ts           #      dados derivados publicados no model

  pdf/                      # curriculo em PDF (jsPDF) - roda no navegador e no Node
    cvPdf.ts  pdfPreview.ts  pdfPhoto.ts
  util/                     # navegador: LocaleService, LocaleResolver, ThemeService
  i18n/  css/  images/
tools/                      # scripts Node (sync GitHub/Credly, PDF, validacao)
test/                       # testes Vitest
```

**Regras da arquitetura**

- As views nunca chamam `fetch`: leem o model `content`, preenchido pelo
  `ContentLoader`. Trocar a origem dos dados (JSON -> CAP) nao toca em view nem controller.
- Controller nao tem regra de negocio: le a escolha do usuario, chama uma funcao de
  `model/` (ex.: `filterProjects`) e publica o resultado.
- Formatacao so no `model/formatter.ts`; no XML: `formatter: '.formatter.period'`.
- Texto visivel so no i18n ou no JSON de conteudo.

## Como editar o conteudo

Cada secao da tela tem **um** arquivo JSON em `webapp/content/`. Para acrescentar um item,
duplique um objeto do array correspondente - nenhuma view precisa ser alterada.

Exemplo (`experiences.json`):

```json
{
    "id": "minha-experiencia",
    "company": "Empresa X",
    "role": { "pt": "Consultor SAP", "en": "SAP Consultant" },
    "period": { "from": "2023-01", "to": null },
    "summary": { "pt": "O que eu fiz", "en": "What I did" },
    "highlights": [{ "pt": "Resultado 1", "en": "Result 1" }],
    "stack": ["SAPUI5", "ABAP"],
    "modules": ["MM", "SD"],
    "kind": "job",
    "featured": true
}
```

### Campos traduzidos

```json
"role": "SAPUI5 Developer"                                  // igual nos dois idiomas
"role": { "pt": "Desenvolvedor", "en": "Developer" }         // texto traduzido
```

- `period.from` / `period.to`: `YYYY-MM`; `to: null` = vinculo atual.
- `certificates.issuedAt` / `expiresAt`: `YYYY-MM-DD`; `expiresAt: null` = sem validade.
- `skills.level`: de `1` a `5`.
- `profile.focusSkills`: lista de **ids** existentes em `skills.json`.
- `profile.avatar`: caminho dentro de `webapp/` (ex.: `images/profile.png`).

### Controlar a navegacao

`content/sections.json` define as secoes:

```json
{
    "id": "certificates",
    "nav": { "pt": "Certificacoes", "en": "Certifications" },
    "icon": "certificate",
    "route": "certificates",
    "order": 5,
    "enabled": true,
    "showInNav": true
}
```

- `enabled: false` desliga a secao (a rota deixa de ser registrada no menu).
- `showInNav: false` mantem a rota acessivel, mas esconde o botao.
- `order` define a posicao na barra superior.

### Antes de publicar

```bash
npm run content:check
```

Falha com `exit 1` e lista o caminho exato do problema (`experiences[2].period.from`).

## Como trocar a fonte de dados (hoje JSON, amanha CAP)

`webapp/content/source.json`:

```json
{ "mode": "static" }
```

Para ler de uma URL unica (backend, OData, CAP servindo um JSON):

```json
{ "mode": "remote", "remoteUrl": "https://api.exemplo.com/portfolio" }
```

Para integrate com CAP/OData de verdade, crie uma classe que implemente a interface
`webapp/model/data/DataSource.ts` e registre-a em `createDataSource()`. Nenhuma view ou
controller precisa mudar - eles continuam lendo o mesmo model `content`.

## Internacionalizacao

Ordem de resolucao do idioma: `?lang=` na URL > idioma do navegador > `pt`.

- **Conteudo**: `{ "pt": "...", "en": "..." }` nos JSONs (convertido pelo `Localizer`).
- **Interface**: `webapp/i18n/i18n.properties` (PT) e `i18n_en.properties` (EN).

Trocar de idioma pela tela recarrega a app com `?lang=`, para o `ResourceBundle` ser
carregado pelo SAPUI5.

## Ferramentas de linha de comando

### Certificacoes (Credly)

```bash
npm run scrape:certificates
npm run scrape:certificates -- --download-images
npm run scrape:certificates -- --profile=outro-usuario
```

- Le `https://www.credly.com/users/<perfil>/badges.json` e grava `content/certificates.json`.
- Entradas com `source: "manual"` sao preservadas; as do Credly sao atualizadas.
- Marca como `featured` as badges cujo titulo contem "Certified".
- Por padrao guarda a **URL remota** da imagem; com `--download-images` baixa para
  `webapp/images/certificates/`.
- **Nao ha busca ao vivo no navegador** (o Credly nao envia CORS). Quem atualiza e o
  workflow de deploy (`.github/workflows/deploy.yml`), que roda este script e o do GitHub
  antes do build - a cada push e diariamente. Se a fonte falhar, o JSON versionado vale.

### GitHub

```bash
npm run sync:github
npm run sync:github -- --user=DaviCastr --token=$GITHUB_TOKEN
```

- Grava `content/github.json` (perfil, data da sincronizacao, nº de repositorios).
- Atualiza `stars`, `forks`, `language` e `updatedAt` dos projetos cujo `repo` aponte para
  um repositorio do usuario.
- Sem token: 60 requisicoes/hora (limite da API publica). Com `GITHUB_TOKEN`, 5000/hora.

### Curriculo em PDF

```bash
npm run cv:pdf
npm run cv:pdf -- --lang=en
npm run cv:pdf -- --out=dist/cv.pdf
```

O layout do PDF fica em `webapp/pdf/cvPdf.ts` (jsPDF) e e o mesmo nas duas pontas:

- **No site**, os botoes "Baixar PDF" / "Baixar curriculo" geram o arquivo **na hora, no
  navegador**, no idioma ativo, e o abrem numa **nova aba para visualizar** antes de baixar
  (`pdf/pdfPreview.ts`). O botao "Baixar PDF" da aba salva como `davi-castro-cv-pt.pdf`
  ou `-en.pdf`. Se o navegador bloquear a aba, o arquivo e baixado direto. O jsPDF so e
  carregado no clique.
- **No terminal**, `npm run cv:pdf` grava `webapp/cv/davi-castro-cv.pdf`, usado como
  alternativa caso a geracao no navegador falhe. O deploy gera esse arquivo antes do build.

A4 em duas colunas (cabecalho com foto, barra lateral com contato/idiomas/competencias,
coluna principal com resumo, experiencia, projetos, formacao e certificacoes SAP). Se o
conteudo nao couber em uma pagina, os espacos entre blocos sao reduzidos antes de quebrar
para a segunda - nunca sobra folha em branco. O PDF **nao** e versionado (`.gitignore`).

## Publicacao (GitHub Pages)

O workflow `.github/workflows/deploy.yml` roda a cada push na `main`, diariamente
e sob demanda (aba Actions > "Run workflow"): sincroniza GitHub e Credly, valida o
conteudo, gera o PDF, faz o build e publica o `dist` com as actions oficiais do Pages.

**Configuracao unica no repositorio:** Settings > Pages > Build and deployment >
Source = **GitHub Actions**. Com "Deploy from a branch" o Pages publica a branch
escolhida pelo Jekyll - na `main` aparece o README no lugar do app, e o Jekyll
ignora pastas iniciadas por `_` (o bundle do jsPDF usa `thirdparty/_dynamics/`).

Site: https://davicastr.github.io/SAP-UI5-Portfolio/

## Testes e qualidade

```bash
npm run lint
npm run types
npm test
npm run content:check
```

Os testes cobrem a parte que pode quebrar em silencio:

- `test/metrics.test.ts` - soma de meses sem contar vinculos sobrepostos em dobro.
- `test/localizer.test.ts` - resolucao de `{ pt, en }` e textos que nao sao traduziveis.
- `test/viewData.test.ts` - agrupamentos (skills por categoria, tags, anos).
- `test/validator.test.ts` - validacao de conteudo.
- `test/content.test.ts` - integridade dos JSONs reais (ids unicos, avatar na existencia,
  skills de foco existentes, periodos coerentes).

## Decisoes tecnicas

| Tema        | Decisao                                                                |
| ----------- | ---------------------------------------------------------------------- |
| OpenUI5     | `1.153.0` fixado no `ui5.yaml` ( CDN e runtime alinhados)              |
| Linguagem   | TypeScript em modo estrito, transpilado para ES5 no build              |
| Views       | XMLView com `sap.m` + CSS proprio (sem UI5 Web Components)             |
| Dados       | JSON versionado + `DataSource` injetavel (pronto para CAP)             |
| Testes      | Vitest (rapido, sem browser)                                           |
| Estado      | 3 models: `device`, `ui` (tema/idioma/loading) e `content` (documento) |
| Rotas       | `sap.m.routing.Router` com `sections.json` como fonte da verdade       |
| Ferramentas | `tsx` + `jspdf` + API publica do GitHub (sem servico externo)          |
