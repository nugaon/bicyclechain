export interface IUnspentTransaction {
    txid: string;
    vout: number;
    address: string;
    account?: string;
    scriptPubKey: string;
    amount: string;
    confirmations: number;
    redeemScript?: string;
    spendable: boolean; //in wei
    solvable: boolean; //in wei
    safe: boolean;
}

export interface ILitecoinTransaction {
    account: string;
    address: string;
    category: "send" | "receive" | "move";
    amount: string;
    label?: string;
    vout: number;
    confirmations: number;
    blockhash: string;
    blockindex: number;
    blocktime: number;
    txid: string;
    walletconflicts: [];
    time: number;
    timereceived: number;
    comment?: string;
    "bip125-replaceable": "no" | "yes" | "unknown";
    abandoned?: boolean;


}
export interface ILitecoinTransactionNative {
    amount: string;
    fee: number;
    confirmations: number;
    blockhash: string;
    blockindex: number;
    txid: string;
    walletconflits: [];
    time: number;
    timereceived: number;
    "bip125-replaceable": "no" | "yes" | "unknown";
    details: Object;
    hex: string;
}

export interface IFundRawTransaction {
    hex: string; //The resulting raw transaction (hex-encoded string)
    fee: number; //Fee in LTC the resulting transaction pays
    changepos: number; //The position of the added change output, or -1
}

export interface ISignedTransaction {
    hex: string; //The hex-encoded raw transaction with signature(s)
    complete?: boolean; //If the transaction has a complete set of signatures
    errors?: Array<{
        txid: string; //The hash of the referenced, previous transaction
        vout: number; //The index of the output to spent and used as input
        scriptSig: string; //The hex-encoded signature script
        sequence: number; //Script sequence number
        error: string; //Verification or signing error related to the input
    }>; //cript verification errors

}
