import { default as Boom } from "boom";
import { environment } from "../../../environments/environment";
import { IAddressCheck, ICryptoCurrency, ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";
import { BitcoinService } from "./BitcoinService";
import { IBitcoinTransaction, IBitcoinTransactionNative } from "./IBitcoinResponses";

export class BitcoinController implements ICryptoCurrency {

    private service: BitcoinService;

    constructor() {
    }

    public async onInit() {
        this.service = new BitcoinService(environment.localnodeConfigs.Bitcoin);
        await this.service.onInit();
    }

    public async onDestroy() { }

    public async getAccounts() {
        return this.service.getAccounts();
    }

    public async getAccountBalance(req: any) {
        const account = req.params.account === "_" ? "" : req.params.account;
        const balance = await this.service.getBalance(account, !await this.service.isAddress(req.params.account));
        return { "account": account, "balance": balance };

    }

    public async getGlobalBalance() {
        const balance = await this.service.getGlobalBalance();
        return {account: "<ALL>", balance: balance};
    }

    public async getTransaction(txid: string) {
        return this.service.getTransaction(txid);
    }

    public async getNativeTransaction(txid: string) {
        return this.service.getNativeTransaction(txid);
    }

    public async getAccountTransaction(req: any) {
        const account = req.params.account === "_" ? "" : req.params.account;
        const txid = req.params.txid;
        return this.service.getAccountTransaction(account, txid);
    }

    public async listAccountTransactions(req: any) {
        const account = req.params.account === "_" ? "" : req.params.account;
        const options = {
            page: (req.payload && req.payload.page) ? req.payload.page : 1,
            offset: (req.payload && req.payload.offset) ? req.payload.offset : 20
        };
        const transactions: Array<IBitcoinTransaction> | undefined = await this.service.listAccountTransactions(account, options);
        let standardizedTransactions: Array<ITransaction> = [];
        if (transactions) {
            standardizedTransactions = this.accountTransactionsToRegularTransactions(transactions);
        }
        return standardizedTransactions;
    }

    public async listAccountDeposits(req: any) {
        const account = req.params.account === "_" ? "" : req.params.account;
        const page = (req.payload && req.payload.page) ? req.payload.page : 1;
        const offset = (req.payload && req.payload.offset) ? req.payload.offset : 100;
        const transactions: Array<IBitcoinTransaction> | undefined = await this.service.listAccountDeposits(account, page, offset);
        let standardizedTransactions: Array<ITransaction> = [];
        if (transactions) {
            standardizedTransactions = this.accountTransactionsToRegularTransactions(transactions);
        }
        return standardizedTransactions;
    }

    public async performWithdraw(req: any) {
        const receiver = req.payload.sendTo;
        const sender = req.payload.sendFrom;
        const amount = req.payload.amount + "";
        let withdrawOptions = {
            priority: req.payload.additionalParams && req.payload.additionalParams.priority ? req.payload.additionalParams.priority : "MEDIUM",
            subFee: req.payload.additionalParams && req.payload.additionalParams.subFee ? req.payload.additionalParams.subFee : false
        };

        const txid = await this.service.performWithdraw(sender, receiver, amount, withdrawOptions);
        return { txid: txid };
    }

    public async generateAccount(req: any) {
        if (!req.payload.additionalParams || !req.payload.additionalParams.account) {
            throw Boom.badRequest("required payload key 'additionalParams.account' missed.");
        }
        const address = await this.service.generateAccount(req.payload.additionalParams.account);
        return { address: address };
    }


    public async isAddress(req: any): Promise<any> {
        if (!req.params.address) {
            throw Boom.badRequest("Bad parameters");
        }
        const valid = await this.service.isAddress(req.params.address);
        return new Promise<IAddressCheck>((resolve) => {
            resolve({ address: req.params.address, valid: valid });
        });
    }



    public async listUnspentTransactions(req: any) {
        if (req.playload.address) {
            const unspentTransactions = await this.service.listUnspentTransactions(req.playload.address, false);
            return { address: req.playload.address, unspentTransactions: unspentTransactions };
        } else if (req.playload.account) {
            const unspentTransactions = await this.service.listUnspentTransactions(req.playload.account, true);
            return { account: req.playload.account, unspentTransactions: unspentTransactions };
        }
    }

    private accountTransactionsToRegularTransactions(transactions: Array<IBitcoinTransaction>) {
        const standardizedTransactions: Array<ITransaction> = [];

        transactions.forEach((transaction) => {
            standardizedTransactions.push(
                this.accountTransactionsToRegularTransaction(transaction)
            );
        });

        return standardizedTransactions;
    }

    private accountTransactionsToRegularTransaction(transaction: IBitcoinTransaction): ITransaction {
        let category: ITransaction["category"];
        switch (transaction.category) {
            case "send":
                category = "SEND";
                break;
            case "receive":
                category = "RECEIVE";
                break;
            default:
                category = "OTHER";
        }
        return {
            txid: transaction.txid,
            amount: transaction.amount,
            confirmations: +transaction.confirmations,
            category: category
        };
    }
}
