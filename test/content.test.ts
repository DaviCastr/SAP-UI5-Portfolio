import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateContent } from "../webapp/service/validator";
import { loadRawContent, REPO_ROOT } from "../tools/shared/nodeContent";

/**
 * Testes de integridade dos JSONs versionados.
 *
 * Sao os que quebram primeiro quando alguem edita o conteudo na mao: e mais
 * util ter o erro aqui do que descobrir um card vazio na tela.
 */
describe("conteudo do portfolio", () => {
    it("passa na validacao sem nenhum problema", async () => {
        const content = await loadRawContent();
        const issues = validateContent(content);
        expect(issues).toEqual([]);
    });

    it("mantem ids unicos entre as secoes de dados", async () => {
        const content = await loadRawContent();
        const ids = [
            ...content.experiences,
            ...content.skills,
            ...content.projects,
            ...content.certificates,
            ...content.education,
            ...content.sections
        ].map((item) => item.id);

        const duplicated = ids.filter((id, index) => ids.indexOf(id) !== index);
        expect(duplicated).toEqual([]);
    });

    it("todas as secoes ativas tem rota declarada", async () => {
        const content = await loadRawContent();
        const active = content.sections.filter((section) => section.enabled !== false);
        expect(active.length).toBeGreaterThan(0);
        active.forEach((section) => expect(section.route).toMatch(/^[a-z][a-z0-9-]*$/));
    });

    it("os ids de foco do perfil existem em skills.json", async () => {
        const content = await loadRawContent();
        const known = new Set(content.skills.map((skill) => skill.id));
        const missing = (content.profile.focusSkills ?? []).filter((id) => !known.has(id));
        expect(missing).toEqual([]);
    });

    it("o avatar informado existe no disco", async () => {
        const content = await loadRawContent();
        await expect(access(resolve(REPO_ROOT, "webapp", content.profile.avatar))).resolves.toBeUndefined();
    });

    it("as imagens locais das certificacoes existem no disco", async () => {
        const content = await loadRawContent();
        const local = content.certificates.filter((item) => item.image && !item.image.startsWith("http"));

        for (const item of local) {
            await expect(
                access(resolve(REPO_ROOT, "webapp", item.image as string)),
                `imagem ausente: ${item.image}`
            ).resolves.toBeUndefined();
        }
        expect(Array.isArray(content.certificates)).toBe(true);
    });

    it("o periodo das experiencias comeca antes de terminar", async () => {
        const content = await loadRawContent();
        content.experiences.forEach((item) => {
            if (item.period?.to) {
                expect(
                    item.period.to >= item.period.from,
                    `${item.id}: ${item.period.from} -> ${item.period.to}`
                ).toBe(true);
            }
        });
    });
});
