import { Logger } from "../components/Logger";
/**
 * Registry for components in the system.
 * All components need to be registered in order to work.
 * This static linking method is required because of the Webpack build.
 */

export class ComponentRegistry {

    /**
     * List of components of the system.
     * Please keep this list updated.
     */
    private static readonly elements: any[] = [
        Logger
    ];

    /**
     * Returns components.
     */
    public static getComponents(): any[] {
        return ComponentRegistry.elements;
    }

}
