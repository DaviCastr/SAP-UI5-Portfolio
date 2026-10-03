import JSONModel from "sap/ui/model/json/JSONModel";
import Device from "sap/ui/Device";

/**
 * Models do componente.
 *
 * - device : device/sistema (isPhone, isTablet, system language...)
 * - ui     : estado da interface (tema ativo, idioma, carregando, filtros)
 * - content: documento do portfolio (perfil, experiencias, skills...)
 */
export default {
    /** Model padrao de device (usado por bindings responsivos). */
    createDeviceModel(): JSONModel {
        // No UI5 1.153 o modulo "sap/ui/Device" devolve o namespace estatico
        // sap.ui.Device (system/support/media) e NAO um sap.ui.model.Model --
        //entao ele nao pode ser registrado via setModel. O app expoe um retrato
        // simples em JSON, suficiente para bindings device>/system/... .
        return new JSONModel({
            system: { ...Device.system },
            support: { ...Device.support }
        });
    },

    /** Estado global da interface. */
    createUiStateModel(): JSONModel {
        return new JSONModel({
            busy: true,
            theme: "light",
            locale: "pt"
        });
    },

    /** Documento do portfolio (preenchido pelo ContentService). */
    createContentModel(): JSONModel {
        return new JSONModel({
            profile: {},
            experiences: [],
            skills: [],
            projects: [],
            certificates: [],
            education: [],
            sections: [],
            issues: []
        });
    }
};
