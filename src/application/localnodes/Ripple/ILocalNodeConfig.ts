export interface ILocalNodeConfig {
    clientConfig: {
        server: string;
        feeCushion?: number;
        maxFeeXRP?: string;
        trace?: boolean;
        proxy?: string;
        timeout?: number;
    },
    mainAccount: {
        address: string;
        secret: string;
    }
    requireDestinationTags: boolean;
    mongoDB?: {
        connectionUri: string;
        saveMainAccountPayments: boolean;
    };
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
}
