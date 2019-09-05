import { IDbClientConfig } from "./db/ChainSchema"

export interface ILocalNodeConfig {
    mainAccount: {
        privateKey: string;
        accountName: string;
    };
    database: IDbClientConfig;
    rpcClient: {
        nodeURL: string; //the HTTP EP for the nodeos client
        walletURL: string; //the HTTP EP for the kleosd client
    }
}
