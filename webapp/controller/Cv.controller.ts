import BaseController from "./BaseController";

/**
 * Controller da pagina de curriculo.
 *
 * O PDF e gerado por `npm run cv:pdf` a partir do mesmo JSON - esta tela mostra
 * a mesma informacao em A4. O download e a impressao sao acoes da pagina, e
 * ficam na barra de secao (App.view.xml); por isso os handlers vem do
 * BaseController, compartilhado com o App.
 */
export default class CvController extends BaseController {}
