import { Document, Schema, Model, createConnection, Connection} from "mongoose";
import { environment } from "../../../environments/environment";
import { ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";

export class EthereumDB {

    private connectionUri: string;
    private client: Connection;
    private ERC20TransferModel: Model<IERC20Transfer>;
    private ERC20TransferSchema: Schema;
    private NormalTransactionModel: Model<INormalTransaction>;
    private NormalTransactionSchema: Schema;

    constructor() {}

    public async onInit() {
        this.connectionUri = environment.localnodeConfigs.Ethereum.mongoDB.connectionString;
        try {
            this.client = await createConnection(this.connectionUri, { useNewUrlParser: true });
            console.log(`\n[ETH] Service connected to database: ${this.connectionUri}`);
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
        this.ERC20TransferSchema = new Schema({
            address: String,
            blockNumber: Number,
            transactionHash: String,
            blockHash: String,
            removed: Boolean,
            id: String,
            from: String,
            to: String,
            value: String,
            signature: String
        });
        this.ERC20TransferModel = this.client.model<IERC20Transfer>("ERC20Transfer",  this.ERC20TransferSchema);
        this.NormalTransactionSchema = new Schema({
            hash: String,
            nonce: Number,
            blockHash: String,
            blockNumber: Number,
            transactionIndex: Number,
            from: String,
            to: String,
            value: String,
            gasPrice: String,
            gas: Number,
            input: String
        });
        this.NormalTransactionModel = this.client.model<INormalTransaction>("NormalTransaction", this.NormalTransactionSchema)
    }

    public get ERC20Transfer() {
        return this.ERC20TransferModel;
    }

    public get NormalTransaction() {
        return this.NormalTransactionModel;
    }
}

export interface IERC20Transfer extends Document {
    address: string,
    blockNumber: number,
    transactionHash: string,
    blockHash: string,
    removed: boolean,
    id: string,
    from: string,
    to: string,
    value: string,
    signature: string
}

export interface INormalTransaction extends Document {
    hash: string;
    nonce: number;
    blockHash: string | null;
    blockNumber: number | null;
    transactionIndex: number | null;
    from: string;
    to: string;
    value: string;
    gasPrice: string;
    gas: number;
    input: string;
}

export function DbERC20TransactionsToRegularTransactions(transactions: IERC20Transfer[], currentBlock: number, requestAddress: string): Array<ITransaction> {
    const standardizedTransactions: ITransaction[] = [];
    requestAddress = requestAddress.toLowerCase()

    transactions.forEach((transaction: IERC20Transfer) => {
        let category: ITransaction["category"];
        if(requestAddress !== transaction.from.toLowerCase() && requestAddress === transaction.to.toLowerCase()) {
            category = "RECEIVE";
        } else if(requestAddress === transaction.from.toLowerCase() && requestAddress !== transaction.to.toLowerCase()) {
            category = "SEND";
        } else {
            category = "OTHER";
        }

        const standardizedTransaction: ITransaction = {
            txid: transaction.transactionHash,
            amount: transaction.value,
            confirmations: currentBlock - transaction.blockNumber,
            category: category
        };
        standardizedTransactions.push(standardizedTransaction);
    });

    return standardizedTransactions;
}

export function DbNormalTransactionsToRegularTransactions(transactions: INormalTransaction[], currentBlock: number, requestAddress: string): Array<ITransaction> {
    const standardizedTransactions: ITransaction[] = [];
    requestAddress = requestAddress.toLowerCase();

    transactions.forEach((transaction: INormalTransaction) => {
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
            confirmations: currentBlock - transaction.blockNumber,
            category: category
        };
        standardizedTransactions.push(standardizedTransaction);
    });

    return standardizedTransactions;
}
