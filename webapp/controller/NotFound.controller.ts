import BaseController from "./BaseController";
import { Route } from "../model/constants";

/** Pagina 404. */
export default class NotFoundController extends BaseController {
    public onHomePress(): void {
        this.navigate(Route.HOME);
    }

    public onContactPress(): void {
        this.onEmailPress();
    }
}
