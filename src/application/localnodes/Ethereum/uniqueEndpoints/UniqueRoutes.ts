import { ServerRoute } from "hapi";
import { Routes } from "../../../generic/Routes";
import { UniqueController } from "./UniqueController";
import { UniqueValidator } from "./UniqueValidator";

export class UniqueRoutes implements Routes {

    private controller: UniqueController;
    private validator: UniqueValidator;

    constructor(localNodeController: any) {
        this.controller = new UniqueController(localNodeController);
        this.validator = new UniqueValidator();

        // console.log("HE!!!!!!!!!!!!!!!!!!!!!")
        this.initRoutes();
    }

    private initRoutes() {
        this.routes.push({
            method: "POST",
            path: "/api/v1/ethereum/callContractMethod",
            options: {
                description: "Call method of any given contract",
                tags: ["api", "v1", "ethereum"],
                validate: this.validator.callContractMethod(),
                handler: async (request: any) => {
                    return this.controller.callContractMethod(request);
                }
            }
        },{
            method: "POST",
            path: "/api/v1/ethereum/deployContract",
            options: {
                description: "Deploy contract to the Ethereum network",
                tags: ["api", "v1", "ethereum"],
                validate: this.validator.deployContract(),
                handler: async (request: any) => {
                    return this.controller.deployContract(request);
                }
            }
        })
    }

    public readonly routes: ServerRoute[] = [];
}
