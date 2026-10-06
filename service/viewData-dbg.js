sap.ui.define(["./Localizer", "./liveSources"], function (___Localizer, ___liveSources) {
  "use strict";

  const localizeText = ___Localizer["localizeText"];
  const isSapCertified = ___liveSources["isSapCertified"];
  const orderCertificates = ___liveSources["orderCertificates"];
  /**
   * Separa soft skills das demais.
   *
   * Hoje o dado que distingue uma soft skill e a `category` ("Soft Skills"), e
   * nao um campo dedicado: `skills.json` agrupa por categoria desde o inicio e a
   * aba Skills usa esse agrupamento como titulo de card. A comparacao ignora
   * maiusculas e acentos para que "Soft Skills", "soft skills" e "Soft skills"
   * caiam no mesmo grupo.
   */
  function isSoftSkill(skill) {
    // `category` pode ser `{ pt, en }`: o nome do grupo e o mesmo nos dois
    // idiomas, mas o objeto nao tem `.normalize`. Comparar o texto ja traduzido
    // cobre os dois casos, porque `viewData` so recebe conteudo localizado.
    const category = localizeText(skill.category, "en");
    return category.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().startsWith("soft skill");
  }

  /** Competencias agrupadas por categoria (usado na aba Skills). */

  /** Projetos agrupados por tag (usado nos filtros). */

  /** Certificacoes agrupadas por ano de emissao. */

  /**
   * Derivacoes usadas pelas telas.
   *
   * Todas ficam em um unico lugar para que a home, a aba de experiencia, o
   * curriculo e o gerador de PDF contem a mesma informacao - sempre coerente.
   */

  /** Agrupa preservando a ordem em que as categorias aparecem no JSON. */
  function groupSkillsByCategory(skills) {
    const groups = new Map();
    skills.forEach(skill => {
      // O nome da categoria pode ser `{ pt, en }`; o agrupamento happens sobre
      // o texto ja traduzido, senao "Banco de dados" e "Databases" virariam
      // dois cards diferentes no modo ingles.
      const category = localizeText(skill.category, "en");
      const current = groups.get(category) ?? [];
      current.push(skill);
      groups.set(category, current);
    });
    return [...groups.entries()].map(([category, items]) => ({
      category,
      icon: items[0]?.icon,
      count: items.length,
      items
    }));
  }

  /** Lista de tags com a contagem de itens, para montar os filtros. */
  function countTags(items) {
    const counter = new Map();
    items.forEach(item => {
      (item.tags ?? []).forEach(tag => counter.set(tag, (counter.get(tag) ?? 0) + 1));
    });
    return [...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag, count]) => ({
      tag,
      count
    }));
  }

  /** Anos com certificacoes, do mais recente para o mais antigo. */
  function countCertificateYears(certificates) {
    const counter = new Map();
    certificates.forEach(certificate => {
      const year = (certificate.issuedAt ?? "").slice(0, 4);
      if (year) {
        counter.set(year, (counter.get(year) ?? 0) + 1);
      }
    });
    return [...counter.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([year, count]) => ({
      year,
      count
    }));
  }

  /**
   * Repositorios do GitHub, do push mais recente para o mais antigo.
   *
   * O `pushedAt` do sync e "YYYY-MM", que ordena igual a data ISO em ordem
   * alfabetica; o nome desempate para a lista nao mudar de posicao entre um
   * build e outro quando varios repositorios foram empurrados no mesmo mes.
   */
  function mostRecentRepos(repos, limit) {
    return [...repos].sort((a, b) => (b.pushedAt ?? "").localeCompare(a.pushedAt ?? "") || a.name.localeCompare(b.name)).slice(0, limit);
  }

  /**
   * Projetos mais recentes por data de fim.
   *
   * Prioriza `endDate` (desc), depois `startDate` (desc) e por fim o nome, para
   * ter uma ordem deterministica.
   */
  function mostRecentProjects(projects, limit) {
    return [...projects].sort((a, b) => {
      const endA = a.period?.to ?? "";
      const endB = b.period?.to ?? "";
      const end = endB.localeCompare(endA);
      if (end !== 0) {
        return end;
      }
      const startA = a.period?.from ?? "";
      const startB = b.period?.from ?? "";
      const start = startB.localeCompare(startA);
      if (start !== 0) {
        return start;
      }

      // O conteudo ja chega traduzido; `name` e texto aqui.
      return String(a.name).localeCompare(String(b.name));
    }).slice(0, limit);
  }

  /** Monta o pacote completo de dados derivados para as views. */
  function buildViewData(service) {
    const content = service.content;
    const links = content.profile.links ?? [];
    const skillsByCategory = groupSkillsByCategory(content.skills);
    const skillCategories = skillsByCategory.map(group => ({
      tag: group.category,
      count: group.count
    }));
    const projectTags = countTags(content.projects);
    const certificateYears = countCertificateYears(content.certificates);
    return {
      metrics: service.metrics,
      navSections: service.navSections,
      navLinks: links.filter(link => link.primary),
      footerLinks: links,
      issues: service.issues.map(issue => ({
        path: issue.path,
        message: issue.message
      })),
      focusSkills: service.focusSkills.slice(0, 8),
      recentExperiences: content.experiences.filter(item => item.kind !== "project").slice(0, 3),
      featuredProjects: service.featuredProjects.slice(0, 6),
      recentProjects: mostRecentProjects(content.projects, 3),
      recentRepos: mostRecentRepos(content.github?.repos ?? [], 3),
      recentCertificates: service.featuredCertificates.slice(0, 6),
      softSkills: content.skills.filter(isSoftSkill),
      hardSkills: content.skills.filter(skill => !isSoftSkill(skill)),
      cvCertificates: orderCertificates(content.certificates.filter(item => isSapCertified(item.title))),
      cvSkillGroups: groupSkillsByCategory(content.skills.filter(skill => !isSoftSkill(skill))).map(group => ({
        ...group,
        items: [...group.items].sort((a, b) => b.level - a.level)
      })),
      cvLinks: links.filter(link => !link.url.startsWith("mailto:")),
      skillsByCategory,
      skillCategories,
      projectTags,
      certificateYears,
      skillCategoryCount: skillCategories.length,
      projectTagCount: projectTags.length,
      certificateYearCount: certificateYears.length
    };
  }
  var __exports = {
    __esModule: true
  };
  __exports.isSoftSkill = isSoftSkill;
  __exports.groupSkillsByCategory = groupSkillsByCategory;
  __exports.countTags = countTags;
  __exports.countCertificateYears = countCertificateYears;
  __exports.mostRecentRepos = mostRecentRepos;
  __exports.mostRecentProjects = mostRecentProjects;
  __exports.buildViewData = buildViewData;
  return __exports;
});
//# sourceMappingURL=viewData-dbg.js.map
