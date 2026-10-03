# STATUS

Ultima atualizacao: 2026-10-03

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

- [x] Contratos em `webapp/service/types.ts` (perfil, experiences, skills, projects,
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
- [x] `tools/cv/generate-pdf.ts` - PDF A4 (2 paginas) em `webapp/cv/davi-castro-cv.pdf`.

### Qualidade

- [x] `webapp/typings/` - ponte de tipos entre imports `sap/*` e o namespace global
      (necessaria porque o codigo usa imports ES em modo estrito).
- [x] `npm run lint` sem erros nem avisos.
- [x] `npm run types` passa para app e ferramentas.
- [x] 47 testes Vitest passando (metrics, localizer, viewData, validator, conteudo real).
- [x] `npm run format:check` e `npm run content:check` sem pendencias.
- [x] `README.md` com documentacao completa (inclusive como trocar a fonte de dados).

### Runtime (validado no navegador)

- [x] App sobe sem erro: container do component populado e splash removido, tanto em
      `ui5 serve` quanto no `dist/` gerado por `npm run build`.
- [x] Todas as rotas renderizam conteudo real: `#/`, `#/home`, `#/about`, `#/experience`,
      `#/skills`, `#/projects`, `#/certificates`, `#/education`, `#/cv` e rota
      inexistente (que cai na tela 404).
- [x] Sem excecoes de JavaScript, sem asserts de setting desconhecido e sem 404 de
      recurso da aplicacao.

Conhecido e sem impacto: ao reaproveitar views em cache do router (`viewLevel`), o
UI5 1.153 registra `[FUTURE FATAL] ... templateShareable ...`. E um aviso do proprio
framework em operacao de clone: nao existe atributo XML para `templateShareable` em
1.153 (o `XMLTemplateProcessor` nao conhece a propriedade), e o aviso nao impede a
renderizacao nem a navegacao.

## Pendencias

### Conteudo (precisa do usuario)

- [ ] **Foto real**: hoje `webapp/images/profile-placeholder.svg` e um placeholder.
      Salve a foto como `webapp/images/profile.png` e aponte `profile.json -> avatar`
      para esse caminho (ou sobrescreva o placeholder).
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
