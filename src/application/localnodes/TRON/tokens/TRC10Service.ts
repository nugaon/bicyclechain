import { default as rp } from "request-promise-native";
import { environment } from "../../../../environments/environment";
import { TronDB, IAccount } from "../TronDB";
import { TronService } from "../TronService";
import { ILocalNodeConfig as Config} from "../ILocalNodeConfig";
import * as cron from "node-cron";
import { ITransaction } from "../../../cryptoCurrencies/ICryptoCurrency";
import { sendedTransaction, trxTransaction, block, accountData, extendedTransaction } from "../ITron";
import { TRC10Token, tokenCreateOptions } from "./ITRC10";
import { default as Boom } from "boom";
import { default as TronWeb } from 'tronweb';

export class TRC10Service {

    private storage: TronDB;
    private tokenID: string;
    private tronService: TronService;
    private tokenName: string;
    private tokenSymbol: string;
    private tokenInstance: TRC10Token;
    private routeName: string;
    private config: Config;
    private lastBlockNumberAtCallback: number; //the last emitted block number at callback
    private client: TronWeb;

    constructor(tronService: TronService, storage: TronDB, client: TronWeb, tokenID: string, routeName: string) {
        this.tronService = tronService;
        this.storage = storage;
        this.routeName = routeName;
        this.config = environment.localnodeConfigs.TRON;
        this.tokenID = tokenID;
        this.client = client;
    }

    public async onInit() {
        try {
            this.tokenInstance = await this.client.trx.getTokenByID(this.tokenID);

            this.tokenName = this.tokenInstance.name;
            this.tokenSymbol = this.tokenInstance.abbr;
            console.log(`The ${this.tokenName}(${this.tokenSymbol}) TRC10 token initialized.` +
            `\n[${this.tokenSymbol}] Token ID: ${this.tokenInstance.id}` +
            `\n[${this.tokenSymbol}] Webpage: ${this.tokenInstance.url}` +
            `\n[${this.tokenSymbol}] Lifetime: ${new Date(this.tokenInstance.start_time)}- ${new Date(this.tokenInstance.end_time)}` +
            `\n[${this.tokenSymbol}] Description: ${this.tokenInstance.description}`);

            if(this.config.walletChangeCallback && this.config.walletChangeCallback.enabled) {
                console.log(`[${this.tokenSymbol}] send callbacks to ${this.config.walletChangeCallback.callbackUri} with ${this.routeName} symbol and cron ${this.config.walletChangeCallback.cron.interval}`);
                await this.initCallback();
            }
        } catch(e) {
            throw new Error(e);
        }

    }

    public async getAccounts() {
        return this.tronService.getAccounts();
    }

    public getMainAccount() {
        return this.tronService.getMainAccount();
    }

    public async generateAccount() {
        return this.tronService.generateAccount();
    }

    public isAddress(address: string) {
        return this.tronService.isAddress(address);
    }

    public async getTransaction(txid: string): Promise<ITransaction> {
        const nativeTransaction = await this.getNativeTransaction(txid);

        const senderAddress = this.tronService.getSenderOfTheTransaction(nativeTransaction);
        const receiverAddress = this.tronService.getReceiverOfTheTransaction(nativeTransaction);
        const senderAccountInstance = await this.storage.Account.findOne({address: senderAddress});
        const receiverAccountInstance = await this.storage.Account.findOne({address: receiverAddress});

        let category: "SEND" | "RECEIVE" | "OTHER";
        if(senderAccountInstance && receiverAccountInstance) {
            category = "OTHER";
        }
        else if(senderAccountInstance) {
            category = "SEND";
        } else if (receiverAccountInstance){
            category = "RECEIVE";
        } else {
            category = "OTHER";
        }

        return this.nativeTransactionToRegularTransaction(nativeTransaction, category);
    }

    /**
    * Return the native transaction of the token.
    *
    * @param  {trxTransaction} transaction native transaction object
    * @return {extendedTransaction} native transaction of the token
    */
    public async getNativeTransaction(txid: string): Promise<extendedTransaction> {
        const transaction = await this.tronService.getNativeTransaction(txid);
        if(!this.tokenTransactionValidation(transaction)) {
            throw Boom.badData(`The transaction not an ${this.tokenName} token transaction`);
        }
        return transaction;
    }

    public async getAccountTransaction(account: string, txid: string): Promise<ITransaction> {
        const nativeTransaction = await this.getNativeTransaction(txid);

        const senderAddress = this.tronService.getSenderOfTheTransaction(nativeTransaction);
        const receiverAddress = this.tronService.getReceiverOfTheTransaction(nativeTransaction);

        let category: "SEND" | "RECEIVE" | "OTHER";
        if(senderAddress.toLowerCase() === account.toLowerCase() && receiverAddress.toLowerCase() === account.toLowerCase()) {
            category = "OTHER";
        }
        else if(senderAddress.toLowerCase() === account.toLowerCase()) {
            category = "SEND";
        } else if (receiverAddress.toLowerCase() === account.toLowerCase()){
            category = "RECEIVE";
        } else {
            category = "OTHER";
        }

        return this.nativeTransactionToRegularTransaction(nativeTransaction, category);
    }

    public async getAccountBalance(account: string): Promise<number> {
        const accountData: accountData = await this.client.trx.getAccount(account);
        accountData.asset.forEach(asset => {
            if(asset.key === this.tokenID) {
                return asset.value;
            }
        });
        accountData.assetV2.forEach(asset => {
            if(asset.key === this.tokenID) {
                return asset.value;
            }
        });
        return 0;
    }

    public async sendTokenFromMainAccount(to: string, amount: string): Promise<sendedTransaction> {
        return this.client.trx.sendToken(to, amount, this.tokenID, this.config.mainAccount.privateKey);
    }

    /**
    * Send Trx from an account that the bicyclechain owns or use passed private key to withdraw
    *
    * @param  {string} from sender address
    * @param  {string} to destination address
    * @param  {string} amount
    * @param  {string} senderPrivateKey private key of the sender, optional
    * @return {sendedTransaction} object of the sended transaction
    */
    public async sendTokenFromOwnedAccount(from: string, to: string, amount: string, senderPrivateKey: string = null): Promise<sendedTransaction> {
        const accountPrivateKey = senderPrivateKey ? senderPrivateKey : await this.getOwnedAccountPrivateKey(from);
        if(!accountPrivateKey) {
            throw Boom.unauthorized(`The application doesn't have private key for ${from} account. Please pass private key for withdraw.`);
        }
        return this.client.trx.sendToken(to, amount, this.tokenID, accountPrivateKey);
    }

    public hasOwnExplorer(): boolean {
        return this.storage && environment.localnodeConfigs.Ethereum.mongoDB.saveContractTransactions;
    }

    public async getBlockNumber(): Promise<number> {
        return await this.tronService.getBlockNumber();
    }

    /**
    * check the transaction was a real normal trx transaction
    *
    * @param  {trxTransaction} transaction native transaction object
    * @return {boolean} true if it was a normal trx transaction
    */
    private tokenTransactionValidation(transaction: trxTransaction): boolean {
        for (const returning of transaction.ret) {
            if(returning.contractRet !== "SUCCESS") {
                return false;
            }
        }
        for (const contract of transaction.raw_data.contract) {
            if(contract.type !== "TransferAssetContract" || contract.parameter.value.asset_name + "" !== this.tokenID) {
                return false;
            }
        }
        return true;
    }

    private async nativeTransactionToRegularTransaction(nativeTransaction: extendedTransaction, category: "SEND" | "RECEIVE" | "OTHER"): Promise <ITransaction> {
        const value = nativeTransaction.raw_data.contract[0].parameter.value.amount;
        const senderAddress = this.tronService.getSenderOfTheTransaction(nativeTransaction);
        const receiverAddress = this.tronService.getReceiverOfTheTransaction(nativeTransaction);
        const currentBlockNumber = await this.getBlockNumber();
        const txBlockNumber = nativeTransaction.blockNumber;

        return {
            txid: nativeTransaction.txID,
            amount: value + "",
            confirmations: currentBlockNumber - txBlockNumber,
            category: category,
            from: senderAddress,
            to: receiverAddress
        }
    }

    private async getOwnedAccountPrivateKey(address: string): Promise<string> {
        const account = await this.getOwnedAccount(address);
        return account.privateKey;
    }

    private async getOwnedAccount(address: string): Promise<IAccount> {
        const account = await this.storage.Account.findOne({address: address});
        return account;
    }

    private async initCallback() {
        if(this.config.walletChangeCallback.cron.startBlockNumber) {
            this.lastBlockNumberAtCallback = this.config.walletChangeCallback.cron.startBlockNumber;
        } else {
            this.lastBlockNumberAtCallback = await this.getBlockNumber();
        }
        cron.schedule(this.config.walletChangeCallback.cron.interval, async () => {
            try {
                const accounts = await this.getAccounts();
                let loopBlock: block = await this.tronService.getBlockByNumber();
                let loopBlockNumber = loopBlock.block_header.raw_data.number;
                const recentBlockNumber = loopBlockNumber; //after the transactions check this value overwrite the lastBlockNumberAtCallback value
                while(loopBlockNumber > this.lastBlockNumberAtCallback) {
                    //gather txids which affected the application's accounts.
                    const ownTxIds: Array<string> = []; //txids of the transactions which affect the accounts that the application handles
                    if(loopBlock.transactions) {
                        loopBlock.transactions.forEach(transaction => {
                            const transactionAddresses = this.tronService.getAddressesInTrxTransaction(transaction);
                            accounts.forEach(account => {
                                if(transactionAddresses.includes(account)) {
                                    ownTxIds.push(transaction.txID);
                                }
                            });
                        });

                        //make callback request
                        ownTxIds.forEach(txid => {
                            console.log(`[${this.tokenSymbol}] transaction happened: ${txid}`);
                            rp({
                                method: "GET",
                                uri: this.config.walletChangeCallback.callbackUri + "/" + this.routeName + "/" + txid,
                                json: true
                            });
                        });
                    }

                    //prepare next loop block object
                    loopBlock = await this.tronService.getBlockByNumber(--loopBlockNumber);
                }
                this.lastBlockNumberAtCallback = recentBlockNumber;
            } catch (e) {
                console.log(`[${this.tokenSymbol}] ERROR: callback error`, e);
            }
        });
    }
}
