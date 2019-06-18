import { EthereumController } from "../EthereumController";

export class UniqueController {
    private controller: EthereumController;

    constructor(controller: EthereumController) {
        this.controller = controller;
    }

    public async callContractMethod(req: any) {
        return this.controller.callContractMethod(req);
    }

    public async deployContract(req: any) {
        return this.controller.deployContract(req);
    }
}
