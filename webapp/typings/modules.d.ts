/**
 * Modulos UI5 usados pelo portfolio, expostos como modulos ES.
 *
 * As definicoes oficiais do OpenUI5 (@openui5/ts-types) declaram os controles
 * no namespace global `sap.*` e nao declaram o caminho de modulo
 * ("sap/ui/core/UIComponent"). Este arquivo cria essa ponte para que o codigo
 * possa usar imports normais:
 *
 *   import Controller from "sap/ui/core/mvc/Controller";
 *
 * Cada declaracao abaixo e uma "casca" do tipo global correspondente: o
 * JavaScript gerado nao muda em nada (o import continua apontando para o mesmo
 * modulo em runtime), apenas o TypeScript passa a enxergar os tipos.
 */

declare module "sap/ui/core/UIComponent" {
    export default class UIComponent extends sap.ui.core.UIComponent {}
}

declare module "sap/ui/core/mvc/Controller" {
    // Em runtime o controller MVC tem getModel/getView (herda de
    // sap/ui/core/Controller), mas as definicoes oficiais param em EventProvider.
    // Aqui completamos a casca com os dois metodos realmente usados pelo app.
    export default class Controller extends sap.ui.core.mvc.Controller {
        // Os models do portfolio ("ui" e "content") sao JSONModel, por isso o
        // retorno e tipado como tal: assim setData/setProperty ficam disponiveis.
        getModel(sModelName?: string): sap.ui.model.json.JSONModel | undefined;
        getView(): sap.ui.core.mvc.View | undefined;
    }
}

declare module "sap/m/SegmentedButton" {
    export default class SegmentedButton extends sap.m.SegmentedButton {}
}

declare module "sap/m/SegmentedButtonItem" {
    export default class SegmentedButtonItem extends sap.m.SegmentedButtonItem {}
}

declare module "sap/ui/model/json/JSONModel" {
    export default class JSONModel extends sap.ui.model.json.JSONModel {}
}

declare module "sap/ui/model/resource/ResourceModel" {
    export default class ResourceModel extends sap.ui.model.resource.ResourceModel {}
}

declare module "sap/ui/Device" {
    // Device e um namespace (sap.ui.core.Device.system.*), nao uma classe.
    const Device: typeof sap.ui.core.Device;
    export default Device;
}

declare module "sap/ui/core/BusyIndicator" {
    // Objeto singleton (show/hide); a definicao global so o declara como interface.
    const BusyIndicator: sap.ui.core.BusyIndicator;
    export default BusyIndicator;
}
