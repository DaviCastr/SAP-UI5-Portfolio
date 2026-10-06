import BaseController from "./BaseController";

/** Formacao. "Ver documento" (diploma em PDF) abre o `url` do item. */
export default class EducationController extends BaseController {
    public onDocumentPress(event: sap.ui.base.Event): void {
        this.onLinkPress(event);
    }
}
