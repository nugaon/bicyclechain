import { Document, Schema, Model, createConnection, Connection} from "mongoose";
import { environment } from "../../../environments/environment";
import { ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";
import { Amount } from "ripple-lib/dist/npm/common/types/objects";

export class RippleDB {

    private connectionUri: string;
    private client: Connection;
    private PaymentTransactionModel: Model<IPaymentTransaction>;
    private PaymentTransactionSchema: Schema;

    constructor() {}

    public async onInit() {
        this.connectionUri = environment.localnodeConfigs.Ripple.mongoDB.connectionUri;
        try {
            this.client = await createConnection(this.connectionUri, { useNewUrlParser: true });
            console.log(`\n\t[XRP] Service connected to database: ${this.connectionUri}`);
            this.initModels();
        }
        catch(e) {
            console.log(e);
        }
    }

    public async onDestroy() {
        await this.client.close();
        console.log(`MongoDB connection closed on ${this.connectionUri}`);
    }

    private initModels() {
        this.PaymentTransactionSchema = new Schema({
            hash: String,
            date: Number,
            txSignature: String,
            signingPubKey: String,
            sequence: Number,
            flags: Number,
            fee: String,
            destinationTag: Number,
            from: String,
            to: String,
            amount: {
                value: {
                    type: String,
                    required: true,
                },
                currency: {
                    type: String,
                    required: true,
                },
                issuer: String,
                counterparty: String
            },
            status: String,
            blockNumber: Number,
            blockHash: String,
            result: String,
            resultCode: Number
        });
        this.PaymentTransactionModel = this.client.model<IPaymentTransaction>("NormalTransaction", this.PaymentTransactionSchema)
    }

    public get PaymentTransaction() {
        return this.PaymentTransactionModel;
    }
}

export interface IPaymentTransaction extends Document {
    hash: string;
    date: number;
    txSignature: string;
    signingPubKey: string;
    sequence: number;
    flags: number;
    fee: string;
    destinationTag: number;
    from: string;
    to: string;
    amount: Amount;
    status: string;
    blockNumber: number;
    blockHash: string;
    result: string;
    resultCode: number;
}

export function DbPaymentTransactionsToRegularTransactions(transactions: IPaymentTransaction[], currentBlock: number, requestAddress: string): Array<ITransaction> {
    const standardizedTransactions: ITransaction[] = [];
    requestAddress = requestAddress.toLowerCase();

    transactions.forEach((dbTransaction: IPaymentTransaction) => {
        let category: ITransaction["category"];
        if(requestAddress !== dbTransaction.from.toLowerCase() && requestAddress === dbTransaction.to.toLowerCase()) {
            category = "RECEIVE";
        } else if(requestAddress === dbTransaction.from.toLowerCase() && requestAddress !== dbTransaction.to.toLowerCase()) {
            category = "SEND";
        } else {
            category = "OTHER";
        }

        const standardizedTransaction: ITransaction = {
            txid: dbTransaction.hash,
            amount: dbTransaction.amount.value,
            confirmations: currentBlock - dbTransaction.blockNumber,
            category: category,
            additionalInfo: {
                destinationTag: dbTransaction.destinationTag
            }
        };
        standardizedTransactions.push(standardizedTransaction);
    });

    return standardizedTransactions;
}
