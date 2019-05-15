import { Amount } from "ripple-lib/dist/npm/common/types/objects";
import { ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";

export interface DataApiAccountPaments {
    result: string;
    count: number;
    marker: string;
    payments: Array<DataApiPayment>;
}

export interface DataApiPayment {
    amount: string;
    delivered_amount: string;
    destination_balance_changes: Array<Amount>;
    source_balance_changes: Array<Amount>;
    tx_index: number;
    currency: string;
    destination: string;
    executed_time: string;
    ledger_index: number;
    source: string;
    source_currency: string;
    tx_hash: string;
    transaction_cost: string;
    destination_tag?: number;
    source_tag?: number;
}

export function DbApiPaymentTransactionsToRegularTransactions(transactions: DataApiPayment[], currentBlock: number, requestAddress: string): Array<ITransaction> {
    const standardizedTransactions: ITransaction[] = [];
    requestAddress = requestAddress.toLowerCase();

    transactions.forEach((dataApiTransaction: DataApiPayment) => {
        let category: ITransaction["category"];
        if(requestAddress !== dataApiTransaction.source.toLowerCase() && requestAddress === dataApiTransaction.destination.toLowerCase()) {
            category = "RECEIVE";
        } else if(requestAddress === dataApiTransaction.source.toLowerCase() && requestAddress !== dataApiTransaction.destination.toLowerCase()) {
            category = "SEND";
        } else {
            category = "OTHER";
        }

        const standardizedTransaction: ITransaction = {
            txid: dataApiTransaction.tx_hash,
            amount: dataApiTransaction.amount,
            confirmations: currentBlock - dataApiTransaction.ledger_index - currentBlock,
            category: category,
            additionalInfo: {
                destinationTag: dataApiTransaction.destination_tag
            }
        };
        standardizedTransactions.push(standardizedTransaction);
    });

    return standardizedTransactions;
}
