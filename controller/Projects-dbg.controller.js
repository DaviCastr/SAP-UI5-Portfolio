sap.ui.define(["./BaseController"], function (__BaseController) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  /**
   * Controller da galeria de projetos.
   *
   * Sao dois conjuntos independentes na mesma tela:
   *
   * 1. `projects.json` - projetos escritos a mao, com historia, stack e highlights.
   * 2. `github.json` - repositorios reais da conta, gravados pelo
   *    "npm run sync:github". Nao tem traducao nem highlights: e o retrato do que
   *    existe no GitHub, e por isso fica numa secao propria, com filtro por
   *    linguagem em vez do filtro por tag dos projetos.
   *
   * Os filtros sao calculados aqui para poderem ser reaproveitados pelo gerador do
   * PDF sem duplicar regras.
   */
  const ProjectsController = BaseController.extend("webapp.controller.ProjectsController", {
    onInit: function _onInit() {
      this.publishRepoLanguages();
      this.applyFilter("all");
      this.applyRepoFilter("all");
    },
    /**
     * nesta view o card clicavel e o de repositorio; os certificados ficam em
     * outra aba e nao usam esta delegacao.
     */
    clickableCards: function _clickableCards() {
      return ".pf-repo";
    },
    /** Todos os projetos. */onAllPress: function _onAllPress() {
      this.applyFilter("all");
    },
    /** Filtra pela tag escolhida. */onTagPress: function _onTagPress(event) {
      const tag = this.sourceContext(event)?.getProperty("tag") ?? "all";
      this.applyFilter(tag);
    },
    /** Todos os repositorios. */onAllReposPress: function _onAllReposPress() {
      this.applyRepoFilter("all");
    },
    /** Filtra os repositorios pela linguagem escolhida. */onRepoLanguagePress: function _onRepoLanguagePress(event) {
      const language = this.sourceContext(event)?.getProperty("language") ?? "all";
      this.applyRepoFilter(language);
    },
    /** Abre o repositório do projeto. */onRepoPress: function _onRepoPress(event) {
      this.openExternal(this.sourceContext(event)?.getProperty("repo") ?? "");
    },
    /** Abre o site de demonstracao do projeto. */onUrlPress: function _onUrlPress(event) {
      this.openExternal(this.sourceContext(event)?.getProperty("url") ?? "");
    },
    /** Abre o perfil publico no GitHub. */onGitHubPress: function _onGitHubPress() {
      const profileUrl = this.content().github?.profileUrl;
      if (profileUrl) {
        this.openExternal(profileUrl);
      }
    },
    applyFilter: function _applyFilter(tag) {
      const items = tag === "all" ? this.content().projects : this.content().projects.filter(project => project.tags?.includes(tag));
      this.model("content")?.setProperty("/filteredProjects", items);
      this.model("ui")?.setProperty("/projectFilter", tag);
    },
    applyRepoFilter: function _applyRepoFilter(language) {
      const repos = this.content().github?.repos ?? [];
      const items = language === "all" ? repos : repos.filter(repo => repo.language === language);
      this.model("content")?.setProperty("/filteredRepos", items);
      this.model("ui")?.setProperty("/repoLanguageFilter", language);
    },
    /**
     * Linguagens dos repositorios, da mais usada para a menos usada.
     *
     * A contagem vem junto porque o chip mostra "TypeScript (12)", e o icone e
     * um emoji porque o SAP-icons nao tem marca de linguagem.
     */
    publishRepoLanguages: function _publishRepoLanguages() {
      const repos = this.content().github?.repos ?? [];
      const counter = new Map();
      repos.forEach(repo => {
        const language = repo.language;
        if (language) {
          counter.set(language, (counter.get(language) ?? 0) + 1);
        }
      });
      const languages = [...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([language, count]) => ({
        language,
        count,
        label: `${language} (${count})`,
        icon: ProjectsController.LANGUAGE_ICONS[language] ?? "source-code"
      }));
      this.model("content")?.setProperty("/repoLanguages", languages);
    }
  });
  /** Emojis por linguagem, para o card nao ficar so com um nome. */
  ProjectsController.LANGUAGE_ICONS = {
    TypeScript: "javascript",
    JavaScript: "javascript",
    HTML: "code",
    CSS: "code",
    "Jupyter Notebook": "source-code",
    ABAP: "log"
  };
  return ProjectsController;
});
//# sourceMappingURL=Projects-dbg.controller.js.map
