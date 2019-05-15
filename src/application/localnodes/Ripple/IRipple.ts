import { Amount } from "ripple-lib/dist/npm/common/types/objects";

export interface ITransactionEvent {
    engine_result: string;
    engine_result_code: number;
    engine_result_message: string;
    ledger_hash: string;
    ledger_index: number;
    status: string;
    meta: {
        AffectedNodes: Array<any>;
        TransactionIndex: number;
        TransactionResult: string; //tesSUCCESS the transaction was successful at Payment transactions
        delivered_amount: string;
    };
    transaction: {
        Account: string;
        Amount?: string | Amount; //at Payment it has.
        Destination: string;
        DestinationTag?: number;
        Fee: string;
        Flags: number;
        LastLedgerSequence: number;
        OfferSequence?: number;
        Sequence: number;
        SigningPubKey: string;
        TransactionType: string; //at withdraw this is "Payment"
        TxnSignature: string;
        date: number;
        hash: string;
    };
    type: "transaction";
    validated: boolean;
}
