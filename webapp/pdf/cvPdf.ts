import { jsPDF } from "jspdf";
import { formatMonthYear } from "../model/dates";
import { localizeText } from "../model/content/Localizer";
import { isSapCertified, orderCertificates } from "../model/data/liveSources";
import { sortEducationByRecency, sortProjectsByRecency } from "../model/content/ordering";
import { isSoftSkill } from "../model/content/viewData";
import type { ContentLocale, Period, PortfolioContent, Skill } from "../model/types";

/**
 * Gerador do PDF do curriculo.
 *
 * Roda nas duas pontas com o MESMO layout:
 *   - no navegador, pelo botao "Baixar PDF" (BaseController.onDownloadPress),
 *     gerado na hora a partir do conteudo ja carregado e no idioma ativo;
 *   - no Node, por `npm run cv:pdf` (tools/cv/generate-pdf.ts), que grava o
 *     arquivo estatico usado como alternativa caso a geracao no browser falhe.
 *
 * Por isso este modulo so usa o jsPDF e funcoes puras: nada de DOM, `fetch`
 * ou `fs`. A foto chega pronta em bytes (`CvPdfOptions.photo`).
 *
 * Layout A4 em duas colunas: faixa de cabecalho com foto, barra lateral com
 * contato/idiomas/competencias e coluna principal com resumo, experiencia,
 * projetos, formacao e certificacoes SAP. As cores sao as do site
 * (tokens.css), para o PDF ser reconhecivel como parte do portfolio.
 */

/** Imagem ja carregada (PNG ou JPEG). */
export interface CvPdfImage {
    data: Uint8Array;
    format: "PNG" | "JPEG";
}

export interface CvPdfOptions {
    photo?: CvPdfImage;
    /** Data exibida no rodape ("gerado em"). Padrao: agora. */
    generatedAt?: Date;
}

// ---------------------------------------------------------------- paleta
// Mesmos tons de tokens.css (--pf-primary, --pf-accent e derivados).
const HEADER = "#0b3a33";
const PRIMARY = "#0e7c6b";
const PRIMARY_SOFT = "#e2f2ef";
const ON_HEADER_MUTED = "#a8d8cf";
const ACCENT = "#b45309";
const ACCENT_SOFT = "#fdf0dc";
const TEXT = "#1d2d3e";
const MUTED = "#5b6b7c";
const RULE = "#d9e2ec";
const SIDEBAR_BG = "#f2f6f5";
const TRACK = "#d5e3e0";

// ------------------------------------------------------------- geometria (pt)
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const HEADER_H = 110;
const SIDEBAR_W = 190;
const PAD = 22;
const FOOTER_H = 26;
const MAIN_X = SIDEBAR_W + PAD;
const MAIN_W = PAGE_W - MAIN_X - PAD;
const SIDE_X = PAD - 4;
const SIDE_W = SIDEBAR_W - PAD - 10;
const BOTTOM = PAGE_H - FOOTER_H - 8;

interface Labels {
    contact: string;
    languages: string;
    skills: string;
    softSkills: string;
    summary: string;
    experience: string;
    projects: string;
    education: string;
    certificates: string;
    present: string;
    generated: string;
    page: string;
}

const LABELS: Record<ContentLocale, Labels> = {
    pt: {
        contact: "Contato",
        languages: "Idiomas",
        skills: "Conhecimentos",
        softSkills: "Competências",
        summary: "Resumo",
        experience: "Experiência",
        projects: "Projetos em destaque",
        education: "Formação",
        certificates: "Certificações SAP",
        present: "atual",
        generated: "Gerado em",
        page: "Página"
    },
    en: {
        contact: "Contact",
        languages: "Languages",
        skills: "Skills",
        softSkills: "Soft skills",
        summary: "Summary",
        experience: "Experience",
        projects: "Featured projects",
        education: "Education",
        certificates: "SAP Certifications",
        present: "present",
        generated: "Generated on",
        page: "Page"
    }
};

/** "2021-03" ou "2021-03-15" -> "mar/2021" (mesmo texto do site, ver model/dates.ts). */
export function formatCvMonth(value: string | null | undefined, locale: ContentLocale): string {
    return value ? formatMonthYear(value, locale) : "";
}

/** Periodo "mar/2021 – atual". */
export function formatCvPeriod(period: Period | undefined, locale: ContentLocale): string {
    if (!period?.from) {
        return "";
    }
    const to = period.to ? formatCvMonth(period.to, locale) : LABELS[locale].present;
    return `${formatCvMonth(period.from, locale)} – ${to}`;
}

/** 5585988512382 -> +55 85 98851-2382. */
function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 13) {
        return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 11) {
        return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return value;
}

/** URL sem protocolo nem barra final, para caber na barra lateral. */
function shortUrl(url: string): string {
    return url
        .replace(/^mailto:/, "")
        .replace(/^https?:\/\/(www\.)?/, "")
        .replace(/\/$/, "");
}

/** Nome do arquivo baixado: davi-castro-cv-pt.pdf. */
export function cvPdfFileName(content: PortfolioContent, locale: ContentLocale): string {
    const slug = content.profile.name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return `${slug || "cv"}-cv-${locale}.pdf`;
}

/** Skills tecnicas agrupadas por categoria, maior nivel primeiro. */
function groupSkills(skills: Skill[], locale: ContentLocale): [string, Skill[]][] {
    const groups = new Map<string, Skill[]>();
    skills.forEach((skill) => {
        const category = localizeText(skill.category, locale);
        groups.set(category, [...(groups.get(category) ?? []), skill]);
    });
    groups.forEach((items) => items.sort((a, b) => b.level - a.level));
    return [...groups.entries()];
}

/**
 * Monta o documento. `content` deve estar localizado para `locale` (como em
 * `ContentService.content` ou `loadLocalizedContent`); textos `{ pt, en }`
 * remanescentes sao resolvidos aqui por seguranca.
 */
export function buildCvPdf(
    content: PortfolioContent,
    locale: ContentLocale,
    options: CvPdfOptions = {}
): jsPDF {
    // Espacamento confortavel primeiro; se nao couber em uma pagina, aperta os
    // respiros entre blocos (nunca a fonte). So passa para a segunda pagina se
    // nem o layout compacto couber - e ai a quebra e natural, sem folha vazia.
    const comfortable = renderCvPdf(content, locale, options, 1);
    if (comfortable.getNumberOfPages() === 1) {
        return comfortable;
    }
    for (const density of [0.85, 0.7, 0.5, 0.25]) {
        const compact = renderCvPdf(content, locale, options, density);
        if (compact.getNumberOfPages() === 1) {
            return compact;
        }
    }
    // Nem apertado cabe: melhor duas paginas com respiro normal do que duas
    // paginas espremidas.
    return comfortable;
}

/** Desenha o documento; `density` (0..1) escala os espacos verticais entre blocos. */
function renderCvPdf(
    content: PortfolioContent,
    locale: ContentLocale,
    options: CvPdfOptions,
    density: number
): jsPDF {
    const sp = (gap: number): number => gap * density;
    const labels = LABELS[locale];
    const t = (value: unknown): string =>
        value === undefined || value === null ? "" : localizeText(value as never, locale);
    const { profile } = content;

    const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
    doc.setProperties({
        title: `${profile.name} - CV`,
        author: profile.name,
        subject: t(profile.role),
        creator: "SAP-UI5-Portfolio"
    });

    // Cursores independentes das duas colunas.
    let mainY = 0;
    let sideY = 0;

    const font = (style: "normal" | "bold" | "italic", size: number, color: string): void => {
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        doc.setTextColor(color);
    };
    const lineHeight = (size: number): number => size * 1.32;

    /** Fundo da barra lateral (repetido em cada pagina). */
    const paintSidebar = (top: number): void => {
        doc.setFillColor(SIDEBAR_BG);
        doc.rect(0, top, SIDEBAR_W, PAGE_H - top, "F");
    };

    /*
     * Cada coluna tem a propria pagina corrente. A lateral e desenhada inteira
     * antes da principal; se ela transbordar para a pagina 2, a principal ainda
     * precisa comecar na pagina 1 - por isso "avancar" e ir para a proxima
     * pagina daquela coluna (criando-a so se ainda nao existir), e nao zerar
     * as duas colunas como antes.
     */
    let mainPage = 1;
    let sidePage = 1;

    /** Proxima pagina (cria com faixa fina no topo e lateral, sem repetir o cabecalho). */
    const gotoPage = (page: number): void => {
        while (doc.getNumberOfPages() < page) {
            doc.addPage();
            doc.setFillColor(HEADER);
            doc.rect(0, 0, PAGE_W, 10, "F");
            paintSidebar(10);
        }
        doc.setPage(page);
    };

    const ensureMain = (height: number): void => {
        if (mainY + height > BOTTOM) {
            mainPage += 1;
            gotoPage(mainPage);
            mainY = 34;
        }
    };
    const ensureSide = (height: number): void => {
        if (sideY + height > BOTTOM) {
            sidePage += 1;
            gotoPage(sidePage);
            sideY = 34;
        }
    };

    /** Texto com quebra automatica; devolve o novo y. */
    const wrapped = (text: string, x: number, y: number, width: number, size: number): number => {
        const lines = doc.splitTextToSize(text, width) as string[];
        lines.forEach((line, index) => doc.text(line, x, y + index * lineHeight(size)));
        return y + lines.length * lineHeight(size);
    };

    /** Chips com quebra de linha; devolve o y abaixo da ultima linha. */
    const chips = (
        items: string[],
        x: number,
        y: number,
        width: number,
        colors: { bg: string; fg: string } = { bg: PRIMARY_SOFT, fg: PRIMARY }
    ): number => {
        const size = 7.2;
        const h = 12.5;
        const gap = 4;
        let cx = x;
        let cy = y;
        font("bold", size, colors.fg);
        items.forEach((item) => {
            const w = doc.getTextWidth(item) + 12;
            if (cx + w > x + width && cx > x) {
                cx = x;
                cy += h + gap;
            }
            doc.setFillColor(colors.bg);
            doc.roundedRect(cx, cy, w, h, 6, 6, "F");
            doc.text(item, cx + 6, cy + h / 2 + size * 0.35);
            cx += w + gap;
        });
        return items.length ? cy + h : y;
    };

    // =========================================================== cabecalho
    paintSidebar(HEADER_H);
    doc.setFillColor(HEADER);
    doc.rect(0, 0, PAGE_W, HEADER_H, "F");
    // Filete em ambar sob a faixa: a mesma combinacao primaria/acento do site.
    doc.setFillColor(ACCENT);
    doc.rect(0, HEADER_H, PAGE_W, 3, "F");

    const photoR = 38;
    const photoCx = SIDEBAR_W / 2;
    const photoCy = HEADER_H / 2 + 2;
    let textX = PAD;
    if (options.photo) {
        try {
            doc.saveGraphicsState();
            doc.circle(photoCx, photoCy, photoR, null);
            doc.clip();
            doc.discardPath();
            doc.addImage(
                options.photo.data,
                options.photo.format,
                photoCx - photoR,
                photoCy - photoR,
                photoR * 2,
                photoR * 2
            );
            doc.restoreGraphicsState();
            doc.setDrawColor(PRIMARY);
            doc.setLineWidth(2.5);
            doc.circle(photoCx, photoCy, photoR + 1.5, "S");
            textX = MAIN_X;
        } catch {
            // Imagem invalida: segue sem foto, com o nome alinhado a esquerda.
            doc.restoreGraphicsState();
        }
    }

    font("bold", 25, "#ffffff");
    doc.text(profile.name, textX, 44);
    font("bold", 12, ON_HEADER_MUTED);
    doc.text(t(profile.role), textX, 63);
    if (profile.headline) {
        font("normal", 8.8, "#e6f2ef");
        wrapped(t(profile.headline), textX, 80, PAGE_W - textX - PAD, 8.8);
    }
    if (profile.availability) {
        const label = t(profile.availability);
        font("bold", 7.2, HEADER);
        const w = doc.getTextWidth(label) + 14;
        doc.setFillColor(ACCENT_SOFT);
        doc.roundedRect(PAGE_W - PAD - w, 18, w, 14, 7, 7, "F");
        doc.setTextColor(ACCENT);
        doc.text(label, PAGE_W - PAD - w + 7, 27.5);
    }

    mainY = HEADER_H + 26;
    sideY = HEADER_H + 26;

    // ========================================================= barra lateral
    const sideHeading = (text: string): void => {
        // Titulo + ao menos dois itens: o titulo nunca fica sozinho no pe da coluna.
        ensureSide(60);
        font("bold", 8.5, PRIMARY);
        doc.text(text.toUpperCase(), SIDE_X, sideY, { charSpace: 0.8 });
        doc.setDrawColor(PRIMARY);
        doc.setLineWidth(1.2);
        doc.line(SIDE_X, sideY + 4, SIDE_X + 22, sideY + 4);
        sideY += 16;
    };

    // Contato: rotulo pequeno + valor, para nao depender de icones.
    sideHeading(labels.contact);
    const contactRows: [string, string][] = [];
    if (profile.email) {
        contactRows.push(["E-mail", profile.email]);
    }
    if (profile.phone) {
        contactRows.push([locale === "pt" ? "Telefone" : "Phone", formatPhone(profile.phone)]);
    }
    if (profile.location) {
        contactRows.push([locale === "pt" ? "Local" : "Location", t(profile.location)]);
    }
    profile.links
        .filter((link) => !link.url.startsWith("mailto:"))
        .forEach((link) => contactRows.push([t(link.label), shortUrl(link.url)]));

    contactRows.forEach(([label, value]) => {
        ensureSide(24);
        font("bold", 6.8, MUTED);
        doc.text(label.toUpperCase(), SIDE_X, sideY, { charSpace: 0.3 });
        font("normal", 8, TEXT);
        sideY = wrapped(value, SIDE_X, sideY + 9.5, SIDE_W, 8) + 4;
    });
    sideY += 8;

    // Idiomas
    if (profile.languages?.length) {
        sideHeading(labels.languages);
        profile.languages.forEach((language) => {
            ensureSide(14);
            font("bold", 8.2, TEXT);
            doc.text(t(language.name), SIDE_X, sideY);
            font("normal", 7.6, MUTED);
            doc.text(t(language.level), SIDE_X + SIDE_W, sideY, { align: "right" });
            sideY += 13;
        });
        sideY += 8;
    }

    // Conhecimentos tecnicos com barra de nivel (1 a 5).
    const hard = content.skills.filter((skill) => !isSoftSkill(skill));
    if (hard.length) {
        sideHeading(labels.skills);
        groupSkills(hard, locale).forEach(([category, skills]) => {
            ensureSide(24);
            font("bold", 7, ACCENT);
            doc.text(category.toUpperCase(), SIDE_X, sideY, { charSpace: 0.4 });
            sideY += 10;
            skills.forEach((skill) => {
                ensureSide(16);
                font("normal", 8, TEXT);
                doc.text(t(skill.name), SIDE_X, sideY);
                const barY = sideY + 3;
                doc.setFillColor(TRACK);
                doc.roundedRect(SIDE_X, barY, SIDE_W, 2.8, 1.4, 1.4, "F");
                doc.setFillColor(PRIMARY);
                const level = Math.max(0, Math.min(5, skill.level || 0));
                doc.roundedRect(SIDE_X, barY, (SIDE_W * level) / 5, 2.8, 1.4, 1.4, "F");
                sideY += 17;
            });
            sideY += 3;
        });
        sideY += 5;
    }

    // Soft skills: nome + pontos de nivel. A descricao fica na tela do site.
    const soft = content.skills.filter(isSoftSkill);
    if (soft.length) {
        sideHeading(labels.softSkills);
        soft.forEach((skill) => {
            ensureSide(14);
            font("normal", 8, TEXT);
            const nameLines = doc.splitTextToSize(t(skill.name), SIDE_W - 34) as string[];
            nameLines.forEach((line, index) => doc.text(line, SIDE_X, sideY + index * lineHeight(8)));
            for (let dot = 0; dot < 5; dot += 1) {
                doc.setFillColor(dot < (skill.level || 0) ? ACCENT : TRACK);
                doc.circle(SIDE_X + SIDE_W - 2.5 - (4 - dot) * 7, sideY - 2.6, 2.3, "F");
            }
            sideY += Math.max(1, nameLines.length) * lineHeight(8) + 3;
        });
    }

    // ===================================================== coluna principal
    // A lateral pode ter terminado em outra pagina: a principal comeca na 1.
    gotoPage(mainPage);
    const mainHeading = (text: string): void => {
        // Respiro fixo acima do titulo: nao encosta nos chips do bloco anterior.
        mainY += 6;
        // Titulo + o comeco do primeiro item juntos (sem titulo orfao no pe da pagina).
        ensureMain(100);
        font("bold", 10.5, HEADER);
        doc.text(text.toUpperCase(), MAIN_X, mainY, { charSpace: 0.9 });
        const textW = doc.getTextWidth(text.toUpperCase()) + text.length * 0.9;
        doc.setDrawColor(RULE);
        doc.setLineWidth(0.7);
        doc.line(MAIN_X + textW + 8, mainY - 3.5, MAIN_X + MAIN_W, mainY - 3.5);
        doc.setFillColor(ACCENT);
        doc.rect(MAIN_X, mainY + 4, 18, 2, "F");
        mainY += 20;
    };

    /** Titulo a esquerda e periodo (pilula) a direita. */
    const entryHead = (title: string, subtitle: string, meta: string): void => {
        ensureMain(40);
        let metaW = 0;
        if (meta) {
            font("bold", 7.2, PRIMARY);
            metaW = doc.getTextWidth(meta) + 12;
            doc.setFillColor(PRIMARY_SOFT);
            doc.roundedRect(MAIN_X + MAIN_W - metaW, mainY - 9, metaW, 13, 6.5, 6.5, "F");
            doc.text(meta, MAIN_X + MAIN_W - metaW + 6, mainY - 0.4);
        }
        font("bold", 10.5, TEXT);
        mainY = wrapped(title, MAIN_X, mainY, MAIN_W - metaW - 8, 10.5);
        if (subtitle) {
            font("bold", 8.6, PRIMARY);
            mainY = wrapped(subtitle, MAIN_X, mainY, MAIN_W - 8, 8.6);
        }
        mainY += 2;
    };

    const body = (text: string): void => {
        if (!text) {
            return;
        }
        font("normal", 8.8, TEXT);
        const lines = doc.splitTextToSize(text, MAIN_W) as string[];
        ensureMain(lines.length * lineHeight(8.8));
        mainY = wrapped(text, MAIN_X, mainY, MAIN_W, 8.8) + 1;
    };

    const bullets = (items: string[]): void => {
        items.filter(Boolean).forEach((item) => {
            font("normal", 8.6, TEXT);
            const lines = doc.splitTextToSize(item, MAIN_W - 12) as string[];
            ensureMain(lines.length * lineHeight(8.6));
            doc.setFillColor(ACCENT);
            doc.circle(MAIN_X + 3, mainY - 2.8, 1.6, "F");
            mainY = wrapped(item, MAIN_X + 11, mainY, MAIN_W - 12, 8.6);
        });
    };

    const stackChips = (items: string[]): void => {
        if (!items.length) {
            return;
        }
        ensureMain(18);
        // +10 fixo: a linha de base do proximo titulo precisa ficar abaixo da altura dos chips.
        mainY = chips(items, MAIN_X, mainY + 2, MAIN_W) + 10 + sp(6);
    };

    if (profile.summary) {
        mainHeading(labels.summary);
        body(t(profile.summary));
        mainY += sp(10);
    }

    const experiences = content.experiences;
    if (experiences.length) {
        mainHeading(labels.experience);
        experiences.forEach((item, index) => {
            // Titulo, empresa e as primeiras linhas juntos: nunca so o titulo no pe da pagina.
            ensureMain(70);
            entryHead(t(item.role), item.company, formatCvPeriod(item.period, locale));
            body(t(item.summary));
            bullets((item.highlights ?? []).map(t));
            stackChips(item.stack ?? []);
            mainY += index < experiences.length - 1 ? sp(8) : sp(4);
        });
        mainY += sp(6);
    }

    // Mesma ordem da tela: em andamento primeiro, depois do mais recente ao mais antigo.
    const projects = sortProjectsByRecency(content.projects.filter((project) => project.featured)).slice(
        0,
        4
    );
    if (projects.length) {
        mainHeading(labels.projects);
        projects.forEach((project) => {
            // Sem "★": a Helvetica padrao do PDF so cobre WinAnsi.
            const meta = project.stars ? `${project.stars} ${locale === "pt" ? "estrelas" : "stars"}` : "";
            ensureMain(70);
            const subtitle = [t(project.role), project.company ?? ""].filter(Boolean).join(" · ");
            entryHead(t(project.name), subtitle, meta);
            body(t(project.description));
            if (project.url || project.repo) {
                font("normal", 7.6, ACCENT);
                ensureMain(11);
                doc.textWithLink(shortUrl(project.repo || project.url || ""), MAIN_X, mainY, {
                    url: project.repo || project.url || ""
                });
                mainY += 10;
            }
            stackChips(project.stack ?? []);
            mainY += sp(8);
        });
        mainY += sp(4);
    }

    const education = sortEducationByRecency(content.education.filter((item) => item.kind !== "course"));
    if (education.length) {
        mainHeading(labels.education);
        education.forEach((item) => {
            entryHead(t(item.degree), item.institution, formatCvPeriod(item.period, locale));
            mainY += sp(5);
        });
        mainY += sp(6);
    }

    // Apenas as "SAP Certified" (mesma regra da tela - ver cvCertificates).
    const certified = orderCertificates(content.certificates).filter((item) => isSapCertified(item.title));
    if (certified.length) {
        mainHeading(labels.certificates);
        certified.forEach((item) => {
            font("bold", 8.8, TEXT);
            const title = item.title.replace(/^SAP Certified\s*[-–]\s*/i, "");
            const lines = doc.splitTextToSize(title, MAIN_W - 80) as string[];
            const h = Math.max(24, lines.length * lineHeight(8.8) + 13);
            ensureMain(h + 6);
            const top = mainY - 10;
            doc.setFillColor(ACCENT_SOFT);
            doc.roundedRect(MAIN_X, top, MAIN_W, h, 4, 4, "F");
            doc.setFillColor(ACCENT);
            doc.rect(MAIN_X, top, 3, h, "F");
            font("bold", 6.6, ACCENT);
            doc.text("SAP CERTIFIED", MAIN_X + 10, top + 9, { charSpace: 0.5 });
            font("bold", 8.8, TEXT);
            lines.forEach((line, index) => doc.text(line, MAIN_X + 10, top + 19 + index * lineHeight(8.8)));
            font("normal", 7.6, MUTED);
            doc.text(formatCvMonth(item.issuedAt, locale), MAIN_X + MAIN_W - 8, top + 9, {
                align: "right"
            });
            if (item.url) {
                doc.link(MAIN_X, top, MAIN_W, h, { url: item.url });
            }
            mainY = top + h + 6 + 10;
        });
    }

    // ============================================================== rodape
    const total = doc.getNumberOfPages();
    const when = options.generatedAt ?? new Date();
    const date = when.toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
    for (let page = 1; page <= total; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(RULE);
        doc.setLineWidth(0.6);
        doc.line(MAIN_X, PAGE_H - FOOTER_H, PAGE_W - PAD, PAGE_H - FOOTER_H);
        font("normal", 7, MUTED);
        doc.text(`${labels.generated} ${date}`, MAIN_X, PAGE_H - FOOTER_H + 12);
        if (total > 1) {
            doc.text(`${labels.page} ${page}/${total}`, PAGE_W - PAD, PAGE_H - FOOTER_H + 12, {
                align: "right"
            });
        }
    }

    return doc;
}
