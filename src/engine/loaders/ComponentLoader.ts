import { Container } from "inversify";
import { AsyncForeach } from "../../application/generic/AsyncForeach";
import { ComponentRegistry } from "../configuration/ComponentRegistry";
import { OnInit } from "../interfaces/EngineLifeCycleEvents";

/**
 * This class is responsible for loading engine components (found in 'components' directory)
 */
export class ComponentLoader {

    constructor(
        private container: Container
    ) { }

    public async loadComponents(): Promise<void> {
        console.log("[ComponentLoader] Loading engine components...");
        const components: any[] = ComponentRegistry.getComponents();
        await AsyncForeach(components, async (componentSymbol: any) => {
            console.log(`[ComponentLoader]    > Loading component: '${componentSymbol.name}'...`);
            const component: any = this.container.get(componentSymbol);
            if (!component) {
                throw new Error(`Component '${componentSymbol}' was not found in container. Please make sure that
                    it has @injectable decorator on it.`);
            }
            if (isOnInitDefined(component)) {
                await (<OnInit>component).onInit();
            }
        });
    }

}

function isOnInitDefined(clazz: OnInit): clazz is OnInit {
    return (clazz).onInit !== undefined;
}
