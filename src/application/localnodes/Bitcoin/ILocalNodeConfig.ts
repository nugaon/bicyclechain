export interface ILocalNodeConfig {
    rpcClient: {
        username: string;
        password: string;
        network: string;
        port: number;
    };
    transactionPriority?: {     //how many blocks have to wait until the transaction will processed.
        HIGH: number;           
        MEDIUM: number;
        LOW: number;
    };
    changeAddress?: string;      ////  the change is going to arrive this address after the transaction.
}
