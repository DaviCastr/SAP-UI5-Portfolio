import Controller from "sap/ui/core/mvc/Controller";
import type UIComponent from "sap/ui/core/UIComponent";
import type JSONModel from "sap/ui/model/json/JSONModel";
import { ContentService } from "../model/content/ContentService";
import formatter from "../model/formatter";
import { Route, type ModelName, type RouteName } from "../model/constants";
import type { ContentLocale, PortfolioContent } from "../model/types";
import { LocaleService } from "../util/LocaleService";
import { ClickableCards } from "./support/ClickableCards";
import { openCvPdf } from "./support/CvPdfAction";

/**
 * Base de todos os controllers.
 *
 * Fica aqui apenas o que TODA tela usa: acesso ao componente, aos models e ao
 * router, abertura de links e os formatadores. Comportamentos maiores vivem em
 * `controller/support/` (cartoes clicaveis, PDF) e a regra de negocio em
 * `model/` - o controller so liga a view a eles.
 */
export default abstract class BaseController extends Controller {
    /** Formatadores das views: `formatter: '.formatter.date'` (ver model/formatter.ts). */
    public readonly formatter = formatter;

    /** Cartoes clicaveis desta view (seletor definido por `clickableCards`). */
    private cards?: ClickableCards;

    // ------------------------------------------------------------------ acesso

    /**
     * Componente dono deste controller.
     *
     * Metodo, e nao getter: o Babel transforma a classe em `.extend()`, e um
     * getter viraria um "setting" do UI5 que o `applySettings` executaria sem
     * componente - quebrando o carregamento.
     */
    protected component(): UIComponent {
        return this.getOwnerComponent() as UIComponent;
    }

    /** Model do componente ("ui", "content", "device"). No UI5 1.153 o Controller nao tem getModel. */
    protected model(name: ModelName): JSONModel | undefined {
        return this.component()?.getModel(name) as JSONModel | undefined;
    }

    /** Conteudo ja validado e traduzido para o idioma ativo. */
    protected content(): PortfolioContent {
        return ContentService.get().content;
    }

    protected locale(): ContentLocale {
        return LocaleService.getActive();
    }

    /** Contexto de binding do controle que disparou o evento (item de uma lista). */
    protected sourceContext(event: sap.ui.base.Event): sap.ui.model.Context | null | undefined {
        return (event.getSource() as sap.ui.core.Element | undefined)?.getBindingContext();
    }

    /** Propriedade do item clicado (ex.: `this.sourceProperty(event, "url")`). */
    protected sourceProperty<T = string>(event: sap.ui.base.Event, path: string): T | undefined {
        return this.sourceContext(event)?.getProperty(path) as T | undefined;
    }

    // ------------------------------------------------------------- navegacao

    /** Vai para uma rota do manifest.json (sem empilhar historico). */
    protected navigate(route: RouteName): void {
        this.component().getRouter().navTo(route, undefined, true);
    }

    /**
     * Abre um link: `mailto:` no proprio cliente de e-mail (o navegador barra
     * `window.open` com mailto) e o resto numa nova aba.
     */
    protected openLink(url: string | undefined): void {
        if (!url) {
            return;
        }
        if (url.startsWith("mailto:")) {
            window.location.href = url;
            return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
    }

    // ------------------------------------------- handlers dos fragments comuns
    // Topbar, Footer, ProjectCard e cartao de contato sao reutilizados por
    // varias views; os handlers ficam aqui para funcionarem em qualquer uma.

    /** Item com `url` (link de perfil, site do projeto, documento). */
    public onLinkPress(event: sap.ui.base.Event): void {
        this.openLink(this.sourceProperty(event, "url"));
    }

    /** Alias usado pelo ProjectCard ("Site"). */
    public onUrlPress(event: sap.ui.base.Event): void {
        this.onLinkPress(event);
    }

    /** Repositorio do projeto (campo `repo`). */
    public onRepoPress(event: sap.ui.base.Event): void {
        this.openLink(this.sourceProperty(event, "repo"));
    }

    /** E-mail do perfil no cliente de e-mail. */
    public onEmailPress(): void {
        this.openLink(`mailto:${this.content().profile.email}`);
    }

    /** Pagina do curriculo. */
    public onCvPress(): void {
        this.navigate(Route.CV);
    }

    // ------------------------------------------------------- cartoes clicaveis

    /**
     * Seletor dos cartoes clicaveis desta view (abrem o `url` do binding).
     * Views sem cartao clicavel devolvem "" e nada e instalado.
     */
    protected clickableCards(): string {
        return "";
    }

    public override onAfterRendering(): void {
        const selector = this.clickableCards();
        if (!selector) {
            return;
        }
        this.cards ??= new ClickableCards(selector, (url) => this.openLink(url));
        const view = this.getView() as unknown as { getDomRef?(): HTMLElement | null } | undefined;
        this.cards.attach(view?.getDomRef?.() ?? null);
    }

    // ----------------------------------------------------- acoes do curriculo

    /** "Ver PDF": gera no navegador e abre a pre-visualizacao (support/CvPdfAction). */
    public onDownloadPress(): void {
        void openCvPdf(this.content(), this.locale());
    }

    /** Imprime a pagina (print.css remove menus e ajusta para A4). */
    public onPrintPress(): void {
        window.print();
    }
}
