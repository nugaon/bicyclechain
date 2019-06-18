import { IAddressCheck, ICryptoCurrency, ITransaction } from "../../../cryptoCurrencies/ICryptoCurrency";
import { TronDB } from "../TronDB";
import { TronService } from "../TronService";
import { TRC10Service } from "./TRC10Service";
import { default as TronWeb } from 'tronweb';

export class TRC10Controller implements ICryptoCurrency {

    private service: TRC10Service;

    constructor(tronService: TronService, tronDB: TronDB, client: TronWeb, contractAddress: string, routeName: string) {
        this.service = new TRC10Service(tronService, tronDB, client, contractAddress, routeName);
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
        // const account = req.params.account;
        // const page = (req.payload && req.payload.page) ? req.payload.page : 1;
        // const offset = (req.payload && req.payload.offset) ? req.payload.offset : 100;
        // const currentBlockNumber = await this.service.getBlockNumber(); //to calculate confirmations
        // let standardizedTransactions: Array<ITransaction> = [];
        // if(this.service.hasOwnExplorer()) {
        //     const transactions: Array<IERC20Transfer> = await this.service.listAccountTransactionsFromDb(account, page, offset);
        //     if(transactions) {
        //         standardizedTransactions = DbERC20TransactionsToRegularTransactions(transactions, currentBlockNumber, account);
        //     }
        // } else {
        //     const transactions: Array<IEtherscanTransaction> | undefined = await this.service.listAccountTransactionsFromEtherscan(account);
        //     if(transactions) {
        //         standardizedTransactions = etherscanTransactionsToRegularTransactions(transactions, account);
        //     }
        // }
        // return standardizedTransactions;
        return null;
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

    public async listAccountDeposits(req: any) {
        // const account = req.params.account;
        // const page = (req.payload && req.payload.page) ? req.payload.page : 1;
        // const offset = (req.payload && req.payload.offset) ? req.payload.offset : 100;
        //
        // const currentBlockNumber = await this.service.getBlockNumber(); //to calculate confirmations
        // let standardizedTransactions: Array<ITransaction> = [];
        // if(this.service.hasOwnExplorer()) {
        //     const transactions: Array<IERC20Transfer> = await this.service.listAccountDepositsFromDb(account, page, offset);
        //     if(transactions) {
        //         standardizedTransactions = DbERC20TransactionsToRegularTransactions(transactions, currentBlockNumber, account);
        //     }
        // } else {
        //     const transactions: Array<IEtherscanTransaction> | undefined = await this.service.listAccountDepositsFromEtherscan(account);
        //     if(transactions) {
        //         standardizedTransactions = etherscanTransactionsToRegularTransactions(transactions, account);
        //     }
        // }
        // return standardizedTransactions;
        return null;
    }

    public async performWithdraw(req: any) {
        const receiver = req.payload.sendTo;
        const sender = req.payload.sendFrom;
        const amountInTrx = req.payload.amount + "";
        const privateKey = req.payload.additionalParams && req.payload.additionalParams.privateKey ? req.payload.additionalParams.privateKey : null;
        //const priority = req.payload.additionalParams && req.payload.additionalParams.priority ? req.payload.additionalParams.priority : null;

        // let options = {};

        if(!sender) {
            const sended = await this.service.sendTokenFromMainAccount(receiver, amountInTrx);
            return { txid: sended.transaction.txID };
        } else {
            const sended = await this.service.sendTokenFromOwnedAccount(sender, receiver, amountInTrx, privateKey)
            return { txid: sended.transaction.txID };
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
