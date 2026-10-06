import { emptyContent } from "../../webapp/model/content/ContentService";
import type { PortfolioContent } from "../../webapp/model/types";

/**
 * Monta um PortfolioContent completo a partir de um parcial.
 *
 * Os testes quase sempre precisam de um documento valido e so alteram alguns
 * campos - este helper evita repetir o JSON base em cada arquivo de teste.
 */
export function buildContent(partial: Partial<PortfolioContent> = {}): PortfolioContent {
    return {
        ...emptyContent(),
        ...partial,
        profile: {
            id: "profile",
            name: "Davi Castro",
            role: "Consultor",
            headline: "SAP",
            summary: "Resumo",
            about: ["Sobre mim"],
            avatar: "images/profile-placeholder.svg",
            email: "davifgeo@gmail.com",
            languages: [{ id: "pt", name: "Portugues", level: "Nativo" }],
            links: [{ id: "github", label: "GitHub", url: "https://github.com/DaviCastr" }],
            focusSkills: [],
            ...partial.profile
        }
    };
}
