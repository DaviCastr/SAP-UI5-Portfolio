sap.ui.define(["sap/ui/core/Theming"], function (Theming) {
  "use strict";

  /** Modos de tema suportados pela interface. */

  const STORAGE_KEY = "davi-portfolio.theme";
  const THEMES = {
    light: "sap_horizon",
    dark: "sap_horizon_dark"
  };

  /**
   * Controle de tema (claro/escuro).
   *
   * Observacoes de implementacao:
   *  - `sap_horizon_dark` e um tema oficial do UI5: nao existe CSS "caseiro" de
   *    modo escuro, o proprio tema reescreve as variaveis do design system.
   *  - a preferencia e salva em localStorage e lida pelo index.html ANTES do
   *    sap-ui-core carregar, evitando o "flash" de tema claro ao abrir a pagina.
   */
  class ThemeService {
    /** Tema ativo, deduzido da preferencia salva ou do sistema operacional. */
    static getMode() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark") {
          return stored;
        }
      } catch {
        // localStorage indisponivel (modo privado): usa a preferencia do sistema
      }
      try {
        return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      } catch {
        return "light";
      }
    }

    /** Aplica um tema e persiste a preferencia. */
    static apply(mode) {
      Theming.setTheme(THEMES[mode]);

      // Mantem o atributo em <html> em sincronia (usado pelo CSS e pelo indice.html).
      document.documentElement.setAttribute("data-theme", mode);
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Sem persistencia: o tema funciona apenas para a sessao atual
      }
      return mode;
    }

    /** Alterna entre claro e escuro. */
    static toggle(current) {
      return ThemeService.apply(current === "dark" ? "light" : "dark");
    }

    /** Nome do tema UI5 correspondente ao modo. */
    static themeName(mode) {
      return THEMES[mode];
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.ThemeService = ThemeService;
  return __exports;
});
//# sourceMappingURL=ThemeService-dbg.js.map
