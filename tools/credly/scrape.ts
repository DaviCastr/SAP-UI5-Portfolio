import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Certificate } from "../../webapp/service/types";
import {
    CONTENT_DIR,
    IMAGES_DIR,
    hasFlag,
    readContentFile,
    readFlag,
    run,
    writeContentFile
} from "../shared/nodeContent";

/**
 * Sincroniza as certificacoes com o perfil publico do Credly.
 *
 * Uso:
 *   npm run scrape:certificates
 *   npm run scrape:certificates -- --profile=davi-castr
 *   npm run scrape:certificates -- --download-images
 *
 * O arquivo gerado e webapp/content/certificates.json. Entradas cadastradas a
 * mao (source = "manual") sao preservadas, e as badges do Credly sao atualizadas
 * sem perder a ordem de destaque definida no JSON.
 */

/** Endereco publico de badges de um usuario do Credly. */
const CREDLY_BADGES_URL = "https://www.credly.com/users/";

/** Campos usados do payload do Credly (Badgr). */
interface CredlyBadge {
    id: string;
    issued_at_date?: string;
    expires_at_date?: string;
    issued_to?: string;
    badge_template?: {
        name?: string;
        url?: string;
        image_url?: string;
        vanity_slug?: string;
    };
    issuer?: {
        summary?: string;
        entities?: { entity?: { name?: string } }[];
    };
    vanity_slug?: string;
}

interface CredlyResponse {
    data?: CredlyBadge[];
}

/** Emissor mais legivel: prefere o nome da organizacao ao texto "issued by X". */
function readIssuer(badge: CredlyBadge): string {
    const organization = badge.issuer?.entities?.find((item) => item.entity?.name)?.entity?.name;
    const summary = badge.issuer?.summary ?? "";
    const cleaned = summary.replace(/^issued by\s+/i, "").trim();
    return organization ?? (cleaned || "Credly");
}

/** "SAP Certified - ..." vira categoria "Certification". */
function readCategory(title: string): string {
    if (/record of achievement/i.test(title)) {
        return "Achievement";
    }
    if (/certified|certification/i.test(title)) {
        return "Certification";
    }
    return "Course";
}

/**
 * URL publica da credencial no Credly.
 *
 * Preferimos o **UUID da badge** (`/badges/{id}`): e a unica URL que abre a
 * credencial *no nome de quem recebeu* - as demais (`/badges/{vanity_slug}` ou
 * `/org/{org}/badge/{slug}`) caem na pagina generica do curso, sem o titulo nem
 * o nome do titular.
 *
 * O `vanity_slug` nao serve como fallback confiavel: o Credly trunca o valor em
 * 50 caracteres, o que gerava URLs quebradas (`...-record-of-achievem`). O id
 * sempre existe, por isso e a unica fonte usada aqui.
 */
function readBadgeUrl(badge: CredlyBadge): string | undefined {
    if (badge.id) {
        return `https://www.credly.com/badges/${badge.id}`;
    }

    const templateUrl = badge.badge_template?.url;
    if (templateUrl && /^https:\/\/www\.credly\.com\/org\//.test(templateUrl)) {
        return templateUrl.replace(/\/org\/[^/]+\/badge\//, "/badges/");
    }

    return templateUrl;
}

/** Titulo seguro para usar como nome de arquivo. */
function slugify(value: string): string {
    return (
        value
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 60) || "badge"
    );
}

/** Extensao deduzida do content-type da imagem baixada. */
function extensionOf(contentType: string | null): string {
    if (contentType?.includes("svg")) {
        return "svg";
    }
    if (contentType?.includes("webp")) {
        return "webp";
    }
    return "jpg";
}

/** Baixa a imagem da badge; devolve o caminho local ou o proprio URL remoto. */
async function resolveImage(badge: CredlyBadge, downloadImages: boolean): Promise<string | undefined> {
    const remote = badge.badge_template?.image_url;
    if (!remote) {
        return undefined;
    }
    if (!downloadImages) {
        return remote;
    }

    const title = badge.badge_template?.name ?? badge.id;
    const response = await fetch(remote, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!response.ok) {
        console.warn(`  ! nao foi possivel baixar a imagem de "${title}" (HTTP ${response.status})`);
        return remote;
    }

    const folder = resolve(IMAGES_DIR, "certificates");
    await mkdir(folder, { recursive: true });
    const fileName = `${slugify(title)}.${extensionOf(response.headers.get("content-type"))}`;
    await writeFile(resolve(folder, fileName), Buffer.from(await response.arrayBuffer()));
    return `images/certificates/${fileName}`;
}

async function main(): Promise<void> {
    const profile = readFlag("profile") ?? "davi-castr";
    const downloadImages = hasFlag("download-images");
    const url = `${CREDLY_BADGES_URL}${profile}/badges.json`;

    console.log(`Lendo ${url}`);
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!response.ok) {
        throw new Error(`Credly respondeu HTTP ${response.status} para ${url}`);
    }

    const payload = (await response.json()) as CredlyResponse;
    const badges = payload.data ?? [];
    console.log(`${badges.length} badge(s) encontrada(s).`);

    const existing = await readContentFile<Certificate[]>("certificates.json", []);
    const manual = existing.filter((item) => item.source !== "credly");
    const previous = new Map(existing.map((item) => [item.id, item]));

    const synced: Certificate[] = [];
    for (const badge of badges) {
        const title = badge.badge_template?.name;
        if (!title) {
            console.warn(`  ! badge ${badge.id} sem nome - ignorada`);
            continue;
        }

        const before = previous.get(badge.id);
        const certificate: Certificate = {
            id: badge.id,
            title,
            issuer: readIssuer(badge),
            issuedAt: badge.issued_at_date ?? "",
            expiresAt: badge.expires_at_date || null,
            url: readBadgeUrl(badge),
            image: before?.image ?? (await resolveImage(badge, downloadImages)),
            source: "credly",
            category: readCategory(title),
            // Destaque automatico para as certificacoes (exames), nao para RoA.
            featured: before?.featured ?? /certified/i.test(title)
        };

        synced.push(certificate);
    }

    synced.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
    const merged = [...manual, ...synced];
    const filePath = await writeContentFile("certificates.json", merged);

    console.log(`gravado ${filePath}`);
    console.log(`  ${synced.length} do Credly + ${manual.length} manuais = ${merged.length}`);
    console.log(
        `  imagens: ${downloadImages ? "baixadas para webapp/images/certificates" : "URLs remotas (use --download-images para baixar)"}`
    );
    console.log(`  pasta de origem: ${CONTENT_DIR}`);
}

void run("scrape:certificates", main);
