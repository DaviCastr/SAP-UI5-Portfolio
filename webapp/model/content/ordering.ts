import type { Education, Project } from "../types";

/**
 * Regras de ordenacao de listas que mais de um consumidor precisa conhecer.
 *
 * Vive fora de `viewData.ts` de proposito: alem das telas, o gerador do PDF
 * (`tools/cv/generate-pdf.ts`) le os JSONs direto e tem de aplicar a mesma
 * ordem - um modulo neutro evita que o PDF e a tela discordem.
 */

/**
 * Formacao, da mais recente para a mais antiga.
 *
 * O criterio e a data de **fim** (`period.to`), e nao a de inicio: e o que se le
 * em primeiro lugar numa linha do tempo ("Bacharelado 2019-2022" antes de
 * "Tecnico 2016-2018"). Registro sem `to` - curso em andamento - e tratado como
 * o mais recente possivel.
 *
 * O `id` desempata para a lista nao mudar de posicao entre dois carregamentos
 * quando varios registros terminam no mesmo mes.
 */
export function sortEducationByRecency(education: Education[]): Education[] {
    const end = (item: Education): string => item.period?.to ?? "";
    const start = (item: Education): string => item.period?.from ?? "";
    const hasEnd = (item: Education): boolean => end(item) !== "";

    return [...education].sort((a, b) => {
        // Registro em andamento (sem `to`) antes dos que ja terminaram.
        if (hasEnd(a) !== hasEnd(b)) {
            return hasEnd(a) ? 1 : -1;
        }
        return end(b).localeCompare(end(a)) || start(b).localeCompare(start(a)) || a.id.localeCompare(b.id);
    });
}
/**
 * Projetos, do mais recente para o mais antigo.
 *
 * 1. Em andamento primeiro: `current: true` (projeto atual sem data conhecida)
 *    ou periodo com inicio e sem `to`.
 * 2. Depois os datados, pela data de fim e, empatando, pela de inicio.
 * 3. Por ultimo os sem data, na ordem em que estao no JSON (sort estavel).
 *
 * Antes, projeto sem periodo caia no fim mesmo sendo o atual - a Home mostrava
 * um projeto de 2025 como "mais recente" no lugar do que esta em andamento.
 */
export function sortProjectsByRecency(projects: Project[]): Project[] {
    const rank = (item: Project): number => {
        if (item.current || (item.period?.from && !item.period.to)) {
            return 0;
        }
        return item.period?.from ? 1 : 2;
    };
    const end = (item: Project): string => item.period?.to ?? item.period?.from ?? "";
    const start = (item: Project): string => item.period?.from ?? "";

    return [...projects].sort(
        (a, b) => rank(a) - rank(b) || end(b).localeCompare(end(a)) || start(b).localeCompare(start(a))
    );
}
