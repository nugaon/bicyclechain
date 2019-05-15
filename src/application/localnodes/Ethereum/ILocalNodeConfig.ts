import { AbiItem } from "web3-utils";

export interface ILocalNodeConfig {
    connectionType: "websocket" | "http";
    connectionString: string; //the connection uri to the local node e.g. "ws://127.0.0.1:8546" or filepath to process
    web3Config: {
        defaultAccount?: string;
        defaultBlock?: string | number;
        transactionBlockTimeout?: number;
        transactionConfirmationBlocks?: number;
        transactionPollingTimeout?: number;
        defaultGasPrice?: string;
        defaultGas?: number;
    };
    mainWalletPassword: string;
    etherscan?: IEtherscanConfig;
    mongoDB?: {
        connectionString: string;
        saveNormalTransactions: boolean;
        saveContractTransactions: boolean;
        savePendingTransactions?: boolean; //if it's true, then pending transactions instead of subscribe to new blocks .
        removeNotUsedTransactions?: { //if it's true, then the application will remove every transaction that not belongs to the
            atServerStart: boolean;
        };
    },
    withContracts?: Array<IContractConfig>;
    walletChangeCallback?: { //make callback request at any transaction changes for all wallet accounts
        callbackUri: string;
        enabled: boolean;
        cron: { // set scheduled callbacks  https://github.com/merencia/node-cron
            interval: string; // for example: "0 * * * * *" - every min. - second (optional), minute, hour, day of month, month, day of week
            startBlockNumber?: number; // the starting block number where the first scan starts.
        };
    },
    priorityGasPrices: {
        LOW: string;
        MEDIUM: string;
        HIGH: string;
    }
}

export interface IEtherscanConfig {
    uri: string;
    apiKey: string;
}

export interface IContractConfig {
    type: "ERC20"; // only the ERC20 supported yet.
    address: string;
    route: string; //the route of the cryptoCurrency
    customAbi?: Array<AbiItem>;
}
