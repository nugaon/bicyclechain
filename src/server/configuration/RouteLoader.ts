import { ServerRoute } from "hapi";
import { Container, inject, injectable } from "inversify";
import { Routes } from "../../application/generic/Routes";
import { RouteRegistry } from "./RouteRegistry";

@injectable()
export class RouteLoader {

    constructor(
        @inject("ctx") private ctx: Container
    ) { }

    public loadModules(): ServerRoute[][] {
        return RouteRegistry.getRoutes()
            .map((r: Routes) => (this.ctx.get(<any>r)))
            .map((r: Routes) => r.routes);

    }

}
