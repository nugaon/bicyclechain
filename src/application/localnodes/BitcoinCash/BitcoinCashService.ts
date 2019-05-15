import { default as Client } from "bitcoin-core";
import { BitcoinService } from "../Bitcoin/BitcoinService";
import { IBitcoinCashTransaction, IBitcoinCashTransactionNative, IUnspentTransaction } from "./IBitcoinCashResponses";
import { ILocalNodeConfig } from "./ILocalNodeConfig";
import { ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";

export class BitcoinCashService {

    private bitcoinService: BitcoinService;
    private bitcoinClient: Client;

    constructor(config: ILocalNodeConfig) {

        if (config === undefined) {
            throw new Error("The BitcoinCash localnode configuration not set.");
        }

        this.bitcoinClient = new Client(config.rpcClient);
        this.bitcoinService = new BitcoinService(config, this.bitcoinClient, false);

        console.log(`The BitcoinCash Service initialized.`);
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
    ): Promise<Array<IBitcoinCashTransaction>> {
        return this.bitcoinService.listAccountTransactions(account, options);
    }

    public async getTransaction(id: string): Promise<ITransaction> {
        return this.bitcoinService.getTransaction(id);
    }

    public async getAccountTransaction(account: string, txid: string): Promise<ITransaction> {
        return this.bitcoinService.getAccountTransaction(account, txid);
    }

    public async getNativeTransaction(id: string): Promise<IBitcoinCashTransactionNative> {
        return this.bitcoinService.getNativeTransaction(id);
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

    public async performWithdraw(
        sendFrom: string,
        sendTo: string,
        amount: string,
        options?: {
            priority?: "HIGH" | "MEDIUM" | "LOW",
            subFee?: boolean,
            changeAddress?: string
        }) {
        return this.bitcoinService.performWithdraw(sendFrom, sendTo, amount, options);
    }
}
