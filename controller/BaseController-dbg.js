sap.ui.define(["sap/ui/core/BusyIndicator", "sap/ui/core/mvc/Controller", "../service/ContentService", "../service/LocaleService", "../service/pdfPreview", "../service/ThemeService", "./formatters"], function (BusyIndicator, Controller, ___service_ContentService, ___service_LocaleService, ___service_pdfPreview, ___service_ThemeService, ___formatters) {
  "use strict";

  const ContentService = ___service_ContentService["ContentService"];
  const LocaleService = ___service_LocaleService["LocaleService"];
  const openPreviewTab = ___service_pdfPreview["openPreviewTab"];
  const showPdfInTab = ___service_pdfPreview["showPdfInTab"];
  const ThemeService = ___service_ThemeService["ThemeService"];
  const sharedFormatters = ___formatters["sharedFormatters"];
  /**
   * Base de todos os controllers do portfolio.
   *
   * Concentra o que e comum: acesso ao componente, navegacao, troca de tema e de
   * idioma, alem dos formatadores usados nas views. Assim cada controller concreto
   * cuida apenas do que e especifico da sua tela.
   */
  const BaseController = Controller.extend("webapp.controller.BaseController", {
    constructor: function constructor() {
      Controller.prototype.constructor.apply(this, arguments);
      /** Views ja instrumentadas, para nao duplicar listeners delegated. */
      this.boundRoots = new WeakSet();
      // Formatadores usados nas views (ver XML: formatter=".fMonthYear")
      this.fMonthYear = sharedFormatters.monthYear;
      this.fPeriod = sharedFormatters.period;
      this.fDate = sharedFormatters.date;
      this.fYear = sharedFormatters.year;
      this.fDateTime = sharedFormatters.dateTime;
      this.fLevel = sharedFormatters.level;
      this.fLevelPercent = sharedFormatters.levelPercent;
      this.fValid = sharedFormatters.valid;
      this.fExpired = sharedFormatters.expired;
      this.fIcon = sharedFormatters.icon;
      this.fSummary = sharedFormatters.summary;
      this.fPhone = sharedFormatters.phone;
      this.fCertImage = sharedFormatters.certImage;
      this.handleCardActivate = event => {
        const target = event.target;

        // Link/botao dentro do card continua sendo acao propria dele.
        if (target?.closest("a, button")) {
          return;
        }
        this.openCard(target?.closest(this.clickableCards()) ?? null, event);
      };
      this.handleCardKeydown = event => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        this.openCard(event.target?.closest(this.clickableCards()) ?? null, event);
      };
    },
    /**
     * Componente dono deste controller (tipado, sempre presente em runtime).
     *
     * Metodo, e nao getter: o Babel transforma a classe em `.extend()`, e um
     * getter viraria um "setting" do UI5 -- o `applySettings` o executaria no
     * objeto de definicao (sem `getOwnerComponent`) e quebraria o carregamento.
     */
    component: function _component() {
      return this.getOwnerComponent();
    },
    /**
     * Model registrado no componente ("ui", "content", "device", ...).
     *
     * No UI5 1.153 o `sap.ui.core.mvc.Controller` nao expoe mais `getModel`, por
     * isso os controllers passam pelo componente dono da view.
     */
    model: function _model(sName) {
      return this.component()?.getModel(sName);
    },
    /**
     * Contexto de binding do controle que disparou o evento.
     *
     * `getSource()` devolve um EventProvider generico; nos handlers o source e
     * sempre um controle (Button), entao este helper evita repetir o cast.
     */
    sourceContext: function _sourceContext(event) {
      return event.getSource()?.getBindingContext();
    },
    /** Conteudo JSON ja validado e traduzido para o idioma ativo. */content: function _content() {
      return ContentService.get().content;
    },
    locale: function _locale() {
      return LocaleService.getActive();
    },
    /**
     * Torna os cartoes clicaveis (`.pf-cert` por padrao) sem precisar de um
     * botao dentro deles.
     *
     * Um unico listener delegado no container da view cuida de todos os cartoes:
     * delegar (em vez de um handler por card) mantem o fragmento declarativo e
     * funciona igual na home e na galeria, que usam o mesmo fragmento. Como o
     * card nao carrega a URL no DOM, ela e resolvida pelo contexto de binding do
     * controle - o `id` do elemento DOM de um controle UI5 e o proprio id dele.
     */
    onAfterRendering: function _onAfterRendering() {
      const root = this.viewRoot();
      if (root && !this.boundRoots.has(root)) {
        this.boundRoots.add(root);
        root.addEventListener("click", this.handleCardActivate);
        root.addEventListener("keydown", this.handleCardKeydown);
      }
      this.syncCardAccessibility(root);
    },
    /**
     * Seletor dos cartoes clicaveis desta view.
     *
     * A URL vem sempre do campo "url" do contexto de binding, entao e so isso que
     * muda de um cartao para outro. As views que nao tem cartao clicavel
     * sobrescrevem com ":not(.pf-anything)".
     */
    clickableCards: function _clickableCards() {
      return ".pf-cert";
    },
    /**
     * Elemento DOM da view.
     *
     * `getDomRef()` existe em `sap.ui.core.mvc.View` desde sempre, mas o
     * `@openui5/ts-types` so o declara no mixin `DeclarativeSupport` - por isso
     * o cast estrutural abaixo, em vez de `any`.
     */
    viewRoot: function _viewRoot() {
      const view = this.getView();
      return view?.getDomRef?.() ?? null;
    },
    /** URL externa a partir do elemento DOM de um cartao clicavel. */cardUrl: function _cardUrl(card) {
      const control = card?.id ? sap.ui.getCore().byId(card.id) : null;
      const url = control?.getBindingContext()?.getProperty("url");
      return typeof url === "string" ? url : "";
    },
    /**
     * `role`/`tabindex` sao espelhados no DOM a cada render porque os cartoes
     * nascem e morrem com os filtros (e nem todo cartao tem URL).
     */
    syncCardAccessibility: function _syncCardAccessibility(root) {
      root?.querySelectorAll(this.clickableCards()).forEach(card => {
        if (this.cardUrl(card)) {
          card.setAttribute("role", "link");
          card.setAttribute("tabindex", "0");
        } else {
          card.removeAttribute("role");
          card.removeAttribute("tabindex");
        }
      });
    },
    /** Abre o destino a partir do cartao, seja por clique, Enter ou Space. */openCard: function _openCard(card, event) {
      const url = this.cardUrl(card);
      if (!url) {
        return;
      }
      event.preventDefault();
      this.openExternal(url);
    },
    /** Vai para uma rota declarada no manifest.json. */navigate: function _navigate(route) {
      this.component().getRouter().navTo(route, undefined, true);
    },
    /** Abre um link externo em nova aba (sem sujar o historico da app). */openExternal: function _openExternal(url) {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    /**
     * Abre um link do portfolio respeitando o caso de e-mail.
     *
     * `mailto:` nao pode ir para `window.open` (o navegador bloquearia), por isso
     * os controllers usam sempre este metodo em vez de `openExternal` direto.
     */
    openLink: function _openLink(url, isMail = false) {
      if (!url) {
        return;
      }
      if (isMail || url.startsWith("mailto:")) {
        window.location.href = url;
        return;
      }
      this.openExternal(url);
    },
    /**
     * Gera o PDF na hora, no navegador, com o conteudo carregado e o idioma
     * ativo (mesmo layout de `npm run cv:pdf`, ver service/cvPdf.ts), e o abre
     * numa nova aba para visualizar antes de baixar (service/pdfPreview.ts).
     *
     * O modulo do PDF (com o jsPDF) e carregado sob demanda: so quem clica em
     * "Baixar PDF" paga o download da biblioteca.
     */
    onDownloadPress: async function _onDownloadPress() {
      if (BaseController.generatingPdf) {
        return;
      }
      BaseController.generatingPdf = true;
      BusyIndicator.show(0);

      // Aberta ANTES de qualquer await, senao o bloqueador de pop-ups a barra.
      // Se mesmo assim for bloqueada, o PDF e baixado direto.
      const tab = openPreviewTab(this.locale());
      try {
        // `import()` relativo vira `sap.ui.require("../...")` no transpile, e o
        // sap.ui.require global so aceita nome absoluto de modulo.
        const {
          buildCvPdf,
          cvPdfFileName
        } = await new Promise((resolve, reject) => sap.ui.require(["davi/portfolio/service/cvPdf"], resolve, reject));
        const content = this.content();
        const locale = this.locale();
        const photo = await BaseController.loadPdfPhoto(content.profile.avatar);
        const doc = buildCvPdf(content, locale, {
          photo
        });
        const fileName = cvPdfFileName(content, locale);
        if (tab && !tab.closed) {
          showPdfInTab(tab, doc.output("blob"), {
            fileName,
            title: `${content.profile.name} - CV`,
            locale
          });
        } else {
          doc.save(fileName);
        }
      } catch (error) {
        console.error("Falha ao gerar o PDF no navegador; abrindo o PDF estatico.", error);
        if (tab && !tab.closed) {
          tab.location.href = new URL(BaseController.PDF_URL, document.baseURI).href;
        } else {
          window.open(BaseController.PDF_URL, "_blank");
        }
      } finally {
        BusyIndicator.hide();
        BaseController.generatingPdf = false;
      }
    },
    /** Imprime a pagina (o CSS de impressao remove menus e ajusta para A4). */onPrintPress: function _onPrintPress() {
      window.print();
    },
    /** Alterna claro/escuro e mantem o model "ui" sincronizado. */toggleTheme: function _toggleTheme() {
      const uiModel = this.model("ui");
      const current = uiModel?.getProperty("/theme") ?? "light";
      const next = ThemeService.toggle(current);
      uiModel?.setProperty("/theme", next);
      return next;
    }
  });
  /**
   * PDF e impressao do curriculo.
   *
   * Ficam aqui, e nao no Cv.controller, porque os botoes sao renderizados pela
   * barra de secao (App.view.xml) - o controller do CV nao e o dono da UI deles.
   */
  /** PDF estatico de `npm run cv:pdf` - so usado se a geracao na hora falhar. */
  BaseController.PDF_URL = "cv/davi-castro-cv.pdf";
  /** Evita gerar dois PDFs com cliques repetidos. */
  BaseController.generatingPdf = false;
  /** Foto do perfil em bytes para o PDF; SVG/ausente/erro = PDF sem foto. */
  BaseController.loadPdfPhoto = async function loadPdfPhoto(avatar) {
    const match = /\.(png|jpe?g)$/i.exec(avatar ?? "");
    if (!avatar || !match) {
      return undefined;
    }
    try {
      const response = await fetch(sap.ui.require.toUrl(`davi/portfolio/${avatar}`));
      if (!response.ok) {
        return undefined;
      }
      const blob = await response.blob();
      const format = match[1].toLowerCase() === "png" ? "PNG" : "JPEG";
      return (await BaseController.shrinkPhoto(blob)) ?? {
        data: new Uint8Array(await blob.arrayBuffer()),
        format
      };
    } catch {
      return undefined;
    }
  };
  /**
   * A foto aparece com ~80pt no PDF; embutir o original (800px, ~1 MB) so
   * incha o arquivo. Reduz para 240px em JPEG - nitido ate na impressao.
   */
  BaseController.shrinkPhoto = async function shrinkPhoto(blob) {
    try {
      const bitmap = await createImageBitmap(blob);
      const size = 240;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) {
        return undefined;
      }
      // Recorte quadrado central (cover), como o circulo do PDF espera.
      const side = Math.min(bitmap.width, bitmap.height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size, size);
      context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
      const jpeg = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.88));
      return jpeg ? {
        data: new Uint8Array(await jpeg.arrayBuffer()),
        format: "JPEG"
      } : undefined;
    } catch {
      return undefined;
    }
  };
  return BaseController;
});
//# sourceMappingURL=BaseController-dbg.js.map
