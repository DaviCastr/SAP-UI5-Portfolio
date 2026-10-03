import { validateContent } from "../../webapp/service/validator";
import { loadContentService, readFlag, run } from "./nodeContent";
import type { ContentLocale } from "../../webapp/service/types";

/**
 * Valida os JSONs do portfolio e falha (exit 1) se houver problemas.
 *
 * Uso: npm run content:check [-- --lang=en]
 *
 * Serve de "type check" do conteudo: se alguem acrescentar um item no JSON sem
 * `id`, com periodo invalido ou e-mail quebrado, o CI para antes do deploy.
 */
async function main(): Promise<void> {
    const locale = (readFlag("lang") ?? "pt") as ContentLocale;
    const service = await loadContentService(locale);
    const content = service.rawContent;
    const issues = validateContent(content);

    console.log(`Conteudo verificado em ${locale.toUpperCase()}:`);
    console.log(`  experiences:   ${content.experiences.length}`);
    console.log(`  skills:        ${content.skills.length}`);
    console.log(`  projects:      ${content.projects.length}`);
    console.log(`  certificates:  ${content.certificates.length}`);
    console.log(`  education:     ${content.education.length}`);
    console.log(`  courses:       ${content.courses.length}`);
    console.log(`  sections:      ${content.sections.filter((item) => item.enabled).length} ativas`);

    if (issues.length === 0) {
        console.log("\nOK: nenhum problema de conteudo.");
        return;
    }

    console.error(`\n${issues.length} problema(s) de conteudo:`);
    issues.forEach((item) => console.error(`  - ${item.path}: ${item.message}`));
    process.exitCode = 1;
}

void run("content:check", main);
