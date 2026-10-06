import BaseController from "./BaseController";

/** Pagina 404. */
export default class NotFoundController extends BaseController {
    public onHomePress(): void {
        this.navigate("home");
    }

    public onContactPress(): void {
        this.onEmailPress();
    }
}
