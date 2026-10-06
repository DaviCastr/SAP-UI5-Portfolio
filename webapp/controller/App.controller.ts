import Log from "sap/base/Log";
import SegmentedButton from "sap/m/SegmentedButton";
import SegmentedButtonItem from "sap/m/SegmentedButtonItem";
import type ResourceModel from "sap/ui/model/resource/ResourceModel";
import BaseController from "./BaseController";
import { loadPortfolio } from "../model/content/ContentLoader";
import type { SectionDefinition } from "../model/types";
import { ThemeService, type ThemeMode } from "../util/ThemeService";

/** Rota inicial: a unica sem a barra de secao (o hero ja mostra o contexto). */
const HOME_ROUTE = "home";

/**
 * Abaixo desta largura as abas da barra mostram so o icone: marca + 7 abas com
 * rotulo + acoes precisam de ~1077px e estouravam a viewport.
 */
const COMPACT_NAV_QUERY = "(max-width: 1199px)";

/**
 * Controller do shell (App.view.xml): topo, barra de secao, rodape e router.
 *
 * Fluxo de inicializacao:
 *   1. onInit: escuta as rotas e dispara o carregamento do conteudo;
 *   2. conteudo carregado: publica no model "content" e preenche o tema;
 *   3. router inicia so quando o shell JA renderizou (NavContainer existe) E o
 *      conteudo JA carregou - ver `startRouterWhenReady`;
 *   4. remove o splash do index.html.
 */
export default class AppController extends BaseController {
    private routerStarted = false;
    private shellRendered = false;
    private contentLoaded = false;

    /** route -> titulo traduzido, para a barra de secao. */
    private sectionTitles: Record<string, string> = {};

    private readonly compactMedia = window.matchMedia(COMPACT_NAV_QUERY);

    public override onInit(): void {
        this.applyCompactNav();
        this.compactMedia.addEventListener("change", this.applyCompactNav);

        // Antes do router iniciar: a rota inicial tambem precisa passar por aqui.
        this.component()
            .getRouter()
            .attachRouteMatched((event) => {
                const route = (event.getParameter("name") as string) ?? "";
                this.model("ui")?.setProperty("/activeRoute", route);
                this.syncSectionTitle(route);
            });

        void this.start();
    }

    /** O router so pode iniciar depois que o NavContainer da view raiz existe. */
    public override onAfterRendering(): void {
        this.shellRendered = true;
        this.startRouterWhenReady();
    }

    /**
     * Inicia o router so com as duas condicoes: NavContainer criado (primeiro
     * render do shell) e conteudo carregado.
     *
     * Iniciar so no render fazia o link direto (".../#/certificates") criar a
     * view antes do JSON chegar: o onInit da tela lia o conteudo e quebrava com
     * "ContentService.boot() precisa ser chamado antes do primeiro acesso".
     */
    private startRouterWhenReady(): void {
        if (this.routerStarted || !this.shellRendered || !this.contentLoaded) {
            return;
        }
        this.routerStarted = true;
        this.component().getRouter().initialize();
    }

    // ------------------------------------------------------------- handlers

    /** Aba da barra superior. */
    public onNavPress(event: sap.ui.base.Event): void {
        const route = this.sourceProperty<SectionDefinition["route"]>(event, "route");
        if (route) {
            this.navigate(route);
        }
    }

    /**
     * Tema claro/escuro (SegmentedButton do rodape). A key vem do controle: no
     * UI5 1.153 o selectionChange chega sem parametros.
     */
    public onThemeChange(event: sap.ui.base.Event): void {
        const mode =
            ((event.getSource() as SegmentedButton | undefined)?.getSelectedKey() as ThemeMode) || "light";
        ThemeService.apply(mode);
        this.model("ui")?.setProperty("/theme", mode);
    }

    // ------------------------------------------------------------- interno

    /** Carrega o conteudo e libera a interface. */
    private async start(): Promise<void> {
        const { modelData, sectionTitles } = await loadPortfolio(this.locale());

        this.model("content")?.setData(modelData);
        // Titulos antes do router: a primeira rota ja sai com o titulo certo.
        this.sectionTitles = sectionTitles;
        this.contentLoaded = true;
        this.startRouterWhenReady();

        await this.fillThemeToggle();
        this.model("ui")?.setProperty("/busy", false);
        this.hideSplash();
    }

    /** Publica no model "ui" se a barra esta em modo compacto (so icones). */
    private readonly applyCompactNav = (): void => {
        this.model("ui")?.setProperty("/compactNav", this.compactMedia.matches);
    };

    /** Titulo da barra de secao; vazio na home (e o vazio que esconde a barra). */
    private syncSectionTitle(route: string): void {
        const title = route === HOME_ROUTE ? "" : (this.sectionTitles[route] ?? "");
        this.model("ui")?.setProperty("/currentSectionTitle", title);
    }

    /**
     * Opcoes "Claro/Escuro" do rodape.
     *
     * Criadas via API porque o SegmentedButton ignora template XML em `items`,
     * e o selectedKey e setado direto: em two-way binding o controle gravava
     * string vazia no model durante o boot e o tema voltava para claro.
     */
    private async fillThemeToggle(): Promise<void> {
        const view = this.getView();
        const toggle = view?.byId("themeToggle") as SegmentedButton | undefined;
        if (!toggle) {
            Log.warning("SegmentedButton 'themeToggle' nao encontrado");
            return;
        }
        // O manifest declara asyncSupport: o bundle pode chegar como Promise.
        const bundle = await (view?.getModel("i18n") as ResourceModel | undefined)?.getResourceBundle();
        const text = (key: string): string => bundle?.getText(key) ?? key;

        toggle.removeAllItems();
        toggle.addItem(new SegmentedButtonItem({ key: "light", text: text("theme.light") }));
        toggle.addItem(new SegmentedButtonItem({ key: "dark", text: text("theme.dark") }));
        toggle.setSelectedKey(ThemeService.getMode());
    }

    /** Remove o splash do index.html com um fade curto. */
    private hideSplash(): void {
        const splash = document.getElementById("pf-splash");
        if (splash) {
            splash.classList.add("is-hidden");
            window.setTimeout(() => splash.remove(), 400);
        }
    }
}
