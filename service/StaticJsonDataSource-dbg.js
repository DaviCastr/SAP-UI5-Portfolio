sap.ui.define([], function () {
  "use strict";

  /** Arquivos que compoem o portfolio. */
  const CONTENT_FILES = {
    profile: "profile.json",
    experiences: "experiences.json",
    skills: "skills.json",
    projects: "projects.json",
    certificates: "certificates.json",
    education: "education.json",
    courses: "courses.json",
    github: "github.json",
    sections: "sections.json"
  };
  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  /**
   * Le os arquivos JSON versionados em webapp/content.
   *
   * Regra de ouro para quem for editar o portfolio:
   *   cada secao da tela tem UM arquivo. Para acrescentar um item, basta
   *   duplicar um objeto do array - nenhuma view precisa ser alterada.
   */
  class StaticJsonDataSource {
    constructor(options) {
      this.baseUrl = options.baseUrl.replace(/\/+$/, "");
      this.fetcher = options.fetcher;
    }
    async load() {
      const keys = Object.keys(CONTENT_FILES);
      const files = await Promise.all(keys.map(async key => {
        const url = `${this.baseUrl}/${CONTENT_FILES[key]}`;
        return [key, await this.fetcher(url)];
      }));
      const data = Object.fromEntries(files);

      // "sections.json" pode ser apenas { "sections": [...] } ou um array direto.
      const sections = Array.isArray(data.sections) ? data.sections : isPlainObject(data.sections) ? data.sections.sections : [];
      return {
        profile: data.profile ?? {},
        experiences: data.experiences ?? [],
        skills: data.skills ?? [],
        projects: data.projects ?? [],
        certificates: data.certificates ?? [],
        education: data.education ?? [],
        courses: data.courses ?? [],
        github: data.github,
        sections: sections ?? [],
        meta: {
          mode: "static",
          updatedAt: new Date().toISOString().slice(0, 10)
        }
      };
    }
  }

  /**
   * Fonte remota: le um unico JSON de qualquer URL.
   *
   * Preparado para o futuro - se um dia houver um backend (CAP/OData), basta
   * apontar `remoteUrl` e implementar o mapeamento aqui, sem tocar nas views.
   */
  class RemoteJsonDataSource {
    constructor(url, fetcher) {
      this.url = url;
      this.fetcher = fetcher;
    }
    async load() {
      const payload = await this.fetcher(this.url);
      return {
        profile: payload.profile ?? {},
        experiences: payload.experiences ?? [],
        skills: payload.skills ?? [],
        projects: payload.projects ?? [],
        certificates: payload.certificates ?? [],
        education: payload.education ?? [],
        courses: payload.courses ?? [],
        github: payload.github,
        sections: payload.sections ?? [],
        meta: {
          mode: "remote",
          remoteUrl: this.url
        }
      };
    }
  }

  /** Escolhe a fonte de dados conforme o arquivo content/source.json. */
  function createDataSource(source, options) {
    if (source.mode === "remote" && source.remoteUrl) {
      return new RemoteJsonDataSource(source.remoteUrl, options.fetcher);
    }
    return new StaticJsonDataSource(options);
  }

  /** Fetcher padrao do navegador (usado pelo app em runtime). */
  const browserFetcher = async url => {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Falha ao carregar ${url} (HTTP ${response.status})`);
    }
    return response.json();
  };

  /** Conteudo de webapp/content/source.json: onde os dados sao lidos. */

  /**
   * Le o arquivo de configuracao da fonte de dados.
   *
   * Trocar a origem do portfolio (um dia: CAP/OData) e so alterar este arquivo -
   * nenhuma view nem controller precisa mudar.
   */
  async function loadSourceConfig(baseUrl, fetcher = browserFetcher) {
    try {
      const config = await fetcher(`${baseUrl.replace(/\/+$/, "")}/source.json`);
      return config ?? {};
    } catch {
      return {
        mode: "static"
      };
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.CONTENT_FILES = CONTENT_FILES;
  __exports.StaticJsonDataSource = StaticJsonDataSource;
  __exports.RemoteJsonDataSource = RemoteJsonDataSource;
  __exports.createDataSource = createDataSource;
  __exports.browserFetcher = browserFetcher;
  __exports.loadSourceConfig = loadSourceConfig;
  return __exports;
});
//# sourceMappingURL=StaticJsonDataSource-dbg.js.map
