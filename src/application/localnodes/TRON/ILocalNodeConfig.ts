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
    }
}
