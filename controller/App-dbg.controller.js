sap.ui.define(["sap/base/Log", "sap/m/SegmentedButtonItem", "./BaseController", "../service/ContentService", "../service/StaticJsonDataSource", "../service/ThemeService", "../service/viewData"], function (Log, SegmentedButtonItem, __BaseController, ___service_ContentService, ___service_StaticJsonDataSource, ___service_ThemeService, ___service_viewData) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  const ContentService = ___service_ContentService["ContentService"];
  const browserFetcher = ___service_StaticJsonDataSource["browserFetcher"];
  const createDataSource = ___service_StaticJsonDataSource["createDataSource"];
  const loadSourceConfig = ___service_StaticJsonDataSource["loadSourceConfig"];
  const ThemeService = ___service_ThemeService["ThemeService"];
  const buildViewData = ___service_viewData["buildViewData"];
  /** Pasta base dos arquivos JSON do portfolio (relativa a webapp/). */
  const CONTENT_BASE_URL = "content";

  /** Rota inicial: e a unica que nao mostra a barra de secao. */
  const HOME_ROUTE = "home";

  /** Link externo normalizado para exibicao na navegacao e no rodape. */

  /** Garante rotulo e detecta e-mails (mailto) para abrir differently. */
  function normalizeLinks(links) {
    return links.map(link => {
      const text = link.label ? String(link.label) : link.id;
      return {
        ...link,
        text,
        isMail: link.url.startsWith("mailto:")
      };
    });
  }

  /**
   * Controller da view raiz (App.view.xml).
   *
   * Ele carrega o portfolio (JSON) uma unica vez, publica no model "content" e
   * so entao libera a navegacao - garantindo que nenhuma tela ja apareca vazia.
   */
  const AppController = BaseController.extend("webapp.controller.AppController", {
    constructor: function constructor() {
      BaseController.prototype.constructor.apply(this, arguments);
      this.routerStarted = false;
      /** Route -> rotulo ja traduzido, usado na barra fixa de secao. */
      this.sectionTitles = {};
      this.compactMedia = window.matchMedia(AppController.COMPACT_QUERY);
      /**
       * Publica no model "ui" se a barra esta em modo compacto (so icone).
       *
       * A media query e o unico jeito de o UI5 saber a largura real da janela: o
       * `sap.ui.Device` so distingue phone/tablet e nao acompanha o resize.
       */
      this.applyCompactNav = () => {
        this.model("ui")?.setProperty("/compactNav", this.compactMedia.matches);
      };
    },
    // onInit e onAfterRendering sao ganchos de ciclo de vida do UI5.
    onInit: function _onInit() {
      this.applyCompactNav();
      this.compactMedia.addEventListener("change", this.applyCompactNav);

      /*
       * O listener entra aqui, e nao depois do JSON: o router so inicializa no
       * onAfterRendering, entao a rota inicial (home) ainda nao foi resolvida
       * quando este ponto roda - e ela precisa entrar no historico junto com
       * as demais.
       */
      this.component().getRouter().attachRouteMatched(event => {
        const name = event.getParameter("name") ?? "";
        this.model("ui")?.setProperty("/activeRoute", name);
        this.syncSectionTitle(name);
      });
      void this.loadPortfolio();
    },
    /**
     * O router so pode iniciar depois que o NavContainer foi criado, ou seja,
     * depois do primeiro rendering da view raiz.
     */
    onAfterRendering: function _onAfterRendering() {
      if (!this.routerStarted) {
        this.routerStarted = true;
        this.component().getRouter().initialize();
      }
    },
    /**
     * Titulo mostrado na barra fixa abaixo do topo.
     *
     * Na home o titulo fica vazio de proposito: ali o hero ja mostra o nome e a
     * faixa seria ruido. Como o texto e o que decide a visibilidade, o valor
     * vazio e o que esconde a barra.
     */
    syncSectionTitle: function _syncSectionTitle(route) {
      const title = route === HOME_ROUTE ? "" : this.sectionTitles[route] ?? "";
      this.model("ui")?.setProperty("/currentSectionTitle", title);
    },
    /** Rota que o router resolviu por ultimo (inicializa em home). */activeRoute: function _activeRoute() {
      const current = this.model("ui")?.getProperty("/activeRoute");
      return typeof current === "string" && current ? current : HOME_ROUTE;
    },
    /** Carrega, valida, traduz e publica o conteudo no model. */loadPortfolio: async function _loadPortfolio() {
      const source = await loadSourceConfig(CONTENT_BASE_URL, browserFetcher);
      const dataSource = createDataSource(source, {
        baseUrl: CONTENT_BASE_URL,
        fetcher: browserFetcher
      });
      const service = await ContentService.boot({
        dataSource,
        locale: this.locale()
      });
      const contentModel = this.model("content");
      const viewData = buildViewData(service);

      // Um unico setData: sobrescrever duas vezes apagaria o documento do
      // portfolio (perfil, experiencias...) e deixaria apenas as derivacoes.
      contentModel.setData({
        ...service.content,
        ...viewData,
        navLinks: normalizeLinks(viewData.navLinks),
        footerLinks: normalizeLinks(viewData.footerLinks)
      });

      // A barra fixa abaixo do topo repete o nome da aba atual. Monta o indice
      // com TODAS as secoes ativas (o CV nao aparece na navegacao, mas tem
      // titulo) a partir das secoes JA traduzidas do ContentService.
      // `nav` continua tipado como LocalizedText, mas em tempo de execucao ja e
      // uma string traduzida - o String() so satisfaz o compilador.
      this.sectionTitles = Object.fromEntries(service.activeSections.map(section => [section.route, String(section.nav ?? "")]));

      // A rota inicial e resolvida antes do JSON chegar, entao o titulo dela foi
      // sincronizado com o indice ainda vazio. Repete agora que ele existe.
      this.syncSectionTitle(this.activeRoute());
      await this.publishUiOptions();
      this.model("ui")?.setProperty("/busy", false);
      this.hideSplash();
    },
    /**
     * Publica as opcoes de tema do SegmentedButton do rodape.
     *
     * Os rotulos vem do resource bundle (i18n) porque o model "ui" e um JSONModel
     * e nao resolve chaves i18n sozinho. Os itens sao criados via API porque
     * sap.m.SegmentedButton declara "buttons" como defaultAggregation e ignora
     * templates XML na agregacao "items".
     *
     * O selectedKey NAO vai por binding: em two-way o SegmentedButton grava de
     * volta no model durante o boot e sobrescreve o mode aplicado pelo
     * Component com string vazia (a pagina ficava escura com "Light" marcado), e
     * o one-way (:=) quebra o boot de fragment no UI5 1.153.
     *
     * O idioma nao aparece aqui: quem decide e o i18n do UI5 (idioma do
     * navegador), com ?lang= na URL como override explicito.
     */
    publishUiOptions: async function _publishUiOptions() {
      const view = this.getView();
      const i18n = view?.getModel("i18n");
      // O manifest declara asyncSupport, entao o bundle pode chegar como Promise.
      const bundle = await i18n?.getResourceBundle();
      const text = key => bundle?.getText(key) ?? key;
      const fill = (id, options) => {
        const toggle = view?.byId(id);
        if (!toggle) {
          Log.warning("SegmentedButton nao encontrado: " + id);
          return;
        }
        toggle.removeAllItems();
        options.forEach(option => {
          toggle.addItem(new SegmentedButtonItem({
            key: option.key,
            text: option.text
          }));
        });
      };
      fill("themeToggle", [{
        key: "light",
        text: text("theme.light")
      }, {
        key: "dark",
        text: text("theme.dark")
      }]);

      // Alinha o toggle com o tema ja aplicado pelo Component (evita o "piscar"
      // em "Light" quando o sistema prefere dark).
      const themeToggle = view?.byId("themeToggle");
      themeToggle?.setSelectedKey(ThemeService.getMode());
    },
    /** Navega para a secao escolhida na barra superior. */onNavPress: function _onNavPress(event) {
      const route = this.sourceContext(event)?.getProperty("route");
      if (route) {
        this.navigate(route);
      }
    },
    /** Abre um link externo (ou o cliente de e-mail) a partir da barra/rodape. */onLinkPress: function _onLinkPress(event) {
      const context = this.sourceContext(event);
      this.openLink(context?.getProperty("url"), context?.getProperty("isMail"));
    },
    /** Botao "curriculo" da barra superior. */onCvPress: function _onCvPress() {
      this.navigate("cv");
    },
    // ------------------------------------------------------------------
    // Tema
    // ------------------------------------------------------------------
    /**
     * Alterna claro/escuro pelo SegmentedButton do rodape.
     *
     * A key vem do proprio controle: no UI5 1.153 o selectionChange do
     * sap.m.SegmentedButton e disparado sem parametros, entao usar
     * event.getParameter("key") cairia sempre no fallback.
     */
    onThemeChange: function _onThemeChange(event) {
      const key = event.getSource()?.getSelectedKey() ?? "light";
      ThemeService.apply(key);
      this.model("ui")?.setProperty("/theme", key);
    },
    /** Remove a tela de carregamento exibida pelo index.html. */hideSplash: function _hideSplash() {
      const splash = document.getElementById("pf-splash");
      if (!splash) {
        return;
      }
      splash.classList.add("is-hidden");
      window.setTimeout(() => splash.remove(), 400);
    }
  });
  /**
   * Abaixo desta largura as abas da barra mostram so o icone.
   *
   * Medido: marca + 7 abas com rotulo + acoes precisam de 1077px, entao em
   * 1024px (e em 900px) a linha estourava a viewport e os botoes saiam da tela.
   * Em modo icone a mesma barra cabe a partir de ~700px, com folga.
   */
  AppController.COMPACT_QUERY = "(max-width: 1199px)";
  return AppController;
});
//# sourceMappingURL=App-dbg.controller.js.map
