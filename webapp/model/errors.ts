import type { ContentLocale } from "./types";

/**
 * Erros da app (como o `errors/` do projeto CAP): cada falha conhecida tem um
 * tipo proprio, com mensagem tecnica (log) e mensagem para o usuario.
 */

/** Base: `userMessage` e o texto seguro para mostrar na tela. */
export abstract class PortfolioError extends Error {
    protected constructor(
        name: string,
        message: string,
        public override readonly cause?: unknown
    ) {
        super(message);
        // Nome explicito: `new.target` quebra o analisador do UI5 no build e o
        // nome da classe some na minificacao.
        this.name = name;
    }

    abstract userMessage(locale: ContentLocale): string;
}

/** Acesso ao conteudo antes do carregamento terminar (erro de programacao). */
export class ContentNotLoadedError extends PortfolioError {
    constructor() {
        super("ContentNotLoadedError", "ContentService.boot() precisa ser chamado antes do primeiro acesso.");
    }

    userMessage(locale: ContentLocale): string {
        return locale === "en" ? "The portfolio is still loading." : "O portfólio ainda está carregando.";
    }
}

/** Nao foi possivel buscar/validar os JSON do portfolio (rede, arquivo ausente...). */
export class ContentLoadError extends PortfolioError {
    constructor(cause: unknown) {
        super(
            "ContentLoadError",
            `Falha ao carregar o conteudo do portfolio: ${cause instanceof Error ? cause.message : String(cause)}`,
            cause
        );
    }

    userMessage(locale: ContentLocale): string {
        return locale === "en"
            ? "Could not load the portfolio content. Please check your connection and reload the page."
            : "Não foi possível carregar o conteúdo do portfólio. Verifique a conexão e recarregue a página.";
    }
}
