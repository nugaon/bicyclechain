import { interfaces } from "inversify";
import { OnDestroy } from "../interfaces/EngineLifeCycleEvents";
import { ShutDownEventHandler } from "./ShutDownEventHandler";
import Next = interfaces.Next;
import NextArgs = interfaces.NextArgs;

export function ShutDownEventInterceptor(planAndResolve: Next): Next {
    return (args: NextArgs): any => {
        const resolvedComponent: any = planAndResolve(args);
        if (isOnDestroyDefined(resolvedComponent)) {
            ShutDownEventHandler.getInstance()
                .addDestroyableComponent(resolvedComponent);
        }
        return resolvedComponent;
    };
}

/**
 * Runtime guard for onDestroy event
 * @param clazz
 */
function isOnDestroyDefined(clazz: OnDestroy): clazz is OnDestroy {
    return (clazz).onDestroy !== undefined;
}
