import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isSapCertified } from "../webapp/model/data/liveSources";
import type { Education } from "../webapp/model/types";
import { validateContent } from "../webapp/model/content/validator";
import { isSoftSkill } from "../webapp/model/content/viewData";
import { loadContentService, loadRawContent, readContentFile, REPO_ROOT } from "../tools/shared/nodeContent";

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

    it("o arquivo de formacao esta em ordem cronologica, do mais antigo para o mais recente", async () => {
        // Le o arquivo direto, sem passar pelo ContentService: e o que esta no
        // disco que segue a linha do tempo. A inversao para leitura acontece no
        // boot - ver o describe "ordem exibida" abaixo.
        const education = await readContentFile<Education[]>("education.json", []);
        const datadas = education.filter((item) => item.period?.to);

        expect(datadas.length).toBeGreaterThan(1);
        expect(datadas.map((item) => item.period?.to)).toEqual(
            [...datadas.map((item) => item.period?.to as string)].sort((a, b) => a.localeCompare(b))
        );
    });

    it("as soft skills estao agrupadas sob a categoria Soft Skills", async () => {
        const content = await loadRawContent();
        const soft = content.skills.filter(isSoftSkill);

        expect(soft.length).toBeGreaterThan(0);
        soft.forEach((item) => {
            expect(item.category, item.id).toMatch(/^soft skills?$/i);
        });
    });

    it("as SAP Certified sao as certificacoes destacadas", async () => {
        const content = await loadRawContent();
        const destacadas = content.certificates.filter((item) => item.featured);

        expect(destacadas.length).toBeGreaterThan(0);
        destacadas.forEach((item) => {
            expect(isSapCertified(item.title), item.title).toBe(true);
        });
    });
});

describe("ordem exibida", () => {
    it("o servico entrega a formacao da mais recente para a mais antiga", async () => {
        const service = await loadContentService();
        const fins = service.content.education
            .filter((item) => item.period?.to)
            .map((item) => item.period?.to as string);

        expect(fins.length).toBeGreaterThan(1);
        expect(fins).toEqual([...fins].sort((a, b) => b.localeCompare(a)));
    });

    it("raw e localizado veem na mesma ordem, para PDF e tela concordarem", async () => {
        const service = await loadContentService();

        expect(service.rawContent.education.map((item) => item.id)).toEqual(
            service.content.education.map((item) => item.id)
        );
    });
});
