import { IAddressCheck, ICryptoCurrency, ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";
import { RippleService } from "./RippleService";
import { IPaymentTransaction, DbPaymentTransactionsToRegularTransactions } from "./RippleDB";
import { DataApiAccountPaments, DbApiPaymentTransactionsToRegularTransactions } from "./DataApiResponses";
import { default as Boom } from "boom";

export class RippleController implements ICryptoCurrency {

    private service: RippleService;

    public async onInit() {
        this.service = new RippleService();
        this.service.onInit();
    }

    public async onDestroy() { }

    public async getAccounts() {
        return this.service.getAccounts();
    }

    public async getAccountBalance(req: any) {
        const account = req.params.account;
        const balance = await this.service.getBalance(account);
        return { account: account, balance: balance };
    }

    public async getTransaction(txid: string) {
        try {
            return this.service.getTransaction(txid);
        }
        catch (e) {
            throw Boom.notFound(e);
        }
    }

    public async getNativeTransaction(txid: string) {
        try {
            return this.service.getNativeTransaction(txid);
        }
        catch (e) {
            throw Boom.notFound(e);
        }
    }

    public async getAccountTransaction(req: any) {
        const account = req.params.account;
        const txid = req.params.txid;
        return this.service.getAccountTransaction(account, txid);
    }

    public async listAccountTransactions(req: any) {
        //TODO
        const account = req.params.account;
        const offset = (req.payload && req.payload.offset) ? req.payload.offset : 100;
        const currentBlockNumber = await this.service.getBlockNumber(); //to calculate confirmations
        let standardizedTransactions: Array<ITransaction> = [];

        if(this.service.hasOwnExplorer() && this.service.getMainAccount() === account) {
            const transactions: Array<IPaymentTransaction> = await this.service.listAccountTransactionsFromDb(account, "XRP", offset);
            standardizedTransactions = DbPaymentTransactionsToRegularTransactions(transactions, currentBlockNumber, account);
        } else {
            const transactionResponse: DataApiAccountPaments = await this.service.listAccountTransactionsFromDataApi(account, "XRP", offset);
            standardizedTransactions = DbApiPaymentTransactionsToRegularTransactions(transactionResponse.payments, currentBlockNumber, account);
        }

        return standardizedTransactions;
    }

    public async listAccountDeposits(req: any) {
        //TODO
        const account = req.params.account;
        const offset = (req.payload && req.payload.offset) ? req.payload.offset : 100;
        const currentBlockNumber = await this.service.getBlockNumber(); //to calculate confirmations
        let standardizedTransactions: Array<ITransaction> = [];

        if(this.service.hasOwnExplorer() && this.service.getMainAccount() === account) {
            const transactions: Array<IPaymentTransaction> = await this.service.listAccountDepositsFromDb(account, "XRP", offset);
            standardizedTransactions = DbPaymentTransactionsToRegularTransactions(transactions, currentBlockNumber, account);
        } else {
            const transactionResponse: DataApiAccountPaments = await this.service.listAccountDepositsFromDataApi(account, "XRP", offset);
            standardizedTransactions = DbApiPaymentTransactionsToRegularTransactions(transactionResponse.payments, currentBlockNumber, account);
        }
        return standardizedTransactions;
    }

    public async performWithdraw(req: any) {
        const receiver = req.payload.sendTo;
        const sender = req.payload.sendFrom;
        const amountInXrp = req.payload.amount + "";
        const password = req.payload.additionalParams && req.payload.additionalParams.password ? req.payload.additionalParams.password : null;
        const destinationTag = req.payload.additionalParams && req.payload.additionalParams.destinationTag ? req.payload.additionalParams.destinationTag : null;
        const priority = req.payload.additionalParams && req.payload.additionalParams.priority ? req.payload.additionalParams.priority : null;

        let options = {};
        if(destinationTag){
            options["destinationTag"] = +destinationTag;
        }
        if(priority) {
            options["priority"] = priority;
	}

        if(sender) {
            if(!password) {
                throw Boom.badRequest("If you specified sender account, you must to pass the additionalParams.password to unlock it.");
            }
            const txid = await this.service.sendXrp(sender, receiver, amountInXrp, password, options);
            return { txid: txid };
        } else {
            const txid = await this.service.sendXrpFromMainAccount(receiver, amountInXrp, options);
            return { txid: txid };
        }
    }

    public async generateAccount(req: any) {
        const account = await this.service.generateAccount();
        return { address: account.address, additionalInfo: { password: account.secret } };
    }

    public async isAddress(req: any) {
        const valid = this.service.isAddress(req.params.address);
        return new Promise<IAddressCheck>((resolve) => {
            resolve({ address: req.params.address, valid: valid });
        });
    }

    public async getGlobalBalance() {
        const account = this.service.getMainAccount();
        const balance = await this.service.getBalance(account);
        return {account: account, balance: balance};
    }
}
