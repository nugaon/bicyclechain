import { ICryptoCurrency, ITransaction, ITokenTransporter } from "../../cryptoCurrencies/ICryptoCurrency";
import { TronService } from "./TronService";
import { default as Boom } from "boom";
import { IUniqueEndpoints } from "../../generic/IUniqueEndpoints";
import { UniqueRoutes } from "./uniqueEndpoints/UniqueRoutes";

export class TronController implements ICryptoCurrency, ITokenTransporter, IUniqueEndpoints {

    private service: TronService;

    public async onInit() {
        this.service = new TronService();
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
        return this.service.getNativeTransaction(txid);
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
        const page = (req.payload && req.payload.page) ? req.payload.page : 1;
        let standardizedTransactions: Array<ITransaction> = [];
        const transactions = await this.service.listAccountTransactions(account, {offset: offset, page: page});
        // const currentBlockNumber = await this.service.getBlockNumber(); //to calculate confirmations

        return standardizedTransactions;
    }

    public async listAccountDeposits(req: any) {
        //TODO
        const account = req.params.account;
        const offset = (req.payload && req.payload.offset) ? req.payload.offset : 100;
        const page = (req.payload && req.payload.page) ? req.payload.page : 1;
        let standardizedTransactions: Array<ITransaction> = [];

        return standardizedTransactions;
    }

    public async performWithdraw(req: any) {
        const receiver = req.payload.sendTo;
        const sender = req.payload.sendFrom;
        const amountInTrx = req.payload.amount + "";
        const privateKey = req.payload.additionalParams && req.payload.additionalParams.privateKey ? req.payload.additionalParams.privateKey : null;
        //const priority = req.payload.additionalParams && req.payload.additionalParams.priority ? req.payload.additionalParams.priority : null;

        let options = {};

        if(!sender) {
            const sended = await this.service.sendTrxFromMainAccount(receiver, amountInTrx, options);
            return { txid: sended.transaction.txID };
        } else {
            const sended = await this.service.sendTrxFromOwnedAccount(sender, receiver, amountInTrx, privateKey)
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
        const valid: boolean = await this.service.isAddress(req.params.address);
        return {
            valid: valid,
            address: req.params.address
        }
    }

    public async getGlobalBalance() {
        const account = this.service.getMainAccount();
        const balance = await this.service.getBalance(account);
        return {account: account, balance: balance};
    }

    public initTokens() {
        return this.service.initTokens();
    }

    public getUniqueRouteInstance() {
        return new UniqueRoutes(this);
    }

    public async createTRC10Token(req: any) {
        let tokenIssueParams = req.payload;
        const additionalParams = req.payload.additionalParams;
        delete tokenIssueParams["additionalParams"];
        return this.service.tokenIssue(tokenIssueParams, additionalParams);
    }

    public async freezeBalance(req: any) {
        const amountInTrx = req.payload.amount;
        const duration = req.payload.duration;
        const resource = req.payload.resource;
        const ownerAddress = req.payload.ownerAddress ? req.payload.ownerAddress : this.service.getMainAccount();
        const receiverAddress = req.payload.receiverAddress ? req.payload.receiverAddress : ownerAddress;
        let options: any = {};
        if(req.payload.additionalParams && req.payload.additionalParams.callFromPrivateKey) {
            options.callFromPrivateKey = req.payload.additionalParams.callFromPrivateKey;
        }
        return this.service.freezeBalance(amountInTrx, duration, resource, ownerAddress, receiverAddress, options);
    }
}
