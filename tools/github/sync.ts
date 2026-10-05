import type { GitHubInfo, Project } from "../../webapp/service/types";
import {
    GITHUB_API,
    mapGitHubInfo,
    repoKey,
    toDate,
    type GhRepo,
    type GhUser
} from "../../webapp/service/liveSources";
import { readContentFile, readFlag, run, writeContentFile } from "../shared/nodeContent";

/**
 * Sincroniza os dados publicos do GitHub.
 *
 * Uso:
 *   npm run sync:github
 *   npm run sync:github -- --user=DaviCastr --token=$GITHUB_TOKEN
 *
 * Faz tres coisas:
 *   1. grava webapp/content/github.json (perfil, ultima sincronizacao e a lista
 *      de repositorios, que e o que a aba de Projetos renderiza);
 *   2. atualiza estrelas/forks/linguagem dos itens de webapp/content/projects.json
 *      cujo campo "repo" aponte para um repositorio do usuario;
 *   3. mantem `repoCount` igual ao tamanho da lista gravada.
 *
 * Sem token usa 60 requisicoes/hora da API publica - suficiente para uso local.
 *
 * O mapeamento do payload fica em `webapp/service/liveSources.ts`, o mesmo
 * codigo que o app usa quando busca os repositorios ao vivo no browser.
 */

/** Headers comuns, com autenticacao opcional via --token ou GITHUB_TOKEN. */
function buildHeaders(token: string | undefined): Record<string, string> {
    const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "sap-ui5-portfolio-sync"
    };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}

/** GET com tratamento de erro (o GitHub responde 403 quando estoura a cota). */
async function getJson<T>(url: string, token: string | undefined): Promise<T> {
    const response = await fetch(url, { headers: buildHeaders(token) });
    if (!response.ok) {
        throw new Error(`GitHub respondeu HTTP ${response.status} para ${url}`);
    }
    return (await response.json()) as T;
}

async function main(): Promise<void> {
    const token = readFlag("token") ?? process.env.GITHUB_TOKEN;
    const userArg = readFlag("user");

    const current = await readContentFile<GitHubInfo>("github.json", {} as GitHubInfo);
    const user = userArg ?? current.login;
    if (!user) {
        throw new Error("informe o usuario: npm run sync:github -- --user=DaviCastr");
    }

    const [profile, repos] = await Promise.all([
        getJson<GhUser>(`${GITHUB_API}/users/${user}`, token),
        getJson<GhRepo[]>(`${GITHUB_API}/users/${user}/repos?per_page=100&sort=pushed`, token)
    ]);

    const github = mapGitHubInfo(profile, repos);
    // O indice usa o payload cru (e nao o `github.repos`, que so tem `pushedAt`
    // em YYYY-MM): o `updatedAt` do projeto precisa do dia, nao so do mes.
    const byKey = new Map(
        repos.filter((repo) => !repo.fork && !repo.archived).map((repo) => [repoKey(repo.html_url) as string, repo])
    );
    console.log(`${github.repoCount} repositorio(s) proprio(s) de ${profile.login}.`);

    await writeContentFile("github.json", github);

    // Atualiza os projetos que apontam para repos do usuario.
    const projects = await readContentFile<Project[]>("projects.json", []);
    let updated = 0;

    const merged = projects.map((project) => {
        const key = repoKey(project.repo);
        const repo = key ? byKey.get(key) : undefined;
        if (!repo) {
            return project;
        }

        updated += 1;
        return {
            ...project,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            language: repo.language ?? project.language,
            updatedAt: toDate(repo.pushed_at) ?? project.updatedAt
        };
    });

    await writeContentFile("projects.json", merged);

    console.log(
        `gravado webapp/content/github.json: ${github.repoCount} repositorio(s), perfil ${github.profileUrl}`
    );
    console.log(`projetos atualizados: ${updated}/${projects.length}`);
    if (projects.length - updated > 0) {
        console.log("  (os demais nao apontam para repos do usuario - nada a fazer)");
    }
}

void run("sync:github", main);