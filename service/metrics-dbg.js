sap.ui.define([], function () {
  "use strict";

  /** Numeros exibidos nas telas, sempre calculados a partir do JSON. */

  /** Tags que indicam que um projeto usa o ecossistema SAP. */
  const SAP_TAGS = ["sap", "fiori", "abap", "ui5", "bpm", "hana", "btp", "successfactors", "sac", "ariba"];

  /** Converte "YYYY-MM" em um inteiro monotonico (meses desde o ano 0). */
  function toIndex(period) {
    const match = /^(\d{4})-(\d{2})$/.exec(period ?? "");
    return match ? Number(match[1]) * 12 + Number(match[2]) : 0;
  }

  /** Ultimo mes considerando que um vinculo sem data final esta ativo. */
  function currentMonth(now) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  /**
   * Meses entre dois periodos, contando o mes final.
   *
   * De 2020-01 ate 2020-12 sao 12 meses (o mes do fim entra na conta), por isso o
   * `+ 1` - sem ele, um ano inteiro de trabalho seria contado como 11 meses.
   */
  function monthsBetween(from, to, now = new Date()) {
    const start = toIndex(from);
    const end = toIndex(to || currentMonth(now)) + 1;
    return Math.max(0, end - start);
  }

  /**
   * Soma os meses de todas as experiencias sem contar duas vezes o mesmo mes.
   *
   * Ex.: Um projeto de 6 meses dentro da mesma empresa nao vira 6 meses a mais -
   * os intervalos sao unidos antes de somar.
   */
  function totalMonthsOfExperience(content, now = new Date()) {
    const ranges = content.experiences.filter(item => item?.period?.from).map(item => {
      const start = toIndex(item.period.from);
      const end = toIndex(item.period.to || currentMonth(now)) + 1;
      return {
        start: Math.min(start, end),
        end: Math.max(start, end)
      };
    }).filter(range => range.end > range.start).sort((a, b) => a.start - b.start);
    let total = 0;
    let cursorStart = null;
    let cursorEnd = 0;
    ranges.forEach(range => {
      if (cursorStart === null) {
        cursorStart = range.start;
        cursorEnd = range.end;
        return;
      }

      // Continua o intervalo atual.
      if (range.start <= cursorEnd) {
        cursorEnd = Math.max(cursorEnd, range.end);
        return;
      }

      // Ha um intervalo em branco entre os dois: fecha e abre outro.
      total += cursorEnd - cursorStart;
      cursorStart = range.start;
      cursorEnd = range.end;
    });
    if (cursorStart !== null) {
      total += cursorEnd - cursorStart;
    }
    return total;
  }

  /** Tecnologias mais citadas entre experiencias, projetos e skills. */
  function topStacks(content, limit) {
    const counter = new Map();
    const add = values => {
      (values ?? []).forEach(value => {
        if (value) {
          counter.set(value, (counter.get(value) ?? 0) + 1);
        }
      });
    };
    content.experiences.forEach(item => {
      add(item.stack);
      add(item.modules);
    });
    content.projects.forEach(item => add(item.stack));
    return [...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([name]) => name);
  }

  /** Total de tecnologias distintas citadas em qualquer lugar do portfolio. */
  function countStacks(content) {
    const all = new Set();
    content.experiences.forEach(item => {
      (item.stack ?? []).forEach(tech => all.add(tech));
      (item.modules ?? []).forEach(module => all.add(module));
    });
    content.projects.forEach(item => (item.stack ?? []).forEach(tech => all.add(tech)));
    content.skills.forEach(item => (item.tags ?? []).forEach(tag => all.add(tag)));
    return all.size;
  }

  /** Deriva as metricas de exibicao a partir do conteudo carregado. */
  function computeMetrics(content, now = new Date()) {
    const monthsOfExperience = totalMonthsOfExperience(content, now);
    const expiresAt = value => value ? new Date(`${value}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
    const isSapProject = project => (project.tags ?? []).some(tag => SAP_TAGS.includes(tag.toLowerCase()));
    const stacks = topStacks(content, 12);
    return {
      monthsOfExperience,
      yearsOfExperience: Math.floor(monthsOfExperience / 12),
      companies: new Set(content.experiences.map(item => item.company).filter(Boolean)).size,
      projectCount: content.projects.length,
      featuredProjects: content.projects.filter(item => item.featured).length,
      sapProjects: content.projects.filter(isSapProject).length,
      githubStars: content.projects.reduce((sum, item) => sum + (item.stars ?? 0), 0),
      certificateCount: content.certificates.length,
      validCertificates: content.certificates.filter(item => expiresAt(item.expiresAt) >= now.getTime()).length,
      certificateSources: new Set(content.certificates.map(item => item.issuer).filter(Boolean)).size,
      skillCount: content.skills.length,
      advancedSkills: content.skills.filter(item => (item.level ?? 0) >= 4).length,
      moduleCount: new Set(content.experiences.flatMap(item => item.modules ?? []).filter(Boolean)).size,
      stacks,
      stacksItems: stacks.map(label => ({
        label
      })),
      stackCount: countStacks(content)
    };
  }
  var __exports = {
    __esModule: true
  };
  __exports.monthsBetween = monthsBetween;
  __exports.totalMonthsOfExperience = totalMonthsOfExperience;
  __exports.topStacks = topStacks;
  __exports.countStacks = countStacks;
  __exports.computeMetrics = computeMetrics;
  return __exports;
});
//# sourceMappingURL=metrics-dbg.js.map
