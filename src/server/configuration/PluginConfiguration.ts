import * as hapiSwagger from "hapi-swagger";
import * as Inert from "inert";
import * as Vision from "vision";
import { environment } from "../../environments/environment";

interface PluginLike {
    plugin: any;
    options?: any;
}

export class PluginConfiguration {
    public getConfiguration(): PluginLike[] {
        const plugins: PluginLike[] = [];
        if (!environment.production) {
            plugins.push(
                {
                    plugin: Inert
                },
                {
                    plugin: Vision
                },
                {
                    plugin: hapiSwagger,
                    options: {
                        info: {
                            title: "BicycleChain API Documentation",
                            version: "1.0.0",
                            contact: {
                                name: "Viktor Levente Toth",
                                email: "toth.viktor.levente@gmail.com"
                            }
                        },
                        basePath: "/",
                        documentationPath: "/documentation",
                        payloadType: "json",
                        grouping: "tags",
                        tagsGroupingFilter: (tag: string): boolean => !["api", "v1", "filter", "search", "list"]
                            .some((e: string) => e === tag)
                    }
                }
            );
        }
        return plugins;
    }

}
