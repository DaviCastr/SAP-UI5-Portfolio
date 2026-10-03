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
    createDeviceModel(): sap.ui.model.Model {
        return new Device();
    },

    /** Estado global da interface. */
    createUiStateModel(): JSONModel {
        return new JSONModel({
            busy: true,
            theme: "light",
            locale: "pt",
            availableLocales: [
                { id: "pt", label: "Português" },
                { id: "en", label: "English" }
            ]
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
