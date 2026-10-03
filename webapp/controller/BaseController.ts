import Controller from "sap/ui/core/mvc/Controller";
import type UIComponent from "sap/ui/core/UIComponent";
import { ContentService } from "../service/ContentService";
import { LocaleService } from "../service/LocaleService";
import { ThemeService, type ThemeMode } from "../service/ThemeService";
import type { ContentLocale, PortfolioContent } from "../service/types";
import { sharedFormatters } from "./formatters";

/**
 * Base de todos os controllers do portfolio.
 *
 * Concentra o que e comum: acesso ao componente, navegacao, troca de tema e de
 * idioma, alem dos formatadores usados nas views. Assim cada controller concreto
 * cuida apenas do que e especifico da sua tela.
 */
export default abstract class BaseController extends Controller {
    // Formatadores usados nas views (ver XML: formatter=".fMonthYear")
    public readonly fMonthYear = sharedFormatters.monthYear;
    public readonly fPeriod = sharedFormatters.period;
    public readonly fDate = sharedFormatters.date;
    public readonly fYear = sharedFormatters.year;
    public readonly fDateTime = sharedFormatters.dateTime;
    public readonly fLevel = sharedFormatters.level;
    public readonly fLevelPercent = sharedFormatters.levelPercent;
    public readonly fValid = sharedFormatters.valid;
    public readonly fExpired = sharedFormatters.expired;
    public readonly fIcon = sharedFormatters.icon;
    public readonly fSummary = sharedFormatters.summary;
    public readonly fPhone = sharedFormatters.phone;
    public readonly fCertImage = sharedFormatters.certImage;

    /** Componente dono deste controller (tipado, sempre presente em runtime). */
    protected get owner(): UIComponent {
        return this.getOwnerComponent() as UIComponent;
    }

    /**
     * Contexto de binding do controle que disparou o evento.
     *
     * `getSource()` devolve um EventProvider generico; nos handlers o source e
     * sempre um controle (Button), entao este helper evita repetir o cast.
     */
    protected sourceContext(event: sap.ui.base.Event): sap.ui.model.Context | null | undefined {
        return (event.getSource() as sap.ui.core.Element | undefined)?.getBindingContext();
    }

    /** Conteudo JSON ja validado e traduzido para o idioma ativo. */
    protected get content(): PortfolioContent {
        return ContentService.get().content;
    }

    protected get locale(): ContentLocale {
        return LocaleService.getActive();
    }

    /** Vai para uma rota declarada no manifest.json. */
    protected navigate(route: string): void {
        this.owner.getRouter().navTo(route, undefined, true);
    }

    /** Abre um link externo em nova aba (sem sujar o historico da app). */
    protected openExternal(url: string): void {
        window.open(url, "_blank", "noopener,noreferrer");
    }

    /**
     * Abre um link do portfolio respeitando o caso de e-mail.
     *
     * `mailto:` nao pode ir para `window.open` (o navegador bloquearia), por isso
     * os controllers usam sempre este metodo em vez de `openExternal` direto.
     */
    protected openLink(url: string | undefined, isMail = false): void {
        if (!url) {
            return;
        }

        if (isMail || url.startsWith("mailto:")) {
            window.location.href = url;
            return;
        }

        this.openExternal(url);
    }

    /** Alterna claro/escuro e mantem o model "ui" sincronizado. */
    protected toggleTheme(): ThemeMode {
        const uiModel = this.getModel("ui");
        const current = (uiModel?.getProperty("/theme") as ThemeMode) ?? "light";
        const next = ThemeService.toggle(current);
        uiModel?.setProperty("/theme", next);
        return next;
    }

    /** Troca o idioma (recarrega a app pela URL ?lang=). */
    protected switchLocale(locale: ContentLocale): void {
        LocaleService.switchTo(locale);
    }
}
