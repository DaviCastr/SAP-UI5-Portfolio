import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import PDFDocument from "pdfkit";
import { localizeText } from "../../webapp/service/Localizer";
import { loadLocalizedContent, readFlag, REPO_ROOT, run } from "../shared/nodeContent";
import { isSapCertified, orderCertificates } from "../../webapp/service/liveSources";
import { sortEducationByRecency } from "../../webapp/service/ordering";
import { isSoftSkill } from "../../webapp/service/viewData";
import type {
    Certificate,
    ContentLocale,
    Education,
    Experience,
    Project,
    Skill
} from "../../webapp/service/types";

/**
 * Gera o PDF do curriculo a partir dos mesmos JSONs da aplicacao.
 *
 * Uso:
 *   npm run cv:pdf
 *   npm run cv:pdf -- --lang=en --out=dist/cv.pdf
 *
 * O PDF nao e versionado (esta no .gitignore): ele e gerado no build/deploy a
 * partir do conteudo, garantindo que nunca fique desatualizado em relacao a tela.
 */

const ACCENT = "#0a6ed1";
const TEXT = "#1d2d3e";
const MUTED = "#5b6b7c";
const RULE = "#d9e2ec";

/** Rotulos usados no documento (iguais em qualquer idioma, exceto o valor). */
interface Labels {
    summary: string;
    experience: string;
    projects: string;
    education: string;
    courses: string;
    certificates: string;
    skills: string;
    softSkills: string;
    otherCertificates: string;
    highlights: string;
    stack: string;
    present: string;
    until: string;
    page: string;
}

const LABELS: Record<ContentLocale, Labels> = {
    pt: {
        summary: "Resumo",
        experience: "Experiencia",
        projects: "Projetos",
        education: "Formacao",
        courses: "Cursos",
        certificates: "Certificacoes",
        skills: "Conhecimentos",
        softSkills: "Competencias comportamentais",
        otherCertificates: "demais conclusoes",
        highlights: "Destaques",
        stack: "Tecnologias",
        present: "atual",
        until: "ate",
        page: "Pagina"
    },
    en: {
        summary: "Summary",
        experience: "Experience",
        projects: "Projects",
        education: "Education",
        courses: "Courses",
        certificates: "Certifications",
        skills: "Skills",
        softSkills: "Soft skills",
        otherCertificates: "other completions",
        highlights: "Highlights",
        stack: "Tech",
        present: "present",
        until: "until",
        page: "Page"
    }
};

/** "2021-03" -> "mar/2021" (ou "Mar 2021" em ingles). */
function formatMonth(value: string, locale: ContentLocale): string {
    const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
    if (!match) {
        return value ?? "";
    }

    const months =
        locale === "pt"
            ? ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
            : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return `${months[Number(match[2]) - 1]}/${match[1]}`;
}

/** "2021-03" -> "2021" ou "2021-2024" (periodo completo emExperience). */
function formatPeriod(
    period: Experience["period"] | undefined,
    locale: ContentLocale,
    labels: Labels
): string {
    if (!period?.from) {
        return "";
    }
    const from = formatMonth(period.from, locale);
    const to = period.to ? formatMonth(period.to, locale) : labels.present;
    return `${from} ${labels.until} ${to}`;
}

/** Telefone em formato legivel: 5585988512382 -> +55 85 98851-2382. */
function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 11) {
        return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 10)}-${digits.slice(10)}`;
    }
    if (digits.length === 13) {
        return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 10)} ${digits.slice(10)}`;
    }
    return value;
}

/** Agrupa skills por categoria, ja ordenadas por nivel (maior primeiro). */
function skillsByCategory(skills: Skill[]): Map<string, Skill[]> {
    const groups = new Map<string, Skill[]>();
    skills.forEach((skill) => {
        // `category` pode ser `{ pt, en }`; o conteudo ja vem localizado de
        // `loadLocalizedContent`, mas o tipo permite os dois.
        const category = localizeText(skill.category, "en");
        groups.set(category, [...(groups.get(category) ?? []), skill]);
    });
    groups.forEach((items) => items.sort((a, b) => b.level - a.level));
    return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

async function main(): Promise<void> {
    const locale = (readFlag("lang") === "en" ? "en" : "pt") as ContentLocale;
    const outPath = resolve(REPO_ROOT, readFlag("out") ?? "webapp/cv/davi-castro-cv.pdf");
    const labels = LABELS[locale];

    const content = await loadLocalizedContent(locale);
    const { profile } = content;
    const doc = new PDFDocument({
        size: "A4",
        margins: { top: 42, bottom: 42, left: 42, right: 42 },
        info: { Title: `${profile.name} - CV`, Author: profile.name }
    });

    await mkdir(dirname(outPath), { recursive: true });
    const stream = createWriteStream(outPath);
    doc.pipe(stream);

    // ---------------------------------------------------------------- cabecalho
    doc.font("Helvetica-Bold").fontSize(20).fillColor(TEXT).text(profile.name);
    doc.moveDown(0.15);
    doc.font("Helvetica")
        .fontSize(11)
        .fillColor(ACCENT)
        .text(String(profile.role ?? ""));

    const contact = [
        profile.email,
        profile.phone ? formatPhone(profile.phone) : "",
        profile.location ? String(profile.location) : "",
        ...profile.links.map((link) => link.url.replace(/^https?:\/\//, "").replace(/\/$/, ""))
    ].filter(Boolean);
    doc.moveDown(0.4);
    doc.fontSize(8.5).fillColor(MUTED).text(contact.join("  |  "));
    doc.moveDown(0.6);
    doc.moveTo(doc.x, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .lineWidth(1)
        .strokeColor(RULE)
        .stroke();
    doc.moveDown(0.8);

    // ------------------------------------------------------------------ helpers
    const heading = (text: string): void => {
        doc.moveDown(0.6);
        doc.font("Helvetica-Bold")
            .fontSize(10)
            .fillColor(ACCENT)
            .text(text.toUpperCase(), { characterSpacing: 0.6 });
        doc.moveDown(0.3);
        const y = doc.y;
        doc.moveTo(doc.x, y)
            .lineTo(doc.page.width - doc.page.margins.right, y)
            .lineWidth(0.5)
            .strokeColor(RULE)
            .stroke();
        doc.moveDown(0.35);
    };

    const paragraph = (text: string, options: { indent?: number } = {}): void => {
        doc.font("Helvetica")
            .fontSize(9)
            .fillColor(TEXT)
            .text(text, { align: "left", indent: options.indent ?? 0 });
        doc.moveDown(0.25);
    };

    const bullets = (items: string[], indent = 10): void => {
        items.forEach((item) => {
            doc.font("Helvetica").fontSize(9).fillColor(TEXT).text(`-  ${item}`, { indent, width: 460 });
            doc.moveDown(0.1);
        });
        doc.moveDown(0.15);
    };

    /** Titulo + subtitulo + periodo alinhado a direita, como em um curriculo. */
    const entry = (title: string, subtitle: string, meta: string): void => {
        const right = doc.page.width - doc.page.margins.right;
        const metaWidth = 110;
        const top = doc.y;

        doc.font("Helvetica-Bold")
            .fontSize(9.5)
            .fillColor(TEXT)
            .text(title, { width: right - doc.x - metaWidth });
        doc.font("Helvetica")
            .fontSize(9)
            .fillColor(MUTED)
            .text(subtitle, { width: right - doc.x - metaWidth });
        doc.font("Helvetica")
            .fontSize(8.5)
            .fillColor(ACCENT)
            .text(meta, { width: metaWidth, align: "right" });

        // Volta ao topo do bloco para nao deixar o espaco do texto ao lado.
        doc.y = top;
        doc.moveDown(1.5);
    };

    // ------------------------------------------------------------------- resumo
    if (profile.summary) {
        heading(labels.summary);
        paragraph(String(profile.summary));
    }

    // --------------------------------------------------------------- experiencia
    const jobs = content.experiences.filter((item) => item.kind !== "project");
    if (jobs.length > 0) {
        heading(labels.experience);
        jobs.forEach((item) => {
            entry(item.company, String(item.role), formatPeriod(item.period, locale, labels));
            paragraph(String(item.summary), { indent: 10 });
            if (item.highlights?.length) {
                doc.font("Helvetica-Bold")
                    .fontSize(8.5)
                    .fillColor(MUTED)
                    .text(labels.highlights, { indent: 10 });
                doc.moveDown(0.15);
                bullets(item.highlights.map(String), 18);
            }
            if (item.stack?.length) {
                doc.font("Helvetica")
                    .fontSize(8.5)
                    .fillColor(MUTED)
                    .text(`${labels.stack}: ${item.stack.join(", ")}`, { indent: 10 });
                doc.moveDown(0.4);
            }
        });
    }

    // ----------------------------------------------------------------- projetos
    const featured: Project[] = content.projects.filter((item) => item.featured).slice(0, 4);
    if (featured.length > 0) {
        heading(labels.projects);
        featured.forEach((project) => {
            const meta = project.stars ? `${project.stars}*` : "";
            entry(
                project.name,
                [String(project.role ?? ""), project.stack.join(", ")].filter(Boolean).join(" - "),
                meta
            );
            paragraph(String(project.description), { indent: 10 });
            if (project.highlights?.length) {
                bullets(project.highlights.map(String), 18);
            }
        });
    }

    // ---------------------------------------------------------------- formacao
    // Mesma ordem da tela: da mais recente para a mais antiga (ver
    // `sortEducationByRecency`).
    const education: Education[] = sortEducationByRecency(
        content.education.filter((item) => item.kind !== "course")
    );
    if (education.length > 0) {
        heading(labels.education);
        education.forEach((item) => {
            entry(item.institution, String(item.degree), formatPeriod(item.period, locale, labels));
            if (item.description) {
                paragraph(String(item.description), { indent: 10 });
            }
        });
    }

    const courses =
        content.courses.length > 0
            ? content.courses
            : content.education.filter((item) => item.kind === "course");
    if (courses.length > 0) {
        heading(labels.courses);
        bullets(courses.map((course) => [String(course.name), course.issuer].filter(Boolean).join(" - ")));
    }

    // ----------------------------------------------------------- certificacoes
    // Apenas as "SAP Certified", pelo mesmo motivo da tela (ver
    // `cvCertificates` em viewData.ts): as 15 conclusoes de curso curto sao o
    // que empurra o documento para uma segunda pagina e nao mudam a leitura.
    const certified: Certificate[] = orderCertificates(content.certificates).filter((item) =>
        isSapCertified(item.title)
    );
    if (certified.length > 0) {
        heading(labels.certificates);
        certified.forEach((item) => {
            doc.font("Helvetica")
                .fontSize(9)
                .fillColor(TEXT)
                .text(`-  ${item.title} - ${item.issuer} (${item.issuedAt})`, {
                    indent: 10,
                    width: 460
                });
            doc.moveDown(0.1);
        });
    }

    // ----------------------------------------------------------------- skills
    // Conhecimentos tecnicos e competencias comportamental em blocos separados:
    // misturar os dois no mesmo paragrafo faz o curriculum mais longo e
    // esconde o que e ferramenta e o que e comportamento.
    const groups = skillsByCategory(content.skills.filter((skill) => !isSoftSkill(skill)));
    if (groups.size > 0) {
        heading(labels.skills);
        groups.forEach((skills, category) => {
            doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT).text(category, { continued: false });
            doc.moveDown(0.1);
            doc.font("Helvetica")
                .fontSize(8.5)
                .fillColor(MUTED)
                .text(skills.map((skill) => `${skill.name} (${skill.level}/5)`).join(", "), { indent: 10 });
            doc.moveDown(0.35);
        });
    }

    const soft = content.skills.filter(isSoftSkill);
    if (soft.length > 0) {
        heading(labels.softSkills);
        // Nome e descricao: no curriculum impresso a soft skill sem descricao
        // vira so uma palavra, e nao diz nada. A descricao e o que mostra como
        // a competencia se manifesta.
        soft.forEach((skill) => {
            const nome = localizeText(skill.name, locale);
            const descricao = skill.description ? localizeText(skill.description, locale) : "";
            const nivel = skill.level ? ` (${skill.level}/5)` : "";

            doc.font("Helvetica-Bold").fontSize(8.5).fillColor(TEXT).text(`${nome}${nivel}`, {
                indent: 10,
                continued: true
            });
            if (descricao) {
                doc
                    .font("Helvetica")
                    .fontSize(8.5)
                    .fillColor(MUTED)
                    .text(` - ${descricao}`, { indent: 10 });
            }
            doc.moveDown(0.15);
        });
        doc.moveDown(0.2);
    }

    /*
     * O pdfkit Nao materializa as paginas seguintes enquanto o texto esta sendo
     * escrito: `bufferedPageRange()` devolvia `count: 1` mesmo com o documento
     * ja em duas paginas, entao o rodape saia em "Pagina 1/1" e a ultima pagina
     * ficava praticamente vazia - aparecia um folio em branco so com o rodape.
     *
     * A solucao e escrever o rodape como ultimo passo de cada pagina, no
     * callback `pageAdded` disparado pelo pdfkit quando uma nova pagina comeca.
     * Ele e chamado com a pagina *nova* ja ativa, entao o rodape da pagina que
     * acabou vai em `previousPage()`; a ultima recebe o total no `endPage`.
     */
    /*
     * Rodape por pagina.
     *
     * `bufferedPageRange()` nao serve aqui: no pdfkit 0.20 ele devolve
     * `count: 1` enquanto o texto ainda esta sendo escrito, porque as paginas
     * so sao materializadas no `end()`. Por isso o total impresso saia "1/1" num
     * documento de duas paginas.
     *
     * A saida e escrever o rodape de cada pagina no instante em que ela termina,
     * dentro do `pageAdded` da proxima. Dois cuidados:
     *   - a primeira pagina ja existe quando o construtor de `PDFDocument`
     *     retorna, antes deste `on`, entao a contagem comeca em 1;
     *   - o rodape fica *abaixo* de `page.maxY()`, e escrever la faria o pdfkit
     *     criar outra pagina - o que dispara `pageAdded` de novo, em laco
     *     infinito. Por isso o `maxY` e estendido temporariamente.
     */
    let totalPages = 1;

    const writeFooter = (posicao: number, total: number): void => {
        const bottom = doc.page.height - 28;
        const marginOriginal = doc.page.margins.bottom;

        /*
         * `page.maxY()` e `height - margins.bottom`, e o rodape fica logo abaixo
         * dele. Escrever nessa faixa faz o pdfkit ver "sem espaco" e abrir outra
         * pagina - que dispara `pageAdded` de novo, em laco infinito (o gerador
         * chegou a produzir 674 paginas). Zerar a margem inferior durante a
         * escrita resolve: o rodape fica dentro da area util.
         */
        doc.page.margins.bottom = 0;

        doc.font("Helvetica")
            .fontSize(8)
            .fillColor(MUTED)
            .text(`${labels.page} ${posicao}/${total}`, doc.page.margins.left, bottom, {
                align: "center",
                width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
                lineBreak: false
            });

        doc.page.margins.bottom = marginOriginal;
    };

    doc.on("pageAdded", () => {
        totalPages += 1;
        // `totalPages` agora e o numero da pagina que acabou de ser criada; a
        // anterior (totalPages - 1) ja pode receber o rodape. Ainda nao se sabe
        // quantas virao, entao o total e escrito apenas na ultima pagina.
        writeFooter(totalPages - 1, totalPages - 1);
    });

    writeFooter(totalPages, totalPages);

    doc.end();
    await new Promise<void>((resolvePromise) => stream.on("finish", () => resolvePromise()));
    console.log(`PDF gerado: ${outPath} (${locale.toUpperCase()})`);
}

void run("cv:pdf", main);
