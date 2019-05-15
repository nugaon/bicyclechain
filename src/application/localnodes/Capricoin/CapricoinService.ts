import { default as Client } from "bitcoin-core";
import { BitcoinService } from "../Bitcoin/BitcoinService";
import { ICapricoinTransaction, ICapricoinTransactionNative, IUnspentTransaction } from "./ICapricoinResponses";
import { ILocalNodeConfig } from "./ILocalNodeConfig";
import { default as Boom } from "boom";
import { ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";

export class CapricoinService {

    private bitcoinService: BitcoinService;
    private bitcoinClient: Client;

    constructor(config: ILocalNodeConfig) {

        if (config === undefined) {
            throw new Error("The Capricoin localnode configuration not set.");
        }

        this.bitcoinClient = new Client(config.rpcClient);
        this.bitcoinService = new BitcoinService(config, this.bitcoinClient);

        console.log(`The CapricoinService initialized.`);
    }

    public async getAccounts(): Promise<Array<string>> {
        return this.bitcoinService.getAccounts();
    }

    public async getBalance(addressOrAccount: string, isAccount: boolean) {
        return this.bitcoinService.getBalance(addressOrAccount, isAccount);
    }

    public async getGlobalBalance(): Promise<string> {
        return this.bitcoinService.getGlobalBalance();
    }

    public async getMainAccount(): Promise<string> {
        return this.bitcoinService.getMainAccount();
    }

    public async listAccountTransactions(
        account: string,
        options?: {
            page?: number, offset?: number
        }
    ): Promise<Array<ICapricoinTransaction>> {
        return this.bitcoinService.listAccountTransactions(account, options);
    }

    public async getTransaction(id: string): Promise<ITransaction> {
        const transaction = await this.getNativeTransaction(id);
        let category: "SEND" | "RECEIVE" | "OTHER";
        if(+transaction.amount > 0) {
            category = "RECEIVE";
        } else if (+transaction.amount < 0) {
            category = "SEND";
        } else {
            category = "OTHER";
        }
        return this.bitcoinService.nativeTransactionToRegularTransaction(transaction, category);
    }

    public async getNativeTransaction(id: string): Promise<ICapricoinTransactionNative> {
        try {
            var resp = await this.bitcoinClient.getTransaction(id);
            return resp;
        }
        catch (e) {
            //For Capricoin result
            if (e.text) {
                let response = JSON.parse(e.text);
                return (response.result);

            }
            throw Boom.notAcceptable(e.message);
        }
    }

    public async getAccountTransaction(addressOrAccount: string, txid: string): Promise<ITransaction> {
        try {
            const transaction = await this.getNativeTransaction(txid);
            let addressGiven: boolean = await this.isAddress(addressOrAccount);
            //category decision
            let category: "SEND" | "RECEIVE" | "OTHER";
            if(+transaction.amount > 0) {
                category = "RECEIVE";
            } else if (+transaction.amount < 0) {
                category = "SEND";
            } else {
                for (const detail of transaction.details) {
                    if((addressGiven && detail.address.toLowerCase() === addressOrAccount.toLowerCase())
                    || detail.account === addressOrAccount) {
                        switch (detail.category) {
                            case "send":
                                category = "SEND";
                                break;
                            case "receive":
                                category = "RECEIVE";
                                break;
                        }
                    }
                }
            }
            return this.bitcoinService.nativeTransactionToRegularTransaction(transaction, category);
        }
        catch (e) {
            throw Boom.notAcceptable(e.message);
        }
    }

    public async listAccountDeposits(account: string, page: number = 1, offset: number = 100) {
        return this.bitcoinService.listAccountDeposits(account, page, offset);
    }

    public async generateAccount(account: string) {
        return this.bitcoinService.generateAccount(account);
    }

    public async isAddress(address: any) {
        return this.bitcoinService.isAddress(address);
    }

    public async listUnspentTransactions(addressOrAccount: string = null, account: boolean = false): Promise<Array<IUnspentTransaction>> {
        return this.bitcoinService.listUnspentTransactions(addressOrAccount, account);
    }

    /**
     * Perform withdraw to an address use by all unspent transactions.
     *
     * @param  {string} sendFrom Address
     * @param  {string} sendTo amount of cpc
     * @param  {string} amount fee in cpc for the transaction
     * @param  {Object} options additional parameters that concerns to the withdraw
     * @return {string} Returns the transaction id.
     */
    public async performWithdraw(
        sendFrom: string | null,
        sendTo: string,
        amount: string) {
        //CPC not supports any options for changeaddress, sendFrom and subfee. Always send with the lowest fee though.
        if (!sendFrom) {
            try {
                let resp = await this.bitcoinClient.sendToAddress(sendTo, +amount);
                return (resp);
            }
            catch (e) {
                throw Boom.notAcceptable(e.message);
            }
        } else {
            throw Boom.notAcceptable("CPC not supports sendFrom at withdraw");
        }
    }
}
