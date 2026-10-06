import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Certificate } from "../../webapp/model/types";
import {
    CREDLY_BADGES_URL,
    mapCredlyBadges,
    type CredlyBadge,
    type CredlyResponse
} from "../../webapp/model/data/liveSources";
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
 *
 * O mapeamento do payload fica em `webapp/model/data/liveSources.ts`, compartilhado
 * com o app - e o mesmo codigo que roda no browser quando o portfolio tenta
 * buscar as certificacoes ao vivo.
 */

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

    // O mapeamento e compartilhado com o app, mas aqui a imagem ainda precisa ser
    // baixada: no browser ela fica como URL remoto. Por isso o payload e
    // higienizado antes de ir para o mapeador.
    const data = await Promise.all(
        badges.map(async (badge) => ({
            ...badge,
            badge_template: {
                ...badge.badge_template,
                image_url: await resolveImage(badge, downloadImages)
            }
        }))
    );
    const forMapping: CredlyResponse = { data };

    for (const badge of data) {
        if (!badge.badge_template?.name) {
            console.warn(`  ! badge ${badge.id || "(sem id)"} sem nome - ignorada`);
        }
    }

    const merged = mapCredlyBadges(forMapping, existing);
    const filePath = await writeContentFile("certificates.json", merged);

    const manual = merged.filter((item) => item.source !== "credly").length;
    console.log(`gravado ${filePath}`);
    console.log(`  ${merged.length - manual} do Credly + ${manual} manuais = ${merged.length}`);
    console.log(
        `  imagens: ${downloadImages ? "baixadas para webapp/images/certificates" : "URLs remotas (use --download-images para baixar)"}`
    );
    console.log(`  pasta de origem: ${CONTENT_DIR}`);
}

void run("scrape:certificates", main);