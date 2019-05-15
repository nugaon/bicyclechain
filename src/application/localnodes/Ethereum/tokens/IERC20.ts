export interface IERC20TransferResponse {
    address: string,
    blockNumber: number;
    transactionHash: string;
    transactionIndex: number;
    blockHash: string;
    logIndex: number;
    removed: boolean;
    id: string;
    returnValues: {
        '0': string;
        '1': string;
        '2': string;
        from: string;
        to: string;
        value: string;
    };
    event: string;
    signature: string;
    raw: {
        data: string;
        topics: Array<string>;
    }
}
