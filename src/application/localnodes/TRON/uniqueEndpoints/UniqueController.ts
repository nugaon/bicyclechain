import { TronController } from "../TronController";

export class UniqueController {
    private controller: TronController;

    constructor(controller: TronController) {
        this.controller = controller;
    }

    public async createTRC10Token(req: any) {
        return this.controller.createTRC10Token(req);
    }

    public async freezeBalance(req: any) {
        return this.controller.freezeBalance(req);
    }
}
