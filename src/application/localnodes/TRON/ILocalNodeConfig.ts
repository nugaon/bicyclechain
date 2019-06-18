export interface ILocalNodeConfig {
    clientConfig: {
        fullHost?: string; //if you define this, the other not necessary (if the other service runs on this server)
        fullNode?: string;
        eventServer?: string;
        solidityNode?: string;
    },
    mainAccount: {
        address: string;
        privateKey: string;
    }
    walletChangeCallback?: { //if transaction happens with the main address, make a callback to the given URI
        callbackUri: string;
        enabled: boolean;
        cron: { // set scheduled callbacks  https://github.com/merencia/node-cron
            interval: string; // for example: "0 * * * * *" - every min. - second (optional), minute, hour, day of month, month, day of week
            startBlockNumber?: number; // the starting block number where the first scan starts. default is the block number when the app starts
        };
    },
    fees: {
        priorityMultipliers: { //multiplier of the reference fee (the simpliest transaction minimum fee)
            LOW: number;
            MEDIUM: number;
            HIGH: number;
        }
    };
    mongoDB: { //to save persistent account creationss
        connectionUri: string;
    };
    withTokens?: Array<ITokenConfig>;
}

export interface ITokenConfig {
    type: "TRC10"; // only the TRC10 supported yet.
    tokenID?: string; //only at TRC10
    route: string; //the route of the cryptoCurrency
}
