const path = require("path");
const webpack = require("webpack");

module.exports = function(env, args){

    // check if profile was set
    if (!env || !env.profile) {
        console.log("env.profile was not set. Please use --env.profile=#{ENVIRONMENT_NAME}# to pass profile argument.");
    }

    // get profile from env params
    const appProfile = env ? env.profile : undefined;

    // inform the user
    console.log(`[!] Using build profile ***${appProfile ? appProfile : "DEFAULT"}***`);

    // add plugins
    let plugins = [];

    if (appProfile) {
        // replace environment file
        plugins.push(new webpack.NormalModuleReplacementPlugin(/(.*)environments\/environment(\.*)/, function(resource) {
            resource.request = resource.request.replace(/environments\/environment/, `environments/environment.${appProfile}`);
        }));
    }

    // final config
    return {

        target: "node",

        entry: "./src/init.ts",

        node: {
            __dirname: true
        },

        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: "ts-loader",
                    exclude: [/node_modules/]
                }
            ]
        },

        resolve: {
            extensions: [".tsx", ".ts", ".js"]
        },

        optimization: {
            minimize: false
        },

        plugins: plugins,

        output: {
            filename: "bundle.js",
            path: path.resolve(__dirname, "dist")
        }

    };
};
