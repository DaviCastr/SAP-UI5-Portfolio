import BusyIndicator from "sap/ui/core/BusyIndicator";
import Controller from "sap/ui/core/mvc/Controller";
import type UIComponent from "sap/ui/core/UIComponent";
import type JSONModel from "sap/ui/model/json/JSONModel";
import { ContentService } from "../service/ContentService";
import { LocaleService } from "../service/LocaleService";
import { openPreviewTab, showPdfInTab } from "../service/pdfPreview";
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
    /** Views ja instrumentadas, para nao duplicar listeners delegated. */
    private readonly boundRoots = new WeakSet<HTMLElement>();

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

    /**
     * Componente dono deste controller (tipado, sempre presente em runtime).
     *
     * Metodo, e nao getter: o Babel transforma a classe em `.extend()`, e um
     * getter viraria um "setting" do UI5 -- o `applySettings` o executaria no
     * objeto de definicao (sem `getOwnerComponent`) e quebraria o carregamento.
     */
    protected component(): UIComponent {
        return this.getOwnerComponent() as UIComponent;
    }

    /**
     * Model registrado no componente ("ui", "content", "device", ...).
     *
     * No UI5 1.153 o `sap.ui.core.mvc.Controller` nao expoe mais `getModel`, por
     * isso os controllers passam pelo componente dono da view.
     */
    protected model(sName: string): JSONModel | undefined {
        return this.component()?.getModel(sName) as JSONModel | undefined;
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
    protected content(): PortfolioContent {
        return ContentService.get().content;
    }

    protected locale(): ContentLocale {
        return LocaleService.getActive();
    }

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
    public override onAfterRendering(): void {
        const root = this.viewRoot();

        if (root && !this.boundRoots.has(root)) {
            this.boundRoots.add(root);
            root.addEventListener("click", this.handleCardActivate);
            root.addEventListener("keydown", this.handleCardKeydown);
        }

        this.syncCardAccessibility(root);
    }

    /**
     * Seletor dos cartoes clicaveis desta view.
     *
     * A URL vem sempre do campo "url" do contexto de binding, entao e so isso que
     * muda de um cartao para outro. As views que nao tem cartao clicavel
     * sobrescrevem com ":not(.pf-anything)".
     */
    protected clickableCards(): string {
        return ".pf-cert";
    }

    /**
     * Elemento DOM da view.
     *
     * `getDomRef()` existe em `sap.ui.core.mvc.View` desde sempre, mas o
     * `@openui5/ts-types` so o declara no mixin `DeclarativeSupport` - por isso
     * o cast estrutural abaixo, em vez de `any`.
     */
    private viewRoot(): HTMLElement | null {
        const view = this.getView() as unknown as { getDomRef?(): HTMLElement | null } | undefined;

        return view?.getDomRef?.() ?? null;
    }

    /** URL externa a partir do elemento DOM de um cartao clicavel. */
    private cardUrl(card: HTMLElement | null): string {
        const control = card?.id ? sap.ui.getCore().byId(card.id) : null;
        const url = control?.getBindingContext()?.getProperty("url");

        return typeof url === "string" ? url : "";
    }

    /**
     * `role`/`tabindex` sao espelhados no DOM a cada render porque os cartoes
     * nascem e morrem com os filtros (e nem todo cartao tem URL).
     */
    private syncCardAccessibility(root: HTMLElement | null): void {
        root?.querySelectorAll<HTMLElement>(this.clickableCards()).forEach((card) => {
            if (this.cardUrl(card)) {
                card.setAttribute("role", "link");
                card.setAttribute("tabindex", "0");
            } else {
                card.removeAttribute("role");
                card.removeAttribute("tabindex");
            }
        });
    }

    /** Abre o destino a partir do cartao, seja por clique, Enter ou Space. */
    private openCard(card: HTMLElement | null, event: Event): void {
        const url = this.cardUrl(card);

        if (!url) {
            return;
        }

        event.preventDefault();
        this.openExternal(url);
    }

    private readonly handleCardActivate = (event: Event): void => {
        const target = event.target as HTMLElement | null;

        // Link/botao dentro do card continua sendo acao propria dele.
        if (target?.closest("a, button")) {
            return;
        }

        this.openCard(target?.closest<HTMLElement>(this.clickableCards()) ?? null, event);
    };

    private readonly handleCardKeydown = (event: KeyboardEvent): void => {
        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }

        this.openCard(
            (event.target as HTMLElement | null)?.closest<HTMLElement>(this.clickableCards()) ?? null,
            event
        );
    };

    /** Vai para uma rota declarada no manifest.json. */
    protected navigate(route: string): void {
        this.component().getRouter().navTo(route, undefined, true);
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

    /**
     * PDF e impressao do curriculo.
     *
     * Ficam aqui, e nao no Cv.controller, porque os botoes sao renderizados pela
     * barra de secao (App.view.xml) - o controller do CV nao e o dono da UI deles.
     */
    /** PDF estatico de `npm run cv:pdf` - so usado se a geracao na hora falhar. */
    public static readonly PDF_URL = "cv/davi-castro-cv.pdf";

    /** Evita gerar dois PDFs com cliques repetidos. */
    private static generatingPdf = false;

    /**
     * Gera o PDF na hora, no navegador, com o conteudo carregado e o idioma
     * ativo (mesmo layout de `npm run cv:pdf`, ver service/cvPdf.ts), e o abre
     * numa nova aba para visualizar antes de baixar (service/pdfPreview.ts).
     *
     * O modulo do PDF (com o jsPDF) e carregado sob demanda: so quem clica em
     * "Baixar PDF" paga o download da biblioteca.
     */
    public async onDownloadPress(): Promise<void> {
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
            const { buildCvPdf, cvPdfFileName } = await new Promise<typeof import("../service/cvPdf")>(
                (resolve, reject) => sap.ui.require(["davi/portfolio/service/cvPdf"], resolve, reject)
            );
            const content = this.content();
            const locale = this.locale();
            const photo = await BaseController.loadPdfPhoto(content.profile.avatar);

            const doc = buildCvPdf(content, locale, { photo });
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
    }

    /** Foto do perfil em bytes para o PDF; SVG/ausente/erro = PDF sem foto. */
    private static async loadPdfPhoto(
        avatar: string | undefined
    ): Promise<{ data: Uint8Array; format: "PNG" | "JPEG" } | undefined> {
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
            return (
                (await BaseController.shrinkPhoto(blob)) ?? {
                    data: new Uint8Array(await blob.arrayBuffer()),
                    format
                }
            );
        } catch {
            return undefined;
        }
    }

    /**
     * A foto aparece com ~80pt no PDF; embutir o original (800px, ~1 MB) so
     * incha o arquivo. Reduz para 240px em JPEG - nitido ate na impressao.
     */
    private static async shrinkPhoto(blob: Blob): Promise<{ data: Uint8Array; format: "JPEG" } | undefined> {
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
            context.drawImage(
                bitmap,
                (bitmap.width - side) / 2,
                (bitmap.height - side) / 2,
                side,
                side,
                0,
                0,
                size,
                size
            );
            const jpeg = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, "image/jpeg", 0.88)
            );
            return jpeg ? { data: new Uint8Array(await jpeg.arrayBuffer()), format: "JPEG" } : undefined;
        } catch {
            return undefined;
        }
    }

    /** Imprime a pagina (o CSS de impressao remove menus e ajusta para A4). */
    public onPrintPress(): void {
        window.print();
    }

    /** Alterna claro/escuro e mantem o model "ui" sincronizado. */
    protected toggleTheme(): ThemeMode {
        const uiModel = this.model("ui");
        const current = (uiModel?.getProperty("/theme") as ThemeMode) ?? "light";
        const next = ThemeService.toggle(current);
        uiModel?.setProperty("/theme", next);
        return next;
    }
}
