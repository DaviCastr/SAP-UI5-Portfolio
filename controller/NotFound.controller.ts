import BaseController from "./BaseController";

/** Controller da rota de fallback ("catchAll"). */
export default class NotFoundController extends BaseController {
    /** Volta para a home. */
    public onHomePress(): void {
        this.navigate("home");
    }

    /** Abre o cliente de e-mail com o endereco do portfolio. */
    public onContactPress(): void {
        window.location.href = `mailto:${this.content().profile.email}`;
    }
}
