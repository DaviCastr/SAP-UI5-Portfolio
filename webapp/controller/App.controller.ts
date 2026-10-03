import type JSONModel from "sap/ui/model/json/JSONModel";
import Log from "sap/base/Log";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import SegmentedButton from "sap/m/SegmentedButton";
import SegmentedButtonItem from "sap/m/SegmentedButtonItem";
import BaseController from "./BaseController";
import { ContentService } from "../service/ContentService";
import { browserFetcher, createDataSource, loadSourceConfig } from "../service/StaticJsonDataSource";
import { ThemeService, type ThemeMode } from "../service/ThemeService";
import { buildViewData } from "../service/viewData";
import type { ContentLocale, ExternalLink, SectionDefinition } from "../service/types";

/** Pasta base dos arquivos JSON do portfolio (relativa a webapp/). */
const CONTENT_BASE_URL = "content";

/** Link externo normalizado para exibicao na navegacao e no rodape. */
interface NavLink extends ExternalLink {
    text: string;
    isMail: boolean;
}

/** Garante rotulo e detecta e-mails (mailto) para abrir differently. */
function normalizeLinks(links: ExternalLink[]): NavLink[] {
    return links.map((link) => {
        const text = link.label ? String(link.label) : link.id;
        return { ...link, text, isMail: link.url.startsWith("mailto:") };
    });
}

/**
 * Controller da view raiz (App.view.xml).
 *
 * Ele carrega o portfolio (JSON) uma unica vez, publica no model "content" e
 * so entao libera a navegacao - garantindo que nenhuma tela ja apareca vazia.
 */
export default class AppController extends BaseController {
    private routerStarted = false;

    // onInit e onAfterRendering sao ganchos de ciclo de vida do UI5.
    public override onInit(): void {
        void this.loadPortfolio();
    }

    /**
     * O router so pode iniciar depois que o NavContainer foi criado, ou seja,
     * depois do primeiro rendering da view raiz.
     */
    public override onAfterRendering(): void {
        if (!this.routerStarted) {
            this.routerStarted = true;
            this.component().getRouter().initialize();
        }
    }

    /** Carrega, valida, traduz e publica o conteudo no model. */
    private async loadPortfolio(): Promise<void> {
        const source = await loadSourceConfig(CONTENT_BASE_URL, browserFetcher);
        const dataSource = createDataSource(source, { baseUrl: CONTENT_BASE_URL, fetcher: browserFetcher });
        const service = await ContentService.boot({ dataSource, locale: this.locale() });

        const contentModel = this.model("content") as JSONModel;
        const viewData = buildViewData(service);

        // Um unico setData: sobrescrever duas vezes apagaria o documento do
        // portfolio (perfil, experiencias...) e deixaria apenas as derivacoes.
        contentModel.setData({
            ...service.content,
            ...viewData,
            navLinks: normalizeLinks(viewData.navLinks),
            footerLinks: normalizeLinks(viewData.footerLinks)
        });

        this.component()
            .getRouter()
            .attachRouteMatched((event) => {
                const name = (event.getParameter("name") as string) ?? "";
                this.model("ui")?.setProperty("/activeRoute", name);
            });

        await this.publishUiOptions();
        this.model("ui")?.setProperty("/busy", false);
        this.hideSplash();
    }

    /**
     * Publica as opcoes de tema e idioma dos SegmentedButton da rodape.
     *
     * Os rotulos vem do resource bundle (i18n) porque o model "ui" e um JSONModel
     * e nao resolve chaves i18n sozinho. Os itens sao criados via API porque
     * sap.m.SegmentedButton declara "buttons" como defaultAggregation e ignora
     * templates XML na agregacao "items".
     */
    private async publishUiOptions(): Promise<void> {
        const view = this.getView();
        const i18n = view?.getModel("i18n") as ResourceModel | undefined;
        // O manifest declara asyncSupport, entao o bundle pode chegar como Promise.
        const bundle = await i18n?.getResourceBundle();
        const text = (key: string): string => bundle?.getText(key) ?? key;

        const fill = (id: string, options: { key: string; text: string }[]): void => {
            const toggle = view?.byId(id) as SegmentedButton | undefined;
            if (!toggle) {
                Log.warning("SegmentedButton nao encontrado: " + id);
                return;
            }
            toggle.removeAllItems();
            options.forEach((option) => {
                toggle.addItem(new SegmentedButtonItem({ key: option.key, text: option.text }));
            });
        };

        fill("themeToggle", [
            { key: "light", text: text("theme.light") },
            { key: "dark", text: text("theme.dark") }
        ]);
        fill("localeToggle", [
            { key: "pt", text: text("language.pt") },
            { key: "en", text: text("language.en") }
        ]);
    }

    /** Navega para a secao escolhida na barra superior. */
    public onNavPress(event: sap.ui.base.Event): void {
        const route = this.sourceContext(event)?.getProperty("route") as SectionDefinition["route"];
        if (route) {
            this.navigate(route);
        }
    }

    /** Abre um link externo (ou o cliente de e-mail) a partir da barra/rodape. */
    public onLinkPress(event: sap.ui.base.Event): void {
        const context = this.sourceContext(event);
        this.openLink(context?.getProperty("url"), context?.getProperty("isMail"));
    }

    /** Botao "curriculo" da barra superior. */
    public onCvPress(): void {
        this.navigate("cv");
    }

    // ------------------------------------------------------------------
    // Tema e idioma
    // ------------------------------------------------------------------

    /** Alterna claro/escuro pelo SegmentedButton do rodape. */
    public onThemeChange(event: sap.ui.base.Event<{ key: string }>): void {
        const key = (event.getParameter("key") as ThemeMode) ?? "light";
        ThemeService.apply(key);
        this.model("ui")?.setProperty("/theme", key);
    }

    /** Troca o idioma (recarrega pela URL ?lang=). */
    public onLocaleChange(event: sap.ui.base.Event<{ key: string }>): void {
        const key = event.getParameter("key") as ContentLocale;
        this.switchLocale(key);
    }

    /** Remove a tela de carregamento exibida pelo index.html. */
    private hideSplash(): void {
        const splash = document.getElementById("pf-splash");
        if (!splash) {
            return;
        }

        splash.classList.add("is-hidden");
        window.setTimeout(() => splash.remove(), 400);
    }
}
