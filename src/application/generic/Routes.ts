import { ServerRoute } from "hapi";

/**
 * Interface for server router classes.
 */
export interface Routes {
    readonly routes: ServerRoute[];
}
