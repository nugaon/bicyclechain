import { Container, interfaces } from "inversify";
import { ICryptoCurrency, ITokenInitResponse } from "./application/cryptoCurrencies/ICryptoCurrency"
import { Logger } from "./engine/components/Logger";
import { LocalNodeControllerRegistry } from "./engine/configuration/LocalNodeControllerRegistry";
import { LocalNodeMapping } from "./engine/interfaces/AppConfiguration";
import { environment } from "./environments/environment";
import { ShutDownEventHandler } from "./engine/lifecycle/ShutDownEventHandler";
import { ShutDownEventInterceptor } from "./engine/lifecycle/ShutDownEventInterceptor";
import { ComponentLoader } from "./engine/loaders/ComponentLoader";
import { Server } from "./server/Server";
import { AsyncForeach } from "./application/generic/AsyncForeach"

import { RippleService } from "./application/localnodes/Ripple/RippleService";

export class Engine {

    private container: Container;

    private usableLocalNodeMapping: string[]; //contains route -> service mappings

    private usableLocalNodeControllers: ICryptoCurrency[]; //contains the initialized objects of local node's API services

    public async bootstrapApplication(withServer: boolean): Promise<void> {
        console.log("[Engine] Initializing application engine...");
        try {
            this.initContainer({
                defaultScope: "Singleton",
                skipBaseClassChecks: true,
                autoBindInjectable: true
            });
            this.initAppContextBinding();
            await this.initUsableLocalNodes();
            this.attachGracefulShutdownEvents();
            await this.loadComponents();
            if (withServer) {
                await this.startServer();
            }
        } catch (e) {
            console.error("[Engine] Error while initializing application engine. Application is shutting down.");
            console.error(e);
            process.exit(1);
        }
    }

    private initContainer(config: interfaces.ContainerOptions): void {
        this.container = new Container(config);
        this.container.applyMiddleware(ShutDownEventInterceptor);
    }

    private initAppContextBinding(): void {
        this.container.bind<Container>("ctx").toConstantValue(this.container);
    }

    private async initUsableLocalNodes(): Promise<void> {
        this.usableLocalNodeMapping = [];
        this.usableLocalNodeControllers = [];
        const LocalNodeControllerClasses = LocalNodeControllerRegistry.getElements();
        await AsyncForeach(environment.localnodes, async (localnode: LocalNodeMapping): Promise<void> => {
            this.usableLocalNodeMapping[localnode.route] = localnode.class;
            const localNodeControllerInstance =  new LocalNodeControllerClasses[localnode.class];
            this.usableLocalNodeControllers[localnode.class] = localNodeControllerInstance;
            await localNodeControllerInstance.onInit();
            if(localNodeControllerInstance.initTokens !== undefined) { //ITokenTransporter interface check
                const localNodeTokens: ITokenInitResponse = await localNodeControllerInstance.initTokens();
                localNodeTokens.routeMapping.forEach((tokenRoute) => {
                    const tokenInstance = localNodeTokens.instances[tokenRoute.referenceId];
                    this.usableLocalNodeMapping[tokenRoute.route] = tokenRoute.referenceId;
                    this.usableLocalNodeControllers[tokenRoute.referenceId] = tokenInstance;
                });
            }
        });

        this.container.bind<ICryptoCurrency[]>("cryptoCurrencies").toConstantValue(this.usableLocalNodeControllers);
        this.container.bind<string[]>("cryptoCurrenciesRouteMapping").toConstantValue(this.usableLocalNodeMapping);
        console.log(`The app will use the following routes for the local node APIs: ${Object.values(this.usableLocalNodeMapping)}`);
    }

    private attachGracefulShutdownEvents(): void {
        ShutDownEventHandler.getInstance()
            .attachShutdownEvent(this.container.get(Logger));
    }

    private async loadComponents(): Promise<void> {
        await new ComponentLoader(this.container).loadComponents();
    }

    private async startServer(): Promise<void> {
        await this.container.get<Server>(Server).init();
    }

    public getContainer(): Container {
        return this.container;
    }

}
