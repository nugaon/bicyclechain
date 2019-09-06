import { IDbClientConfig } from "./db/ChainSchema"

export interface ILocalNodeConfig {
    mainAccount: {
        privateKey: string;
        accountName: string;
        publicKey: string; //to generate accounts
    };
    database: IDbClientConfig;
    rpcClient: {
        nodeURL: string; //the HTTP EP for the nodeos client
    },
    transactionOptions?: {
        blocksBehind?: number;
        expireSeconds?: number;
    }
}
