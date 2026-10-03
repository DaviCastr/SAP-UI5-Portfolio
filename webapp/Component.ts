import UIComponent from "sap/ui/core/UIComponent";
import type JSONModel from "sap/ui/model/json/JSONModel";
import models from "./model/models";
import { LocaleService } from "./service/LocaleService";
import { ThemeService } from "./service/ThemeService";

/**
 * Componente raiz do portfolio.
 *
 * Responsabilidades (mantidas propositalmente poucas):
 *   1. criar os models (device, ui, content);
 *   2. aplicar o tema salvo.
 *
 * O router NAO e inicializado aqui: ele so pode comecar depois que a view raiz
 * (e portanto o NavContainer) existir de fato. Quem faz isso e o App.controller,
 * no primeiro onAfterRendering. O carregamento do conteudo JSON tambem fica no
 * App.controller, porque precisa ser assincrono.
 */
export default class Component extends UIComponent {
    public override init(): void {
        super.init();

        this.setModel(models.createDeviceModel(), "device");
        this.setModel(models.createUiStateModel(), "ui");
        this.setModel(models.createContentModel(), "content");

        const uiModel = this.getModel("ui") as JSONModel;
        const locale = LocaleService.getActive();
        const theme = ThemeService.getMode();

        uiModel.setProperty("/locale", locale);
        uiModel.setProperty("/theme", theme);
        ThemeService.apply(theme);
    }
}
