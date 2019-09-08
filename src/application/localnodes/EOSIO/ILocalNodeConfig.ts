import { IDbClientConfig } from "./db/ChainSchema"

export interface ILocalNodeConfig {
    mainAccount: {
        privateKey: string;
        accountName: string;
        publicKey: string; //to generate accounts
    };
    ownedAccounts?: Array<string>; //if there are more accounts from the mainAccount and the user wants to get notifications about their balance change.
    database: IDbClientConfig;
    rpcClient: {
        nodeURL: string; //the HTTP EP for the nodeos client
    },
    transactionOptions?: {
        blocksBehind?: number;
        expireSeconds?: number;
    },
    walletChangeCallback?: { //if transaction happens with the main address, make a callback to the given URI
        callbackUri: string;
        enabled: boolean;
        cron: { // set scheduled callbacks  https://github.com/merencia/node-cron
            interval: string; // for example: "0 * * * * *" - every min. - second (optional), minute, hour, day of month, month, day of week
            startBlockNumber?: number; // the starting block number where the first scan starts. default is the block number when the app starts
        };
    },
    withTokens?: Array<ITokenConfig>;
}

export interface ITokenConfig {
    currency: string; //the acronym for the currency like SYS
    contract?: string; //default EOSIO
    route: string; //the route of the cryptoCurrency
}
