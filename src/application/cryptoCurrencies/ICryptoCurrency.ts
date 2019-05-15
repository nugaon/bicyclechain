//should implement all of the usable coin/token controllers
export interface ICryptoCurrency {
    onInit(): Promise<void>; //async contructor that calls on initialization
    onDestroy(): Promise<void>; //async destructor that calls on application shutdown.
    getAccounts(): Promise<Array<string>>; //list local node's accounts
    getAccountBalance(request: any): Promise<IBalance>;
    listAccountTransactions(request: any): Promise<Array<ITransaction>>;
    listAccountDeposits(request: any): Promise<Array<ITransaction>>;
    getAccountTransaction(request: any): Promise<ITransaction>;
    performWithdraw(request: any): Promise<IPerformWithdrawal>; //id of the transaction
    getGlobalBalance(): Promise<IBalance>; //balance of the local node's main account
    generateAccount(request: any): Promise<IGenerateAccount>; //returns the hash of the account
    isAddress(request: any): Promise<IAddressCheck>; //check the given 'address' is address or not.
    getNativeTransaction(txid: string): Promise<any>;
    getTransaction(txid: string): Promise<ITransaction>;
}

// The local nodes that implement it those can tranfer tokens
export interface ITokenTransporter {
    initTokens(): Promise<ITokenInitResponse>; //initializes the token controllers that specified in the local node settings.
}

export interface ITransaction {
    txid: string;
    amount: string;
    confirmations: number;
    category: "RECEIVE" | "SEND" | "OTHER",
    to?: string; //address, when not ask from account listing
    from?: string; //address, when not ask from account listing, also can omitted when receive coins outside (BTC)
    additionalInfo?: any
    // {
    //     destinationTag?: number; //at Ripple
    //     toAccount: at btc forks, if the address has account or label
    //     fromAccount: at btc forks, if the address hash account or label
    // }
}

export interface IBalance {
    account?: string;
    balance: string;
}

export interface IPerformWithdrawal {
    txid: string;
}

export interface IGenerateAccount {
    address: string;
    additionalInfo?: {
        password?: string;
    }
}

export interface IAddressCheck {
    address: string;
    valid: boolean;
}

export interface ITokenInitResponse {
    routeMapping: Array<ITokenRouteMapping>; //similar like localnodeconfigs
    instances: Array<ICryptoCurrency>;
}

export interface ITokenRouteMapping {
    route: string;
    referenceId: string;
}
