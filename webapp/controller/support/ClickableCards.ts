/**
 * Cartoes clicaveis sem botao dentro (certificados, repositorios...).
 *
 * Um unico listener delegado na raiz da view cuida de todos os cartoes que
 * casam com `selector`: o fragmento continua declarativo e funciona igual em
 * qualquer tela que o reutilize. O cartao nao carrega a URL no DOM; ela vem do
 * campo `url` do contexto de binding do controle (o `id` do elemento DOM de um
 * controle UI5 e o proprio id dele).
 *
 * Uso no controller (ver BaseController.onAfterRendering):
 *   private readonly cards = new ClickableCards(".pf-cert", (url) => open(url));
 *   onAfterRendering() { this.cards.attach(viewDomRef); }
 */
export class ClickableCards {
    private readonly boundRoots = new WeakSet<HTMLElement>();

    constructor(
        private readonly selector: string,
        private readonly open: (url: string) => void
    ) {}

    /**
     * Instala os listeners (uma vez por raiz) e sincroniza a acessibilidade.
     * Chamar a cada render: os cartoes nascem e morrem com os filtros.
     */
    public attach(root: HTMLElement | null): void {
        if (!root) {
            return;
        }
        if (!this.boundRoots.has(root)) {
            this.boundRoots.add(root);
            root.addEventListener("click", this.handleClick);
            root.addEventListener("keydown", this.handleKeydown);
        }
        this.syncAccessibility(root);
    }

    /** `role="link"` + foco por teclado apenas nos cartoes que tem destino. */
    private syncAccessibility(root: HTMLElement): void {
        root.querySelectorAll<HTMLElement>(this.selector).forEach((card) => {
            if (this.urlOf(card)) {
                card.setAttribute("role", "link");
                card.setAttribute("tabindex", "0");
            } else {
                card.removeAttribute("role");
                card.removeAttribute("tabindex");
            }
        });
    }

    private urlOf(card: HTMLElement | null): string {
        const control = card?.id ? sap.ui.getCore().byId(card.id) : null;
        const url = control?.getBindingContext()?.getProperty("url");
        return typeof url === "string" ? url : "";
    }

    private activate(card: HTMLElement | null, event: Event): void {
        const url = this.urlOf(card);
        if (url) {
            event.preventDefault();
            this.open(url);
        }
    }

    private readonly handleClick = (event: Event): void => {
        const target = event.target as HTMLElement | null;
        // Link/botao dentro do cartao continua sendo acao propria dele.
        if (target?.closest("a, button")) {
            return;
        }
        this.activate(target?.closest<HTMLElement>(this.selector) ?? null, event);
    };

    private readonly handleKeydown = (event: KeyboardEvent): void => {
        if (event.key === "Enter" || event.key === " ") {
            const target = event.target as HTMLElement | null;
            this.activate(target?.closest<HTMLElement>(this.selector) ?? null, event);
        }
    };
}
