import { default as Boom } from "boom";
import { IUniqueEndpoints } from "../../generic/IUniqueEndpoints";
import { ICryptoCurrency, ITransaction, IAddressCheck } from "../../cryptoCurrencies/ICryptoCurrency";
import { EosioService } from "./EosioService";

export class EosioController implements ICryptoCurrency {
    private service: EosioService;

    public async onInit() {
        this.service = new EosioService();
        this.service.onInit();
    }

    public async onDestroy() { }

    public async getAccounts() {
        return this.service.getAccounts();
    }

    public async getAccountBalance(req: any) {
        const account = req.params.account;

        try {
            const balance = await this.service.getBalance(account);
            return {"account": account, "balance": balance};
        } catch (e) {
            throw Boom.notFound(`Account ${account} has not got balance`);
        }
    }

    public async getGlobalBalance() {
        const account = this.service.getMainAccount();
        const balance = await this.service.getBalance(account);
        return {account: account, balance: balance};
    }

    public async listAccountTransactions(req: any) {
        const account = req.params.account;
        const page = (req.payload && req.payload.page) ? req.payload.page : 1;
        const offset = (req.payload && req.payload.offset) ? req.payload.offset : 100;
        const currentBlockNumber = await this.service.getBlockNumber(); //to calculate confirmations
        let standardizedTransactions: Array<ITransaction> = [];

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

    public async listAccountDeposits(req: any) {
        const account = req.params.account;
        const page = (req.payload && req.payload.page) ? req.payload.page : 1;
        const offset = (req.payload && req.payload.offset) ? req.payload.offset : 100;

        const currentBlockNumber = await this.service.getBlockNumber(); //to calculate confirmations
        let standardizedTransactions: Array<ITransaction> = [];

        return standardizedTransactions;
    }

    public async performWithdraw(req: any) {
        if (!req.payload.sendTo || !req.payload.amount) {
            throw Boom.badRequest("Bad parameters");
        }

        const receiver = req.payload.sendTo;
        const sender = req.payload.sendFrom;
        const amountInEther = req.payload.amount + "";
        const password = req.payload.additionalParams && req.payload.additionalParams.password ? req.payload.additionalParams.password : null;
        const gas = req.payload.additionalParams && req.payload.additionalParams.gas ? req.payload.additionalParams.gas : null;
        const options = {
            priority: req.payload.priority,
            gas: gas
        };

        return null;
    }

    public async generateAccount(req: any) {
        const address = await this.service.generateAccount();
        return { address: address };
    }

    public async isAddress(req: any) {
        if (!req.params.address) {
            throw Boom.badRequest("Bad parameters, req.params.address omitted");
        }
        const valid = this.service.isAddress(req.params.address);
        return new Promise<IAddressCheck>((resolve) => {
            resolve({ address: req.params.address, valid: valid });
        });
    }
}
