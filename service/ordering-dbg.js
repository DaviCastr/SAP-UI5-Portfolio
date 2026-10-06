sap.ui.define([], function () {
  "use strict";

  /**
   * Regras de ordenacao de listas que mais de um consumidor precisa conhecer.
   *
   * Vive fora de `viewData.ts` de proposito: alem das telas, o gerador do PDF
   * (`tools/cv/generate-pdf.ts`) le os JSONs direto e tem de aplicar a mesma
   * ordem - um modulo neutro evita que o PDF e a tela discordem.
   */

  /**
   * Formacao, da mais recente para a mais antiga.
   *
   * O criterio e a data de **fim** (`period.to`), e nao a de inicio: e o que se le
   * em primeiro lugar numa linha do tempo ("Bacharelado 2019-2022" antes de
   * "Tecnico 2016-2018"). Registro sem `to` - curso em andamento - e tratado como
   * o mais recente possivel.
   *
   * O `id` desempata para a lista nao mudar de posicao entre dois carregamentos
   * quando varios registros terminam no mesmo mes.
   */
  function sortEducationByRecency(education) {
    const end = item => item.period?.to ?? "";
    const start = item => item.period?.from ?? "";
    const hasEnd = item => end(item) !== "";
    return [...education].sort((a, b) => {
      // Registro em andamento (sem `to`) antes dos que ja terminaram.
      if (hasEnd(a) !== hasEnd(b)) {
        return hasEnd(a) ? 1 : -1;
      }
      return end(b).localeCompare(end(a)) || start(b).localeCompare(start(a)) || a.id.localeCompare(b.id);
    });
  }
  var __exports = {
    __esModule: true
  };
  __exports.sortEducationByRecency = sortEducationByRecency;
  return __exports;
});
//# sourceMappingURL=ordering-dbg.js.map
