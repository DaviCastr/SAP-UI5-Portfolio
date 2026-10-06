import type { CvPdfImage } from "./cvPdf";

/**
 * Foto do perfil para o PDF gerado no navegador.
 *
 * A foto aparece com ~80pt no PDF; embutir o original (800px, ~1 MB) so incha o
 * arquivo. Aqui ela e recortada no quadrado central e reduzida para 240px em
 * JPEG - nitida ate na impressao, com ~30 KB no total.
 *
 * Avatar SVG, ausente ou com erro de carga = PDF sem foto (undefined).
 */
export async function loadPdfPhoto(url: string | undefined): Promise<CvPdfImage | undefined> {
    const match = /\.(png|jpe?g)$/i.exec(url ?? "");
    if (!url || !match) {
        return undefined;
    }
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return undefined;
        }
        const blob = await response.blob();
        return (
            (await shrink(blob)) ?? {
                data: new Uint8Array(await blob.arrayBuffer()),
                format: match[1].toLowerCase() === "png" ? "PNG" : "JPEG"
            }
        );
    } catch {
        return undefined;
    }
}

/** Recorte quadrado central (como o circulo do PDF espera) em 240px JPEG. */
async function shrink(blob: Blob, size = 240): Promise<CvPdfImage | undefined> {
    try {
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) {
            return undefined;
        }
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
        const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
        return jpeg ? { data: new Uint8Array(await jpeg.arrayBuffer()), format: "JPEG" } : undefined;
    } catch {
        return undefined;
    }
}
