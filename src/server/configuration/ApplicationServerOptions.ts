import { ServerOptions } from "hapi";
import { Logger } from "../../engine/components/Logger";
import { environment } from "../../environments/environment";

export class ApplicationServerOptions {
    public getOptions(logger: Logger): ServerOptions {
        let debugOption: boolean | object = false;
        if (!environment.production) {
            debugOption = {
                log: "*",
                request: "*"
            };
        }
        return {
            port: environment.port,
            host: environment.host,
            tls: environment.tls,
            routes: {
                validate: {
                    failAction: async (request, h, err) => {
                        if (err) {
                            logger.error(err.toString());
                        }
                        throw err;
                    }
                },
                cors: {
                    origin: ["*"],
                    additionalHeaders: [
                        "*"
                    ],
                    credentials: true
                }
            },
            debug: debugOption
        };
    }

}
