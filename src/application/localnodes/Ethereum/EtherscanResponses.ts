import { ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";

export interface IEtherscanTransactions {
    status: string; //if everyhing okay it's 1
    message: string; // if everyhing okay it's "OK"
    result: Array<IEtherscanTransaction>
}

export interface IEtherscanTransaction {
    blockNumber: string;
    timeStamp: string;
    hash: string;
    nonce: string;
    blockHash: string;
    transactionIndex: string;
    from: string;
    to: string;
    value: string; //in wei
    gas: string; //in wei
    gasPrice: string;
    isError: string;
    txreceipt_status: string;
    input: string;
    contractAddress: string;
    cumulativeGasUsed: string;
    gasUsed: string; //in wei
    confirmations: string;
}

export function etherscanTransactionsToRegularTransactions(transactions: IEtherscanTransaction[], requestAddress: string): Array<ITransaction> {
    const standardizedTransactions: ITransaction[] = [];
    requestAddress = requestAddress.toLowerCase();

    transactions.forEach((transaction: IEtherscanTransaction) => {
        let category: ITransaction["category"];
        if(requestAddress !== transaction.from.toLowerCase() && requestAddress === transaction.to.toLowerCase()) {
            category = "RECEIVE";
        } else if(requestAddress === transaction.from.toLowerCase() && requestAddress !== transaction.to.toLowerCase()) {
            category = "SEND";
        } else {
            category = "OTHER";
        }

        const standardizedTransaction: ITransaction = {
            txid: transaction.hash,
            amount: transaction.value,
            confirmations: +transaction.confirmations,
            category: category
        };
        standardizedTransactions.push(standardizedTransaction);
    });

    return standardizedTransactions;
}
