import { ConnectionOptions } from "typeorm";

export interface ILocalNodeConfig {
    mainAccount: {
        privateKey: string;
        accountName: string;
    };
    database: ConnectionOptions;
    rpcClient: {
        nodeURL: string; //the HTTP EP for the nodeos client
        walletURL: string; //the HTTP EP for the kleosd client
    }
}
