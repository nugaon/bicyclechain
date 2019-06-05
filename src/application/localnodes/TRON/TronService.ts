import { environment } from "../../../environments/environment";
import { ILocalNodeConfig as Config } from "./ILocalNodeConfig";
import {default as rp } from "request-promise-native";
import { default as Boom } from "boom";
import { ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";
import { default as TronWeb } from 'tronweb';
import { sendedTransaction, trxTransaction, block, createdAccount, extendedTransaction } from "./ITron";
import { TronDB, IAccount } from "./TronDB";
import * as cron from "node-cron";
import { AsyncForeach } from "../../generic/AsyncForeach";

export class TronService {

    private config: Config;
    private client: TronWeb;
    private storage: TronDB;
    private lastBlockNumberAtCallback: number; //the last emitted block number at callback

    constructor() {
        this.config = environment.localnodeConfigs.TRON;
    }

    public async onInit() {
        //TODO
        //console.log(TronWeb);
        this.client = new TronWeb(this.config.clientConfig);
        this.storage = new TronDB();
        await this.storage.onInit();
        await this.checkMainAccountInDb();
        if (this.config.walletChangeCallback && this.config.walletChangeCallback.enabled) {
            await this.initCallback();
        }
        console.log("[TRX] TRON network service initialized");
    }

    public async onDestroy() { }

    public async getAccounts(): Promise<Array<string>> {
        const accounts = await this.storage.Account.find();
        return accounts.map(account => account.address);
    }

    public async getBalance(account: string): Promise<string> {
        try {
            const balanceInSun = await this.client.trx.getBalance(account)
            return this.client.fromSun(balanceInSun);
        } catch(e) {
            throw Boom.notFound("The account has not created yet (must sent minimum 0.1 TRX to it to create)");
        }
    }

    public async listAccountTransactions(
        account: string,
        options?: {
            page: number,
            offset: number
        }
    ): Promise<Array<ITransaction>> {
        const offset = (options && options.offset) ? options.offset : 100;
        const page = (options && options.page) ? options.page - 1 : 0;
        const sendedTransactions = await this.client.trx.getTransactionsFromAddress(account, offset, page);
        const receivedTransactions = await this.client.trx.getTransactionsToAddress(account, offset, page);
        const mergedTransactions = {...sendedTransactions, ...receivedTransactions};

        console.log(`transactions`, mergedTransactions);
        return null;
    }

    public async getTransaction(txid: string): Promise<ITransaction> {
        const nativeTransaction = await this.getNativeTransaction(txid);

        const senderAddress = this.client.address.fromHex(nativeTransaction.raw_data.contract[0].parameter.value.owner_address);
        const receiverAddress = this.client.address.fromHex(nativeTransaction.raw_data.contract[0].parameter.value.to_address);
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

    public async getNativeTransaction(txid: string): Promise<extendedTransaction> {
        try {
            let transaction = await this.client.trx.getTransaction(txid);
            const transactionAdditionalInfo = await this.client.trx.getTransactionInfo(txid);
            return {...transaction, ...transactionAdditionalInfo};
        } catch(e) {
            throw Boom.notFound(e);
        }
    }

    public async getAccountTransaction(account: string, txid: string): Promise<ITransaction> {
        const nativeTransaction = await this.getNativeTransaction(txid);

        const senderAddress = this.client.address.fromHex(nativeTransaction.raw_data.contract[0].parameter.value.owner_address);
        const receiverAddress = this.client.address.fromHex(nativeTransaction.raw_data.contract[0].parameter.value.to_address);

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

    public async getBlockNumber(): Promise<number> {
        const currentBlock: block = await this.client.trx.getCurrentBlock();
        return currentBlock.block_header.raw_data.number;
    }

    public async generateAccount(): Promise<createdAccount> {
        const account: createdAccount = await this.client.createAccount();
        const accountInstance = new this.storage.Account({
            address: account.address.base58,
            addressInHex: account.address.hex,
            privateKey: account.privateKey,
            publicKey: account.publicKey
        });
        await accountInstance.save();
        return account;
    }

    public isAddress(address: string) {
        return this.client.isAddress(address);
    }

    public getMainAccount() {
        return this.config.mainAccount.address;
    }

    public async sendTrxFromMainAccount(to: string, trxAmount: string, options?: any): Promise<sendedTransaction> {
        const unsignedTx = await this.client.transactionBuilder.sendTrx(to, this.client.toSun(trxAmount), this.getMainAccount());
        const signedTx = await this.client.trx.sign(unsignedTx, this.config.mainAccount.privateKey);
        return this.client.trx.sendRawTransaction(signedTx);
    }

    /**
    * Send Trx from an account that the bicyclechain owns or use passed private key to withdraw
    *
    * @param  {string} from sender address
    * @param  {string} to destination address
    * @param  {string} trxAmount
    * @param  {string} senderPrivateKey private key of the sender, optional
    * @return {sendedTransaction} object of the sended transaction
    */
    public async sendTrxFromOwnedAccount(from: string, to: string, trxAmount: string, senderPrivateKey: string = null): Promise<sendedTransaction> {
        const unsignedTx = await this.client.transactionBuilder.sendTrx(to, this.client.toSun(trxAmount), from);
        const accountPrivateKey = senderPrivateKey ? senderPrivateKey : await this.getOwnedAccountPrivateKey(from);
        if(!accountPrivateKey) {
            throw Boom.unauthorized(`The application doesn't have private key for ${from} account. Please pass private key for withdraw.`);
        }
        const signedTx = await this.client.trx.sign(unsignedTx, accountPrivateKey);
        return this.client.trx.sendRawTransaction(signedTx);
    }

    private async getOwnedAccountPrivateKey(address: string): Promise<string> {
        const account = await this.getOwnedAccount(address);
        return account.privateKey;
    }

    private async getOwnedAccount(address: string): Promise<IAccount> {
        const account = await this.storage.Account.findOne({address: address});
        return account;
    }

    private async checkMainAccountInDb() {
        const mainAccountInDb = await this.storage.Account.findOne({address: this.getMainAccount()});
        if(!mainAccountInDb) {
            const mainAccountInstance = new this.storage.Account({
                address: this.getMainAccount(),
                addressInHex: this.client.toHex(this.getMainAccount()),
                privateKey: this.config.mainAccount.privateKey
            });
            await mainAccountInstance.save();
            console.log("[TRX] Main account is saved into MongoDB");
        }
    }

    /**
    * check the transaction was a real normal trx transaction
    *
    * @param  {trxTransaction} transaction native transaction object
    * @return {boolean} true if it was a normal trx transaction
    */
    private trxTransactionValidation(transaction: trxTransaction): boolean {
        for (const returning of transaction.ret) {
            if(returning.contractRet !== "SUCCESS") {
                return false;
            }
        }
        for (const contract of transaction.raw_data.contract) {
            if(contract.type !== "TransferContract" || contract.parameter.value.asset_name) {
                return false;
            }
        }
        return true;
    }

    private async nativeTransactionToRegularTransaction(nativeTransaction: extendedTransaction, category: "SEND" | "RECEIVE" | "OTHER"): Promise <ITransaction> {
        if(!this.trxTransactionValidation(nativeTransaction)) {
            throw Boom.illegal(`Transaction ${nativeTransaction.txID} not a valid TRX transaction`);
        }
        const valueInTrx = this.client.fromSun(nativeTransaction.raw_data.contract[0].parameter.value.amount);
        const senderAddress = this.client.address.fromHex(nativeTransaction.raw_data.contract[0].parameter.value.owner_address);
        const receiverAddress = this.client.address.fromHex(nativeTransaction.raw_data.contract[0].parameter.value.to_address);
        const currentBlockNumber = await this.getBlockNumber();
        const txBlockNumber = nativeTransaction.blockNumber;

        return {
            txid: nativeTransaction.txID,
            amount: valueInTrx + "",
            confirmations: currentBlockNumber - txBlockNumber,
            category: category,
            from: senderAddress,
            to: receiverAddress
        }
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
                let loopBlock: block = await this.client.trx.getCurrentBlock();
                let loopBlockNumber = loopBlock.block_header.raw_data.number;
                const recentBlockNumber = loopBlockNumber; //after the transactions check this value overwrite the lastBlockNumberAtCallback value
                while(loopBlockNumber > this.lastBlockNumberAtCallback) {
                    console.log("loopBlockNumber", loopBlockNumber);

                    //gather txids which affected the application's accounts.
                    const ownTxIds: Array<string> = []; //txids of the transactions which affect the accounts that the application handles
                    if(loopBlock.transactions) {
                        loopBlock.transactions.forEach(transaction => {
                            const transactionAddresses = this.getAddressesInTrxTransaction(transaction);
                            accounts.forEach(account => {
                                if(transactionAddresses.includes(account)) {
                                    ownTxIds.push(transaction.txID);
                                }
                            });
                        });

                        //make callback request
                        ownTxIds.forEach(txid => {
                            console.log(`[TRX] transaction happened: ${txid}`);
                            rp({
                                method: "GET",
                                uri: this.config.walletChangeCallback.callbackUri + "/trx/" + txid,
                                json: true
                            });
                        });
                    }

                    //prepare next loop block object
                    loopBlock = await this.client.trx.getBlockByNumber(--loopBlockNumber);
                }
                this.lastBlockNumberAtCallback = recentBlockNumber;
            } catch (e) {
                console.log("[TRX] ERROR: callback error", e);
            }
        });
    }

    /**
    * Helper method to retrive addresses from a trx transaction
    *
    * @param  {trxTransaction} transaction native transaction object
    * @return {Array<string>} the used addresses in the transaction
    */
    private getAddressesInTrxTransaction(transaction: trxTransaction): Array<string> {
        const addresses: Array<string> = [];
        transaction.raw_data.contract.forEach(contractData => {
            addresses.push(this.client.address.fromHex(contractData.parameter.value.to_address));
            addresses.push(this.client.address.fromHex(contractData.parameter.value.owner_address));
        });
        return addresses;
    }
}
