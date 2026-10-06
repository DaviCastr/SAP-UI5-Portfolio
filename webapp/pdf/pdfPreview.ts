import type { ContentLocale } from "../model/types";

/**
 * Aba de pre-visualizacao do PDF do curriculo.
 *
 * Abrir o blob direto no visualizador do navegador funciona, mas o botao de
 * download nativo salva com o nome do blob (um UUID). Por isso a aba recebe uma
 * pagina propria: o PDF em tela cheia e uma barra com "Baixar PDF", que salva
 * com o nome certo (`davi-castro-cv-pt.pdf`).
 *
 * A aba precisa ser aberta de forma SINCRONA no clique (`openPreviewTab`): o
 * PDF so fica pronto depois de `await`s, e um `window.open` feito depois disso
 * e barrado pelo bloqueador de pop-ups.
 */

const LABELS: Record<ContentLocale, { loading: string; download: string; hint: string }> = {
    pt: {
        loading: "Gerando PDF…",
        download: "Baixar PDF",
        hint: "Se a visualização não aparecer (alguns celulares), use “Baixar PDF”."
    },
    en: {
        loading: "Generating PDF…",
        download: "Download PDF",
        hint: "If the preview does not show up (some phones), use “Download PDF”."
    }
};

/** Mesma paleta do PDF/site (tokens.css). */
const STYLE = `
    html, body { margin: 0; height: 100%; background: #525659; font-family: system-ui, "Segoe UI", Arial, sans-serif; }
    .bar { position: fixed; inset: 0 0 auto 0; height: 52px; display: flex; align-items: center; gap: 12px;
           padding: 0 16px; background: #0b3a33; color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.25); box-sizing: border-box; }
    .bar__title { flex: 1; font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar__hint { font-size: 12px; color: #a8d8cf; }
    .bar__btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 999px;
                background: #b45309; color: #fff; font-weight: 600; font-size: 14px; text-decoration: none; }
    .bar__btn:hover, .bar__btn:focus-visible { background: #92400e; outline: 2px solid #fff; outline-offset: 2px; }
    .frame { position: fixed; inset: 52px 0 0 0; width: 100%; height: calc(100% - 52px); border: 0; }
    .loading { height: 100%; display: grid; place-items: center; color: #fff; font-size: 16px; }
    @media (max-width: 640px) { .bar__hint { display: none; } }
`;

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** Abre a aba ja com "Gerando PDF…". `null` = pop-up bloqueado. */
export function openPreviewTab(locale: ContentLocale): Window | null {
    const tab = window.open("", "_blank");
    if (!tab) {
        return null;
    }
    tab.document.open();
    tab.document.write(
        `<!doctype html><html lang="${locale}"><head><meta charset="utf-8">` +
            `<title>${escapeHtml(LABELS[locale].loading)}</title><style>${STYLE}</style></head>` +
            `<body><div class="loading">${escapeHtml(LABELS[locale].loading)}</div></body></html>`
    );
    tab.document.close();
    return tab;
}

/**
 * Troca o "Gerando PDF…" pelo visualizador. A URL do blob e liberada quando a
 * aba fecha (enquanto ela estiver aberta, o iframe e o botao dependem dela).
 */
export function showPdfInTab(
    tab: Window,
    pdf: Blob,
    options: { fileName: string; title: string; locale: ContentLocale }
): void {
    const url = URL.createObjectURL(pdf);
    const labels = LABELS[options.locale];
    const title = escapeHtml(options.title);

    tab.document.open();
    tab.document.write(
        `<!doctype html><html lang="${options.locale}"><head><meta charset="utf-8">` +
            '<meta name="viewport" content="width=device-width, initial-scale=1">' +
            `<title>${title}</title><style>${STYLE}</style></head><body>` +
            '<header class="bar">' +
            `<span class="bar__title">${title}</span>` +
            `<span class="bar__hint">${escapeHtml(labels.hint)}</span>` +
            `<a class="bar__btn" href="${url}" download="${escapeHtml(options.fileName)}">&#8681; ${escapeHtml(labels.download)}</a>` +
            "</header>" +
            `<iframe class="frame" src="${url}#view=FitH" title="${title}"></iframe>` +
            "</body></html>"
    );
    tab.document.close();
    tab.addEventListener("pagehide", () => URL.revokeObjectURL(url));
    tab.focus();
}
