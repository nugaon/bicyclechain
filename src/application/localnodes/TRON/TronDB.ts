import { Document, Schema, Model, createConnection, Connection} from "mongoose";
import { environment } from "../../../environments/environment";
import { ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";
import { default as TronWeb } from 'tronweb';

export class TronDB {

    private connectionUri: string;
    private client: Connection;
    private AccountModel: Model<IAccount>;
    private AccountSchema: Schema;
    private TRC20TransferModel: Model<ITRC20Transfer>;
    private TRC20TransferSchema: Schema;
    private TRC10TransferModel: Model<ITRC10Transfer>;
    private TRC10TransferSchema: Schema;
    private CommonTransactionModel: Model<ICommonTransaction>;
    private CommonTransactionSchema: Schema;

    constructor() {}

    public async onInit() {
        this.connectionUri = environment.localnodeConfigs.TRON.mongoDB.connectionUri;
        try {
            this.client = await createConnection(this.connectionUri, { useNewUrlParser: true });
            console.log(`[TRX] Service connected to database: ${this.connectionUri}`);
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
        this.AccountSchema = new Schema({
            address: String,
            addressInHex: String,
            privateKey: String,
            publicKey: String
        });
        this.AccountModel = this.client.model<IAccount>("Account", this.AccountSchema);

        this.TRC20TransferSchema = new Schema({
            contractAddress: String,
            transactionHash: String,
            from: String,
            to: String,
            value: String,
            timestamp: Number,
            blockNumber: Number
        });
        this.TRC20TransferModel = this.client.model<ITRC20Transfer>("TRC20Transfer",  this.TRC20TransferSchema);

        this.TRC10TransferSchema = new Schema({
            contractRet: String,
            transactionHash: String,
            signature: String,
            value: String,
            from: String,
            to: String,
            refBlockHash: String,
            timestamp: Number,
            contractAddress: String,
            blockNumber: Number //not sure save like this first
        });
        this.TRC10TransferModel = this.client.model<ITRC10Transfer>("TRC10Transfer",  this.TRC10TransferSchema);

        this.CommonTransactionSchema = new Schema({
            contractRet: String,
            transactionHash: String,
            value: String,
            from: String,
            to: String,
            refBlockHash: String,
            timestamp: Number,
            blockNumber: Number, //not sure save like this first
        });
        this.CommonTransactionModel = this.client.model<ICommonTransaction>("CommonTransaction",  this.CommonTransactionSchema);
    }

    public get Account() {
        return this.AccountModel;
    }

    public get TRC20Transfer() {
        return this.TRC20TransferModel;
    }

    public get TRC10Transfer() {
        return this.TRC10TransferModel;
    }

    public get CommonTransaction() {
        return this.CommonTransactionModel;
    }
}

export interface IAccount extends Document {
    address: string;
    addressInHex: string;
    privateKey: string;
    publicKey: string;
}

export interface ITRC20Transfer extends Document {
    contractAddress: string,
    transactionHash: string,
    from: string,
    to: string,
    value: string,
    timestamp: number,
    blockNumber: number
}

export interface CommonTransaction {
    contractRet: string,
    transactionHash: string,
    value: string,
    from: string,
    to: string,
    refBlockHash: string,
    timestamp: number,
    blockNumber?: number
}

export interface ICommonTransaction extends Document, CommonTransaction { }

export interface TRC10Transfer extends CommonTransaction {
    contractAddress: string
}

export interface ITRC10Transfer extends Document, TRC10Transfer { }

export function DbTransactionsToRegularTransactions(transactions: ITRC20Transfer[] | ITRC10Transfer[] | CommonTransaction[], currentBlock: number, requestAddressInHex: string): Array<ITransaction> {
    const standardizedTransactions: ITransaction[] = [];

    transactions.forEach((transaction: ITRC20Transfer | ITRC10Transfer | CommonTransaction) => {
        let category: ITransaction["category"];
        if(requestAddressInHex !== transaction.from && requestAddressInHex === transaction.to) {
            category = "RECEIVE";
        } else if(requestAddressInHex === transaction.from && requestAddressInHex !== transaction.to) {
            category = "SEND";
        } else {
            category = "OTHER";
        }

        const standardizedTransaction: ITransaction = {
            txid: transaction.transactionHash,
            amount: transaction.value,
            confirmations: currentBlock - transaction.blockNumber,
            category: category,
            from: TronWeb.address.fromHex(transaction.from),
            to: TronWeb.address.fromHex(transaction.to)
        };
        standardizedTransactions.push(standardizedTransaction);
    });

    return standardizedTransactions;
}
