import { describe, expect, it } from "vitest";
import {
    isSapCertified,
    mapCredlyBadges,
    mapGitHubInfo,
    orderCertificates,
    readBadgeUrl,
    readCategory,
    readIssuer,
    repoKey,
    toDate,
    toMonth,
    toRepo
} from "../webapp/model/data/liveSources";
import type { Certificate } from "../webapp/model/types";

/** Badge do Credly com os campos minimos usados pelo mapeamento. */
function badge(id: string, name: string, extra: Record<string, unknown> = {}) {
    return { id, badge_template: { name }, ...extra };
}

describe("mapCredlyBadges", () => {
    it("extrai os campos que o app usa", () => {
        const [mapped] = mapCredlyBadges({
            data: [
                badge("abc123", "SAP Certified - Fiori", {
                    issued_at_date: "2025-08-27",
                    expires_at_date: null,
                    badge_template: { name: "SAP Certified - Fiori", image_url: "https://img/b.png" }
                })
            ]
        });

        expect(mapped).toEqual({
            id: "abc123",
            title: "SAP Certified - Fiori",
            issuer: "Credly",
            issuedAt: "2025-08-27",
            expiresAt: null,
            url: "https://www.credly.com/badges/abc123",
            image: "https://img/b.png",
            source: "credly",
            category: "Certification",
            featured: true
        });
    });

    it("preserva item manual, que nunca vem do Credly", () => {
        const manual: Certificate = {
            id: "manual-1",
            title: "Certificado manual",
            issuer: "Empresa",
            issuedAt: "2019-01-01",
            expiresAt: null,
            source: "manual"
        };

        const mapped = mapCredlyBadges({ data: [badge("credly-1", "SAP Certified - ABAP")] }, [manual]);

        expect(mapped.map((item) => item.id)).toEqual(["credly-1", "manual-1"]);
    });

    it("mantem imagem baixada e destaque manual de um badge ja sincronizado", () => {
        const previous: Certificate[] = [
            {
                id: "credly-1",
                title: "SAP Certified - ABAP",
                issuer: "SAP",
                issuedAt: "2025-08-29",
                expiresAt: null,
                image: "local/credly-1.png",
                source: "credly",
                featured: true
            }
        ];

        const [mapped] = mapCredlyBadges({ data: [badge("credly-1", "SAP Certified - ABAP")] }, previous);

        expect(mapped.image).toBe("local/credly-1.png");
        expect(mapped.featured).toBe(true);
    });

    it("ignora badge sem id ou sem nome, que viraria entrada instavel", () => {
        const mapped = mapCredlyBadges({ data: [{ id: "sem-nome" }, badge("so-id", ""), badge("ok", "Curso")] });

        expect(mapped.map((item) => item.id)).toEqual(["ok"]);
    });

    it("aceita payload ausente sem lancar erro", () => {
        expect(mapCredlyBadges({})).toEqual([]);
        expect(mapCredlyBadges({ data: null })).toEqual([]);
    });

    it("mantem a ordem de triagem: SAP Certified antes das demais", () => {
        const mapped = mapCredlyBadges({
            data: [
                badge("roa", "Learning the Basics of ABAP", { issued_at_date: "2024-07-18" }),
                badge("sap", "SAP Certified - Fiori", { issued_at_date: "2025-08-27" })
            ]
        });

        expect(mapped.map((item) => item.id)).toEqual(["sap", "roa"]);
    });
});

describe("readIssuer", () => {
    it("prefere o nome da organizacao", () => {
        expect(
            readIssuer({
                id: "1",
                issuer: { entities: [{ entity: { name: "SAP" } }, { entity: { name: "Outro" } }] }
            })
        ).toBe("SAP");
    });

    it("limpa o prefixo 'issued by' do resumo", () => {
        expect(readIssuer({ id: "1", issuer: { summary: "issued by SAP" } })).toBe("SAP");
    });

    it("cai para Credly quando nao ha emissor", () => {
        expect(readIssuer({ id: "1" })).toBe("Credly");
    });
});

describe("readCategory", () => {
    it("classifica por tipo de credencial", () => {
        expect(readCategory("SAP Certified - Fiori")).toBe("Certification");
        expect(readCategory("Introducing SAP ABAP - Record of Achievement")).toBe("Achievement");
        expect(readCategory("Learning the Basics of ABAP")).toBe("Course");
    });

    it("reconhece 'Record of Achievement' mesmo sem 'certified' no titulo", () => {
        expect(readCategory("Learning the Basics - Record of Achievement")).toBe("Achievement");
    });
});

describe("readBadgeUrl", () => {
    it("prefere a URL por UUID, que abre a credencial no nome do titular", () => {
        expect(readBadgeUrl({ id: "abc", badge_template: { url: "https://www.credly.com/org/x/badge/y" } })).toBe(
            "https://www.credly.com/badges/abc"
        );
    });

    it("converte a URL de organizacao quando nao ha id", () => {
        expect(
            readBadgeUrl({
                id: "",
                badge_template: { url: "https://www.credly.com/org/sap/badge/abap-fundamentals" }
            })
        ).toBe("https://www.credly.com/badges/abap-fundamentals");
    });

    it("devolve indefinido sem id e sem URL de template", () => {
        expect(readBadgeUrl({ id: "" })).toBeUndefined();
    });
});

describe("isSapCertified", () => {
    it("aceita variations de caixa e espacos", () => {
        expect(isSapCertified("SAP Certified - Fiori")).toBe(true);
        expect(isSapCertified("SAP-certified")).toBe(true);
        expect(isSapCertified("SAPCERTIFIED")).toBe(true);
    });

    it("nao confunde com uma certificacao de outra empresa", () => {
        expect(isSapCertified("Certified SAP")).toBe(false);
        expect(isSapCertified("Learning SAP BTP")).toBe(false);
    });
});

describe("orderCertificates", () => {
    const cert = (id: string, title: string, issuedAt: string): Certificate => ({
        id,
        title,
        issuer: "SAP",
        issuedAt,
        expiresAt: null
    });

    it("coloca as SAP Certified primeiro, mesmo sendo mais antigas", () => {
        const ordered = orderCertificates([cert("recente", "Curso novo", "2025-09-01"), cert("sap", "SAP Certified - Fiori", "2020-01-01")]);

        expect(ordered.map((item) => item.id)).toEqual(["sap", "recente"]);
    });

    it("dentro de cada grupo ordena da mais recente para a mais antiga", () => {
        const ordered = orderCertificates([cert("antiga", "A", "2020-01-01"), cert("nova", "B", "2024-01-01"), cert("meio", "C", "2022-01-01")]);

        expect(ordered.map((item) => item.id)).toEqual(["nova", "meio", "antiga"]);
    });

    it("joga para o fim o que nao tem data, que senao ordenaria antes de tudo", () => {
        const ordered = orderCertificates([cert("sem-data", "Sem data", ""), cert("com-data", "Com data", "2024-01-01")]);

        expect(ordered.map((item) => item.id)).toEqual(["com-data", "sem-data"]);
    });

    it("desempata pelo titulo para a lista nao oscilar entre carregamentos", () => {
        const ordered = orderCertificates([cert("b", "Zebra", "2024-01-01"), cert("a", "Alfa", "2024-01-01")]);

        expect(ordered.map((item) => item.id)).toEqual(["a", "b"]);
    });

    it("nao altera a lista original", () => {
        const original = [cert("a", "A", "2024-01-01"), cert("sap", "SAP Certified", "2020-01-01")];

        orderCertificates(original);

        expect(original.map((item) => item.id)).toEqual(["a", "sap"]);
    });
});

describe("repoKey", () => {
    it("extrai dono/repositorio de qualquer forma de URL", () => {
        expect(repoKey("https://github.com/DaviCastr/SAP-UI5-Portfolio")).toBe("DaviCastr/SAP-UI5-Portfolio");
        expect(repoKey("https://github.com/DaviCastr/repo.git")).toBe("DaviCastr/repo");
        expect(repoKey("git@github.com:DaviCastr/repo.git")).toBeUndefined();
        expect(repoKey(undefined)).toBeUndefined();
    });
});

describe("toMonth / toDate", () => {
    it("reduz para mes e dia", () => {
        expect(toMonth("2026-10-05T12:00:00Z")).toBe("2026-10");
        expect(toDate("2026-10-05T12:00:00Z")).toBe("2026-10-05");
    });

    it("devolve indefinido quando nao ha data", () => {
        expect(toMonth(undefined)).toBeUndefined();
        expect(toDate(undefined)).toBeUndefined();
    });
});

describe("toRepo", () => {
    it("converte o repositorio da API no formato do app", () => {
        expect(
            toRepo({
                name: "SAP-UI5-Portfolio",
                html_url: "https://github.com/DaviCastr/SAP-UI5-Portfolio",
                description: "Portfolio",
                stargazers_count: 3,
                forks_count: 2,
                language: "TypeScript",
                pushed_at: "2026-10-05T12:00:00Z",
                fork: false,
                archived: false,
                topics: ["sap", "ui5"]
            })
        ).toEqual({
            name: "SAP-UI5-Portfolio",
            url: "https://github.com/DaviCastr/SAP-UI5-Portfolio",
            description: "Portfolio",
            language: "TypeScript",
            stars: 3,
            forks: 2,
            topics: ["sap", "ui5"],
            pushedAt: "2026-10",
            homepage: undefined,
            siteUrl: undefined
        });
    });

    it("omite campos vazios em vez de gravar string vazia no JSON", () => {
        const repo = toRepo({
            name: "vazio",
            html_url: "https://github.com/a/vazio",
            stargazers_count: 0,
            forks_count: 0,
            fork: false,
            archived: false
        });

        expect(repo.description).toBeUndefined();
        expect(repo.language).toBeUndefined();
        expect(repo.topics).toBeUndefined();
    });

    it("aceita homepage apenas com http(s)", () => {
        const base = { name: "n", html_url: "https://github.com/a/n", stargazers_count: 0, forks_count: 0, fork: false, archived: false };

        expect(toRepo({ ...base, homepage: "https://davi.dev" }).homepage).toBe("https://davi.dev");
        expect(toRepo({ ...base, homepage: "javascript:alert(1)" }).homepage).toBeUndefined();
        expect(toRepo({ ...base, homepage: "davi.dev" }).homepage).toBeUndefined();
    });

    it("siteUrl: usa o homepage cadastrado ou monta a URL do GitHub Pages", () => {
        const base = {
            name: "SAP-UI5-ExpenseManager",
            html_url: "https://github.com/DaviCastr/SAP-UI5-ExpenseManager",
            stargazers_count: 0,
            forks_count: 0,
            fork: false,
            archived: false
        };

        expect(toRepo({ ...base, has_pages: true }).siteUrl).toBe(
            "https://davicastr.github.io/SAP-UI5-ExpenseManager/"
        );
        expect(toRepo({ ...base, has_pages: true, homepage: "https://app.vercel.app" }).siteUrl).toBe(
            "https://app.vercel.app"
        );
        expect(toRepo({ ...base, homepage: "javascript:alert(1)" }).siteUrl).toBeUndefined();
        expect(toRepo(base).siteUrl).toBeUndefined();
    });
});

describe("mapGitHubInfo", () => {
    const repo = (name: string, extra: Record<string, unknown> = {}) => ({
        name,
        html_url: `https://github.com/DaviCastr/${name}`,
        fork: false,
        archived: false,
        stargazers_count: 0,
        forks_count: 0,
        ...extra
    });

    it("monta a lista de repositorios do perfil", () => {
        const info = mapGitHubInfo(
            { login: "DaviCastr", html_url: "https://github.com/DaviCastr" },
            [repo("a"), repo("b")],
            "2026-10-05T00:00:00.000Z"
        );

        expect(info).toEqual({
            login: "DaviCastr",
            profileUrl: "https://github.com/DaviCastr",
            syncedAt: "2026-10-05T00:00:00.000Z",
            repoCount: 2,
            repos: [expect.objectContaining({ name: "a" }), expect.objectContaining({ name: "b" })]
        });
    });

    it("deixa de fora fork e arquivado: nenhum dos dois e trabalho do portfolio", () => {
        const info = mapGitHubInfo({ login: "DaviCastr", html_url: "https://github.com/DaviCastr" }, [
            repo("meu", { stargazers_count: 1 }),
            repo("fork", { fork: true }),
            repo("antigo", { archived: true })
        ]);

        expect(info.repoCount).toBe(1);
        expect(info.repos?.map((item) => item.name)).toEqual(["meu"]);
    });

    it("usa o momento atual quando syncedAt nao e informado", () => {
        const info = mapGitHubInfo({ login: "DaviCastr", html_url: "https://github.com/DaviCastr" }, []);

        expect(info.syncedAt).toBeTruthy();
        expect(Number.isNaN(Date.parse(info.syncedAt as string))).toBe(false);
    });
});