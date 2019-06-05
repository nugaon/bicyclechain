export interface trxTransaction {
    ret?: Array<{ contractRet: string; }>; //success
    txID: string;
    raw_data: transactionRawData;
    raw_data_hex: string;
    signature: Array<string>;
}

export interface trxTransactionInfo {
    id: string;
    blockNumber: number;
    blockTimeStamp: number;
    contractResult: Array<string>;
    receipt: {
        net_usage: number;
    }
}

export interface extendedTransaction extends trxTransaction, trxTransactionInfo {}

export interface transactionRawData {
    contract: Array<{
        parameter:{
            value: {
                amount: number;
                owner_address: string;
                to_address: string;
                asset_name?: string; //only if token transaction
            },
            type_url: string;
        },
        type: string; //TransferContract at trx transaction
    }>;
    ref_block_bytes: string;
    ref_block_hash: string;
    expiration: number; //timestamp
    timestamp: number;
}

export interface sendedTransaction {
    result: boolean;
    transaction: trxTransaction;
};

export interface block {
    blockID: string;
    block_header: {
        raw_data: {
            number: number;
            txTrieRoot: string;
            witness_address: string;
            witness_signature: string;
            parentHash: string;
            version: number;
            timestamp: number;
        },
    }
    transactions: Array<trxTransaction>;
}

export interface createdAccount {
    privateKey: string;
    publicKey: string;
    address: {
        base58: string;
        hex: string;
    }
}
