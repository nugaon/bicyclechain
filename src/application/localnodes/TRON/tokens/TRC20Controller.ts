import { IAddressCheck, ICryptoCurrency, ITransaction } from "../../../cryptoCurrencies/ICryptoCurrency";
import { TronDB } from "../TronDB";
import { TronService } from "../TronService";
import { TRC20Service } from "./TRC20Service";
import { default as TronWeb } from 'tronweb';
import { default as Boom } from "boom";
import { ITRC20Transfer, DbTRC20TransactionsToRegularTransactions } from "../TronDB";

export class TRC20Controller implements ICryptoCurrency {

    private service: TRC20Service;

    constructor(tronService: TronService, tronDB: TronDB, client: TronWeb, contractAddress: string, routeName: string) {
        this.service = new TRC20Service(tronService, tronDB, client, contractAddress, routeName);
    }

    public async onInit() {
        this.service.onInit();
    }

    public async onDestroy() { }

    public async getAccounts() {
        return this.service.getAccounts();
    }

    public async getAccountBalance(req: any) {
        const account = req.params.account;

        const balance = await this.service.getAccountBalance(account);
        return {"account": account, "balance": balance + ""};
    }

    public async getGlobalBalance() {
        const account = this.service.getMainAccount();
        const balance = await this.service.getAccountBalance(account);
        return {account: account, balance: balance + ""};
    }

    public async listAccountTransactions(req: any) {
        const account = req.params.account;
        const page = (req.payload && req.payload.page) ? req.payload.page : 1;
        const offset = (req.payload && req.payload.offset) ? req.payload.offset : 100;
        const currentBlockNumber = await this.service.getBlockNumber(); //to calculate confirmations
        let standardizedTransactions: Array<ITransaction> = [];
        if(this.service.hasOwnExplorer()) {
            const transactions: Array<ITRC20Transfer> = await this.service.listAccountTransactionsFromDb(account, page, offset);
            if(transactions) {
                standardizedTransactions = DbTRC20TransactionsToRegularTransactions(transactions, currentBlockNumber, this.service.addressToHex(account));
            }
        } else {
            throw Boom.failedDependency(`BicycleChain does not connect to the MongoDB so this service is not available.`);
        }
        return standardizedTransactions;
    }

    public async listAccountDeposits(req: any) {
        const account = req.params.account;
        const page = (req.payload && req.payload.page) ? req.payload.page : 1;
        const offset = (req.payload && req.payload.offset) ? req.payload.offset : 100;
        const currentBlockNumber = await this.service.getBlockNumber(); //to calculate confirmations
        let standardizedTransactions: Array<ITransaction> = [];
        if(this.service.hasOwnExplorer()) {
            const transactions: Array<ITRC20Transfer> = await this.service.listAccountDepositsFromDb(account, page, offset);
            if(transactions) {
                standardizedTransactions = DbTRC20TransactionsToRegularTransactions(transactions, currentBlockNumber, this.service.addressToHex(account));
            }
        } else {
            throw Boom.failedDependency(`BicycleChain does not connect to the MongoDB so this service is not available.`);
        }
        return standardizedTransactions;
    }

    public async getTransaction(txid: string) {
        return this.service.getTransaction(txid);
    }

    public async getNativeTransaction(txid: string) {
        return this.service.getNativeTransaction(txid);
    }

    public async getAccountTransaction(req: any) {
        const account = req.params.account;
        const txid = req.params.txid;
        return this.service.getAccountTransaction(account, txid);
    }

    public async performWithdraw(req: any) {
        const receiver = req.payload.sendTo;
        const sender = req.payload.sendFrom;
        const amountInTrx = req.payload.amount + "";
        const privateKey = req.payload.additionalParams && req.payload.additionalParams.privateKey ? req.payload.additionalParams.privateKey : null;
        //const priority = req.payload.additionalParams && req.payload.additionalParams.priority ? req.payload.additionalParams.priority : null;

        // let options = {};

        if(!sender) {
            const txid = await this.service.sendTokenFromMainAccount(receiver, amountInTrx);
            return { txid: txid };
        } else {
            const txid = await this.service.performWithdraw(sender, receiver, amountInTrx, { callFromPrivateKey: privateKey })
            return { txid: txid };
        }
    }

    public async generateAccount(req: any) {
        const account = await this.service.generateAccount();
        return {
            address: account.address.base58,
            additionalInfo: {
                privateKey: account.privateKey,
                publicKey: account.publicKey,
                addressInHex: account.address.hex
            }
        };
    }

    public async isAddress(req: any) {
        if (!req.params.address) {
            throw new Error("Bad parameters");
        }
        const valid = await this.service.isAddress(req.params.address);
        return new Promise<IAddressCheck>((resolve) => {
            resolve({ address: req.params.address, valid: valid });
        });
    }
}
