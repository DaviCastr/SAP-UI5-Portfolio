sap.ui.define([], function () {
  "use strict";

  /**
   * Conversao dos payloads externos (Credly e GitHub) para os tipos do portfolio.
   *
   * Este modulo e o **unico** lugar onde os formatos externos (Credly e GitHub)
   * viram tipos do portfolio. Ele roda tanto no build (`tools/credly/scrape.ts`,
   * `tools/github/sync.ts`, `tools/cv/generate-pdf.ts`) quanto no browser
   * (`service/liveData.ts`). Nao pode usar API do Node (fs, process) nem do DOM:
   * sao funcoes puras.
   *
   * A razao de extrair isso dos scripts e evitar que o portfolio mostre uma coisa
   * no dia a dia e outra no PDF: as duas pontas usam as mesmas regras.
   */

  // ==========================================================================
  // Credly
  // ==========================================================================

  /** Endereco publico de badges de um usuario do Credly. */
  const CREDLY_BADGES_URL = "https://www.credly.com/users/";

  /** Campos usados do payload do Credly (Badgr). */

  /** Emissor mais legivel: prefere o nome da organizacao ao texto "issued by X". */
  function readIssuer(badge) {
    const organization = badge.issuer?.entities?.find(item => item.entity?.name)?.entity?.name;
    const summary = badge.issuer?.summary ?? "";
    const cleaned = summary.replace(/^issued by\s+/i, "").trim();
    return organization ?? (cleaned || "Credly");
  }

  /** "SAP Certified - ..." vira categoria "Certification". */
  function readCategory(title) {
    if (/record of achievement/i.test(title)) {
      return "Achievement";
    }
    if (/certified|certification/i.test(title)) {
      return "Certification";
    }
    return "Course";
  }

  /**
   * URL publica da credencial no Credly.
   *
   * Preferimos o **UUID da badge** (`/badges/{id}`): e a unica URL que abre a
   * credencial *no nome de quem recebeu* - as demais (`/badges/{vanity_slug}` ou
   * `/org/{org}/badge/{slug}`) caem na pagina generica do curso, sem o titulo nem
   * o nome do titular.
   *
   * O `vanity_slug` nao serve como fallback confiavel: o Credly trunca o valor em
   * 50 caracteres, o que gerava URLs quebradas (`...-record-of-achievem`). O id
   * sempre existe, por isso e a unica fonte usada aqui.
   */
  function readBadgeUrl(badge) {
    if (badge.id) {
      return `https://www.credly.com/badges/${badge.id}`;
    }
    const templateUrl = badge.badge_template?.url;
    if (templateUrl && /^https:\/\/www\.credly\.com\/org\//.test(templateUrl)) {
      return templateUrl.replace(/\/org\/[^/]+\/badge\//, "/badges/");
    }
    return templateUrl;
  }

  /**
   * Uma "SAP Certified" e o que o recrutador procura primeiro no portfolio.
   *
   * O separador entre "SAP" e "Certified" e tolerado (` `, `-`, `_` ou nada):
   * a marca e a mesma, e um titulo variante nao pode fazer a credencial perder
   * o destaque so por causa de um hifen.
   */
  function isSapCertified(title) {
    return /SAP[-_\s]*Certified/i.test(title ?? "");
  }

  /**
   * Converte o payload do Credly na lista de certificacoes do portfolio.
   *
   * `previous` (o que ja esta no `certificates.json`) e usado para preservar o
   * que so existe localmente: imagem baixada, destaque manual e a posicao dos
   * itens cadastrados a mao (`source = "manual"`, que nunca vem do Credly).
   *
   * O resultado sai ordenado da mais recente para a mais antiga, com as "SAP
   * Certified" na frente - ver `orderCertificates`.
   */
  function mapCredlyBadges(payload, previous = []) {
    const data = payload?.data ?? [];
    const before = new Map(previous.map(item => [item.id, item]));
    const synced = [];
    for (const badge of data) {
      const title = badge.badge_template?.name;
      if (!badge.id || !title) {
        // Badge sem id ou sem nome nao tem como virar entrada estavel.
        continue;
      }
      const previousBadge = before.get(badge.id);
      synced.push({
        id: badge.id,
        title,
        issuer: readIssuer(badge),
        issuedAt: badge.issued_at_date ?? "",
        expiresAt: badge.expires_at_date || null,
        url: readBadgeUrl(badge),
        image: previousBadge?.image ?? badge.badge_template?.image_url,
        source: "credly",
        category: readCategory(title),
        featured: previousBadge?.featured ?? /certified/i.test(title)
      });
    }
    return orderCertificates([...previous.filter(item => item.source !== "credly"), ...synced]);
  }

  /**
   * Ordem de exibicao das certificacoes.
   *
   * 1. "SAP Certified" primeiro - e o que pesa em uma triagem;
   * 2. demais certificacoes da mais recente para a mais antiga;
   * 3. items sem data (RoA, por exemplo) no fim, para nao competirem com o resto;
   * 4. nome como desempate, para a lista nao pular de lugar entre dois carregamentos.
   */
  function orderCertificates(certificates) {
    const sap = item => isSapCertified(item.title) ? 0 : 1;
    const date = item => item.issuedAt ?? "";
    return [...certificates].sort((a, b) => sap(a) - sap(b) || (
    // Sem data vai para o fim: "" ordenaria antes de tudo.
    date(a) && date(b) ? date(b).localeCompare(date(a)) : date(a) ? -1 : date(b) ? 1 : 0) || a.title.localeCompare(b.title));
  }

  // ==========================================================================
  // GitHub
  // ==========================================================================

  /** Base da API publica do GitHub. */
  const GITHUB_API = "https://api.github.com";

  /** Campos do usuario do GitHub usados aqui. */

  /** Campos do repositorio do GitHub usados aqui. */

  /** Extrai "DaviCastr/repo" de qualquer forma de URL do GitHub. */
  function repoKey(url) {
    const match = /github\.com\/([^/]+)\/([^/?#]+)/i.exec(url ?? "");
    return match ? `${match[1]}/${match[2].replace(/\.git$/, "")}` : undefined;
  }

  /** Texto opcional: string vazia vira undefined para nao inflar o JSON. */
  function optional(value) {
    const text = value?.trim();
    return text ? text : undefined;
  }

  /** Ultimo push no formato YYYY-MM, que e o formato dos cards da aba Projetos. */
  function toMonth(iso) {
    return iso ? iso.slice(0, 7) : undefined;
  }

  /** Data completa do GitHub (ISO) como YYYY-MM-DD. */
  function toDate(iso) {
    return iso ? iso.slice(0, 10) : undefined;
  }

  /**
   * Converte um repositorio da API no formato do portfolio.
   *
   * `homepage` so e aceito com http(s): o GitHub aceita valor livre nesse campo e
   * um "javascript:..." ali viraria um link clicavel no card.
   */
  function toRepo(repo) {
    return {
      name: repo.name,
      url: repo.html_url,
      description: optional(repo.description),
      language: optional(repo.language),
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      topics: repo.topics?.length ? repo.topics : undefined,
      pushedAt: toMonth(repo.pushed_at),
      homepage: /^https?:\/\//i.test(repo.homepage ?? "") ? repo.homepage : undefined
    };
  }

  /**
   * Monta o `github.json` a partir do perfil e da lista de repositorios.
   *
   * Fork e repositorio arquivado ficam de fora: nenhum dos dois e trabalho do
   * portfolio (o primeiro e codigo de outra pessoa, o segundo esta parado).
   */
  function mapGitHubInfo(user, repos, syncedAt) {
    const own = (repos ?? []).filter(repo => !repo.fork && !repo.archived);
    return {
      login: user.login,
      profileUrl: user.html_url,
      syncedAt: syncedAt ?? new Date().toISOString(),
      repoCount: own.length,
      repos: own.map(toRepo)
    };
  }
  var __exports = {
    __esModule: true
  };
  __exports.CREDLY_BADGES_URL = CREDLY_BADGES_URL;
  __exports.readIssuer = readIssuer;
  __exports.readCategory = readCategory;
  __exports.readBadgeUrl = readBadgeUrl;
  __exports.isSapCertified = isSapCertified;
  __exports.mapCredlyBadges = mapCredlyBadges;
  __exports.orderCertificates = orderCertificates;
  __exports.GITHUB_API = GITHUB_API;
  __exports.repoKey = repoKey;
  __exports.optional = optional;
  __exports.toMonth = toMonth;
  __exports.toDate = toDate;
  __exports.toRepo = toRepo;
  __exports.mapGitHubInfo = mapGitHubInfo;
  return __exports;
});
//# sourceMappingURL=liveSources-dbg.js.map
