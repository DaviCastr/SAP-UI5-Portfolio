import type { GitHubInfo, Project } from "../../webapp/service/types";
import { readContentFile, readFlag, run, writeContentFile } from "../shared/nodeContent";

/**
 * Sincroniza os dados publicos do GitHub.
 *
 * Uso:
 *   npm run sync:github
 *   npm run sync:github -- --user=DaviCastr --token=$GITHUB_TOKEN
 *
 * Faz duas coisas:
 *   1. grava webapp/content/github.json (perfil, ultima sincronizacao, repos);
 *   2. atualiza estrelas/forks/linguagem dos itens de webapp/content/projects.json
 *      cujo campo "repo" aponte para um repositorio do usuario.
 *
 * Sem token usa 60 requisicoes/hora da API publica - suficiente para uso local.
 */

/** Campos do usuario do GitHub usados aqui. */
interface GhUser {
    login: string;
    name?: string;
    html_url: string;
    blog?: string;
    location?: string;
    bio?: string;
    avatar_url?: string;
    public_repos?: number;
    followers?: number;
}

/** Campos do repositorio do GitHub usados aqui. */
interface GhRepo {
    name: string;
    html_url: string;
    fork: boolean;
    archived: boolean;
    stargazers_count: number;
    forks_count: number;
    language?: string;
    pushed_at?: string;
    description?: string;
    homepage?: string;
    topics?: string[];
}

const API = "https://api.github.com";

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

/** Extrai "DaviCastr/repo" de qualquer forma de URL do GitHub. */
function repoKey(url: string | undefined): string | undefined {
    const match = /github\.com\/([^/]+)\/([^/?#]+)/i.exec(url ?? "");
    return match ? `${match[1]}/${match[2].replace(/\.git$/, "")}` : undefined;
}

/** Formata a data do GitHub (ISO completo) como YYYY-MM-DD. */
function toDate(iso: string | undefined): string | undefined {
    return iso ? iso.slice(0, 10) : undefined;
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
        getJson<GhUser>(`${API}/users/${user}`, token),
        getJson<GhRepo[]>(`${API}/users/${user}/repos?per_page=100&sort=pushed`, token)
    ]);

    const ownRepos = repos.filter((repo) => !repo.fork && !repo.archived);
    const byKey = new Map(ownRepos.map((repo) => [repoKey(repo.html_url) as string, repo]));
    console.log(`${ownRepos.length} repositorio(s) proprio(s) de ${profile.login}.`);

    const github: GitHubInfo = {
        login: profile.login,
        profileUrl: profile.html_url,
        syncedAt: new Date().toISOString(),
        repoCount: ownRepos.length
    };
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

    console.log("gravado webapp/content/github.json:", github);
    console.log(`projetos atualizados: ${updated}/${projects.length}`);
    if (projects.length - updated > 0) {
        console.log("  (os demais nao apontam para repos do usuario - nada a fazer)");
    }
}

void run("sync:github", main);
