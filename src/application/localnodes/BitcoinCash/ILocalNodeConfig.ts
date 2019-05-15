export interface ILocalNodeConfig {
    rpcClient: {
        username: string;
        password: string;
        network: string;
        port: number;
    };
    changeAddress: string;      ////the change is going to arrive this address after the transaction.
}
