import { default as Boom } from "boom";
import { EosioService } from "../EosioService";
import { ICryptoCurrency, ITransaction, IAddressCheck } from "../../../cryptoCurrencies/ICryptoCurrency";

export class EosioTokenController implements ICryptoCurrency {

    private service: EosioService;
    private currency: string;
    private contract: string;
    private route: string;

    public constructor(eosioService: EosioService, currency: string, contract: string, route: string) {
        this.service = eosioService;
        this.currency = currency;
        this.contract = contract;
        this.route = route;
        console.log(`[${currency}] EOS token initialized on route '${route}' uses ${contract} contract`);
    }

    public async onInit() {

    }

    public async onDestroy() { }

    public getCurrency() {
        return this.currency;
    }

    public getRoute() {
        return this.route;
    }

    public async getAccounts() {
        return this.service.getAccounts();
    }

    public async getAccountBalance(req: any) {
        const account = req.params.account;

        try {
            const balance = await this.service.getBalance(account, this.currency, this.contract);
            return {"account": account, "balance": balance};
        } catch (e) {
            throw Boom.notFound(`Account ${account} has not got balance`);
        }
    }

    public async getGlobalBalance() {
        const account = this.service.getMainAccount();
        const balance = await this.service.getBalance(account, this.currency, this.contract);
        return {account: account, balance: balance};
    }

    public async listAccountTransactions(req: any) {
        const account = req.params.account;
        const page = (req.payload && req.payload.page) ? req.payload.page : 0;
        const offset = (req.payload && req.payload.offset) ? req.payload.offset : 20;
        const contract = this.contract;
        const currency = this.currency;

        let standardizedTransactions: Array<ITransaction> = await this.service.listAccountTransactions(
            account,
            {
                offset: offset,
                page: page,
                contract: contract,
                currency: currency
            }
        );

        return standardizedTransactions;
    }

    public async getTransaction(txid: string) {
        return this.service.getTransaction(txid, this.currency);
    }

    public async getNativeTransaction(txid: string) {
        return this.service.getNativeTransaction(txid);
    }

    public async getAccountTransaction(req: any) {
        const account = req.params.account;
        const txid = req.params.txid;
        return this.service.getAccountTransaction(account, txid, this.currency);
    }

    public async listAccountDeposits(req: any) {
        const account = req.params.account;
        const page = (req.payload && req.payload.page) ? req.payload.page : 0;
        const offset = (req.payload && req.payload.offset) ? req.payload.offset : 20;
        const contract = this.contract;
        const currency = this.currency;

        let standardizedTransactions: Array<ITransaction> = await this.service.listAccountDeposits(
            account,
            {
                offset: offset,
                page: page,
                contract: contract,
                currency: currency
            }
        );

        return standardizedTransactions;
    }

    public async performWithdraw(req: any) {
        if (!req.payload.additionalParams || !req.payload.additionalParams.memo) {
            throw Boom.badRequest("Omitted additionalParams.memo at withdrawal.");
        }

        const receiver = req.payload.sendTo;
        const sender = req.payload.sendFrom ? req.payload.sendFrom : this.service.getMainAccount();
        const amount = req.payload.amount + "";
        const memo = req.payload.additionalParams.memo;

        const txid = await this.service.transfer(sender, receiver, amount, memo, this.currency, this.contract);
        return {
            txid: txid
        };
    }

    public async generateAccount(req: any) {
        if(!req.payload.additionalParams || !req.payload.additionalParams.account) {
            throw Boom.badRequest("Omitted 'additionalParams.account' data from payload for account generation");
        }
        const accountName = req.payload.additionalParams.account;
        const pubKey = req.payload.additionalParams.pubKey ? req.payload.additionalParams.pubKey : null;

        const transaction = await this.service.generateAccount(accountName, pubKey);
        console.log("Account generated", transaction);
        return { address: accountName };
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
