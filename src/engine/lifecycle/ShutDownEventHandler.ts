import exitHook from "async-exit-hook";
import { Logger } from "../components/Logger";
import { OnDestroy } from "../interfaces/EngineLifeCycleEvents";

export class ShutDownEventHandler {
    private static instance: ShutDownEventHandler;

    public static getInstance(): ShutDownEventHandler {
        return this.instance || (this.instance = new this());
    }

    private destroyableComponents: OnDestroy[];

    private constructor() {
        this.destroyableComponents = [];
    }

    public attachShutdownEvent(logger: Logger): void {
        exitHook((callback: any) => {
            this.shutdownHandler(logger)
                .then(callback);
        });
    }

    private async shutdownHandler(logger: Logger): Promise<void> {
        logger.warn("Shutdown event triggered. Starting graceful shutdown sequence...");
        let element: OnDestroy | undefined = this.destroyableComponents.pop();
        while (element) {
            try {
                logger.debug(`Calling onDestroy event of component '${element.constructor.name}'`);
                await element.onDestroy();
            } catch (e) {
                logger.error(`Error while shutting down component '${element.constructor.name}'`, e);
            }
            element = this.destroyableComponents.pop();
        }
        logger.warn("Shutdown sequence was successful. The app will now exit.");
        logger.warn("=======[SHUT DOWN]=======");
    }

    public addDestroyableComponent(component: OnDestroy): void {
        this.destroyableComponents.push(component);
    }

}
