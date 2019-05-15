import * as Hapi from "hapi";
import { injectable } from "inversify";
import { Logger } from "../engine/components/Logger";
import { OnDestroy } from "../engine/interfaces/EngineLifeCycleEvents";
import { environment } from "../environments/environment";
import { ApplicationServerOptions } from "./configuration/ApplicationServerOptions";
import { ErrorConfiguration } from "./configuration/ErrorConfiguration";
import { PluginConfiguration } from "./configuration/PluginConfiguration";
import { RouteLoader } from "./configuration/RouteLoader";

@injectable()
export class Server implements OnDestroy {

    public httpServer: Hapi.Server;

    constructor(
        private logger: Logger,
        private routeLoader: RouteLoader
    ) {
        ErrorConfiguration();
    }

    public async init(): Promise<void> {
        this.logger.info("=======[SERVER START]=======");
        this.logger.info(`Initializing BicycleChain server on ${environment.host}:${environment.port}`);

        this.httpServer = new Hapi.Server(this.getServerOptions());

        await this.httpServer.register(this.getPluginConfiguration());

        const routes: Hapi.ServerRoute[][] = this.routeLoader.loadModules();

        this.httpServer.route([].concat.apply([], routes));
        this.start();
    }

    private getServerOptions(): Hapi.ServerOptions {
        return new ApplicationServerOptions().getOptions(this.logger);
    }

    private getPluginConfiguration(): { plugin: any; options?: any }[] {
        return new PluginConfiguration().getConfiguration();
    }

    private start(): void {
        (async (server: Server): Promise<void> => {
            try {
                await server.httpServer.start();
            } catch (e) {
                console.error(e);
                process.exit(1);
            }
        })(this);
        this.logger.info(`BicycleChain is listening on ${this.httpServer.info.uri}`);
    }

    public async onDestroy(): Promise<void> {
        this.logger.warn(`BicycleChain server is stopping`);
        return this.httpServer.stop({ timeout: 10000 });
    }

}
