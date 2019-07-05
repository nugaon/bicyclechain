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

        this.initRoutes();
    }

    private initRoutes() {
        this.routes.push({
            method: "POST",
            path: "/api/v1/trx/createTRC10Token",
            options: {
                description: "Create a TRC10 Token behalf of an account",
                tags: ["api", "v1", "trx"],
                validate: this.validator.createTRC10Token(),
                handler: async (request: any) => {
                    return this.controller.createTRC10Token(request);
                }
            }
        })

        this.routes.push({
            method: "POST",
            path: "/api/v1/trx/freezeBalance",
            options: {
                description: "Allows users to freeze their TRX balance to grant ENERGY or BANDWIDTH to either themselves or other addresses",
                tags: ["api", "v1", "trx"],
                validate: this.validator.freezeBalance(),
                handler: async (request: any) => {
                    return this.controller.freezeBalance(request);
                }
            }
        })
    }

    public readonly routes: ServerRoute[] = [];
}
