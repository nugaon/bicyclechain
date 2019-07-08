import { environment } from "../../../environments/environment";
import { ILocalNodeConfig as Config, ITokenConfig } from "./ILocalNodeConfig";
import {default as rp } from "request-promise-native";
import { default as Boom } from "boom";
import { ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";
import { default as TronWeb } from 'tronweb';
import { sendedTransaction, trxTransaction, block, createdAccount, extendedTransaction, trxTransactionInfo } from "./ITron";
import { TronDB, IAccount, TRC10Transfer, CommonTransaction, ICommonTransaction } from "./TronDB";
import * as cron from "node-cron";
import { ICryptoCurrency, ITokenRouteMapping } from "../../cryptoCurrencies/ICryptoCurrency";
import { AsyncForeach } from "../../generic/AsyncForeach";
import { TRC20Controller } from "./tokens/TRC20Controller";
import { TRC10Controller } from "./tokens/TRC10Controller";
import { tokenCreateOptions } from "./tokens/ITRC10";
import { BigNumber } from "bignumber.js";

export class TronService {

    private config: Config;
    private client: TronWeb;
    private storage: TronDB;
    private lastBlockNumberAtCallback: number; //the last emitted block number at callback
    private tokens: Array<ITokenConfig>;
    private saveGeneratedUsersIntoDb: boolean;
    private _callbackEnabled: boolean;
    private _observerNeededToEnvoke: boolean;
    private trc10ControllerInstances: Array<TRC10Controller>; //for walletChange events

    constructor() {
        this.config = environment.localnodeConfigs.TRON;

        if(this.config.withTokens) {
            this.tokens = this.config.withTokens;
        }
        this.saveGeneratedUsersIntoDb = this.config.mongoDB && this.config.mongoDB.saveGeneratedUsers ? true : false;

        this.trc10ControllerInstances = [];
    }

    get callbackEnabled(): boolean {
        return this._callbackEnabled;
    }

    get observerNeededToEnvoke(): boolean {
        return this._observerNeededToEnvoke;
    }

    public async onInit() {
        //TODO
        //console.log(TronWeb);
        this.client = new TronWeb(this.config.clientConfig);
        this.setDefaultPrivateKey();

        if(this.config.mongoDB) {
            this.storage = new TronDB();
            await this.storage.onInit();
            await this.checkMainAccountInDb();
        }

        if (this.config.walletChangeCallback && this.config.walletChangeCallback.enabled) {
            console.log(`[TRX] send callbacks to ${this.config.walletChangeCallback.callbackUri} with cron ${this.config.walletChangeCallback.cron.interval}`);
            this._callbackEnabled = true;
        } else {
            this._callbackEnabled = false;
        }
        if(this._callbackEnabled && this.hasOwnExplorer()) {
            await this.transactionsObserver();
            this._observerNeededToEnvoke = true;
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
        try {
            console.log("acc", account);
            console.log("offset", offset);
            console.log("page", page);
            const sendedTransactions = await this.client.trx.getTransactionsFromAddress(account, offset, 1);
            console.log("sendedtransactions", sendedTransactions);
            const receivedTransactions = await this.client.trx.getTransactionsToAddress(account, offset, page);
            const mergedTransactions = {...sendedTransactions, ...receivedTransactions};

            console.log(`transactions`, mergedTransactions);
            return null;
        } catch(e) {
            throw Boom.notAcceptable(e);
        }
    }

    public async getTransaction(txid: string): Promise<ITransaction> {
        const nativeTransaction = await this.getNativeTransaction(txid);

        const senderAddress = this.getSenderOfTheTransaction(nativeTransaction);
        const receiverAddress = this.getReceiverOfTheTransaction(nativeTransaction);
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

        const senderAddress = this.getSenderOfTheTransaction(nativeTransaction);
        const receiverAddress = this.getReceiverOfTheTransaction(nativeTransaction);

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

    /**
    * Get block by pass the sequence number of the block, or retrieve the last one
    *
    * @param  {number} height sender address
    * @return {sendedTransaction} object of the sended transaction
    */
    public async getBlockByNumber(height: number = -1): Promise<block> {
        if(height === -1) {
            return this.client.trx.getCurrentBlock();
        } else {
            return this.client.trx.getBlockByNumber(height);
        }
    }

    public async generateAccount(): Promise<createdAccount> {
        const account: createdAccount = await this.client.createAccount();
        if(this.saveGeneratedUsersIntoDb) {
            const accountInstance = new this.storage.Account({
                address: account.address.base58,
                addressInHex: account.address.hex,
                privateKey: account.privateKey,
                publicKey: account.publicKey
            });
            await accountInstance.save();
        }
        return account;
    }

    public isAddress(address: string): Promise<boolean> {
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

    public getSenderOfTheTransaction(nativeTransaction: extendedTransaction): string {
        return this.client.address.fromHex(nativeTransaction.raw_data.contract[0].parameter.value.owner_address);
    }

    public getReceiverOfTheTransaction(nativeTransaction: extendedTransaction): string {
        return this.client.address.fromHex(nativeTransaction.raw_data.contract[0].parameter.value.to_address);
    }

    /**
    * Helper method to retrive addresses from a trx transaction
    *
    * @param  {trxTransaction} transaction native transaction object
    * @return {Array<string>} the used addresses in the transaction
    */
    public getAddressesInTrxTransaction(transaction: trxTransaction): Array<string> {
        const addresses: Array<string> = [];
        transaction.raw_data.contract.forEach(contractData => {
            addresses.push(this.client.address.fromHex(contractData.parameter.value.to_address));
            addresses.push(this.client.address.fromHex(contractData.parameter.value.owner_address));
        });
        return addresses;
    }

    public async initTokens() {
        const tokenInstances: Array<ICryptoCurrency> = [];
        const routeMapping: Array<ITokenRouteMapping> = [];
        if(this.tokens) {
            await AsyncForeach(this.tokens, async (token): Promise<void> => {
                if(token.type === "TRC10") {
                    const tokenInstance = new TRC10Controller(this, this.storage, this.client, token.tokenID, token.route);
                    await tokenInstance.onInit();
                    const refereinceId = `TOKEN-TRON-TRC10-${token.route}`;
                    routeMapping.push({
                        route: token.route,
                        referenceId: refereinceId
                    });
                    tokenInstances[refereinceId] = tokenInstance;

                    //we also save the TRC10 token instances into this class field
                    this.trc10ControllerInstances.push(tokenInstance);
                } else if (token.type === "TRC20") {
                    const tokenInstance = new TRC20Controller(this, this.storage, this.client, token.contractAddress, token.route);
                    await tokenInstance.onInit();
                    const refereinceId = `TOKEN-TRON-TRC20-${token.route}`;
                    routeMapping.push({
                        route: token.route,
                        referenceId: refereinceId
                    });
                    tokenInstances[refereinceId] = tokenInstance;
                }
            });
        }
        return {
            routeMapping: routeMapping,
            instances: tokenInstances
        };
    }

    public setPrivateKey(newPrivateKey: string) {
        this.client.setPrivateKey(newPrivateKey);
    }

    public hasOwnExplorer() {
        return !!this.config.mongoDB;
    }

    public async tokenIssue(
        tokenIssueParams: tokenCreateOptions,
        additionalParams? : {
            callFromPrivateKey?: string
        }
    ) {
        tokenIssueParams.saleStart = tokenIssueParams.saleStart ? tokenIssueParams.saleStart : Date.now() + 10000;
        tokenIssueParams.saleEnd = tokenIssueParams.saleEnd ? tokenIssueParams.saleEnd : tokenIssueParams.saleStart + 60000;
        if(tokenIssueParams.precision) {
            tokenIssueParams.totalSupply = new BigNumber(tokenIssueParams.totalSupply).multipliedBy(new BigNumber(10).pow(tokenIssueParams.precision)).integerValue().toNumber();
        }
        console.log(`[TRX] token issue:`, tokenIssueParams);

        try {
            const privateKey = additionalParams && additionalParams.callFromPrivateKey ? additionalParams.callFromPrivateKey : this.config.mainAccount.privateKey;
            const unsignedTx = await this.client.transactionBuilder.createToken({... tokenIssueParams}, this.client.address.fromPrivateKey(privateKey));
            const signedTx = await this.client.trx.sign(unsignedTx, privateKey);
            console.log(`token creation`, signedTx);
            return this.client.trx.sendRawTransaction(signedTx);
        } catch(e) {
            throw Boom.notAcceptable(e);
        }
    }

    public async freezeBalance(
        amountInTrx: number,
        duration: number,
        resource:  "BANDWIDTH" | "ENERGY",
        ownerAddress: string,
        receiverAddress: string,
        permissionId: number,
        options?: {
            callFromPrivateKey?: string
        }) {
        try {
            const accountPrivateKey = options && options.callFromPrivateKey ? options.callFromPrivateKey : await this.getOwnedAccountPrivateKey(ownerAddress);
            this.setPrivateKey(accountPrivateKey);
            const unsignedTx = this.client.transactionBuilder.freezeBalance(
                this.client.toSun(amountInTrx), duration, resource, this.client.address.toHex(ownerAddress), this.client.address.toHex(receiverAddress), permissionId);
            const signedTx = await this.client.trx.sign(unsignedTx, accountPrivateKey);
            const txId = await this.client.trx.sendRawTransaction(signedTx);
            this.setDefaultPrivateKey();
            return txId;
        } catch(e) {
            throw Boom.notAcceptable(e);
        }
    }

    public setDefaultPrivateKey() {
        this.client.setPrivateKey(this.config.mainAccount.privateKey);
    }

    public async listAccountTransactionsFromDb(account: string, page: number = 1, offset: number = 100): Promise<Array<ICommonTransaction>> {
        const accountInHex = this.client.address.toHex(account);

        const transactions: Array<ICommonTransaction> = await this.storage.CommonTransaction.find({
                $or:[ { from: accountInHex }, { to: accountInHex } ]
            })
            .sort({ timestamp: -1 })
            .skip((page - 1) * offset).limit(offset);

        for(let transaction of transactions) {
            //if this is the first query for these transactions we should append the blocknumber also
            if(!transaction.blockNumber) {
                const transactionReceipt: trxTransactionInfo = await this.client.trx.getTransactionInfo(transaction.transactionHash);
                if(transactionReceipt && transactionReceipt.blockNumber) {
                    transaction.blockNumber = transactionReceipt.blockNumber;
                    transaction.save();
                }
            }

            transaction.value = this.client.fromSun(transaction.value);
        }
        return transactions;
    }

    public async listAccountDepositsFromDb(account: string, page: number = 1, offset: number = 100): Promise<Array<ICommonTransaction>> {
        const accountInHex = this.client.address.toHex(account);

        const transactions: Array<ICommonTransaction> = await this.storage.CommonTransaction.find({
                $and: [
                    { to: accountInHex }
                ]
            })
            .sort({ timestamp: -1 })
            .skip((page - 1) * offset).limit(offset);

        for(let transaction of transactions) {
            //if this is the first query for these transactions we should append the blocknumber also
            if(!transaction.blockNumber) {
                const transactionReceipt: trxTransactionInfo = await this.client.trx.getTransactionInfo(transaction.transactionHash);
                if(transactionReceipt && transactionReceipt.blockNumber) {
                    transaction.blockNumber = transactionReceipt.blockNumber;
                    transaction.save();
                }
            }

            transaction.value = this.client.fromSun(transaction.value);
        }

        return transactions;
    }

    public addressToHex(address: string) {
        return this.client.address.toHex(address);
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
                addressInHex: this.client.address.toHex(this.getMainAccount()),
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
            throw Boom.badData(`Transaction ${nativeTransaction.txID} not a valid TRX transaction`);
        }
        const valueInTrx = this.client.fromSun(nativeTransaction.raw_data.contract[0].parameter.value.amount);
        const senderAddress = this.getSenderOfTheTransaction(nativeTransaction);
        const receiverAddress = this.getReceiverOfTheTransaction(nativeTransaction);
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

    private async transactionsObserver() {
        if(this.config.walletChangeCallback.cron.startBlockNumber) {
            this.lastBlockNumberAtCallback = this.config.walletChangeCallback.cron.startBlockNumber;
        } else {
            this.lastBlockNumberAtCallback = await this.getBlockNumber();
        }
        cron.schedule(this.config.walletChangeCallback.cron.interval, async () => {
            try {
                const accounts = await this.getAccounts();
                let loopBlock: block = await this.getBlockByNumber();
                let loopBlockNumber = loopBlock.block_header.raw_data.number;
                const recentBlockNumber = loopBlockNumber; //after the transactions check this value overwrite the lastBlockNumberAtCallback value
                while(loopBlockNumber > this.lastBlockNumberAtCallback) {
                    //gather txids which affected the application's accounts.
                    const ownCommonTransactions: Array<trxTransaction> = []; //tthe transactions which affected the accounts that the application handles and belongs to normal trx transactions
                    const ownTRC10Transactions: Object = {}; //the transactions which affected the accounts that the application handles and belongs to normal TRC10 transactions. routeName -> Array<transactions> array

                    if(loopBlock.transactions) {
                        loopBlock.transactions.forEach(transaction => {
                            const transactionAddresses = this.getAddressesInTrxTransaction(transaction);
                            accounts.forEach(account => {
                                if(transactionAddresses.includes(account)) {
                                    if (this.trxTransactionValidation(transaction)) {
                                        ownCommonTransactions.push(transaction);
                                    } else { //it must be token transactions
                                        this.trc10ControllerInstances.forEach(trxTokenController => {
                                            if(trxTokenController.transactionValidation(transaction)) {
                                                if(!ownTRC10Transactions[trxTokenController.routeName]) {
                                                    ownTRC10Transactions[trxTokenController.routeName] = [];
                                                }
                                                ownTRC10Transactions[trxTokenController.routeName].push(transaction);
                                            }
                                        });
                                    }
                                }
                            });
                        });

                        //save into the db
                        if(this.hasOwnExplorer()) {
                            //trx transactions
                            const dbTransactions: Array<CommonTransaction> = [];
                            ownCommonTransactions.forEach(transaction => {

                                dbTransactions.push({
                                    contractRet: transaction.ret[0].contractRet,
                                    transactionHash: transaction.txID,
                                    value: transaction.raw_data.contract[0].parameter.value.amount + "",
                                    from: transaction.raw_data.contract[0].parameter.value.owner_address,
                                    to: transaction.raw_data.contract[0].parameter.value.to_address,
                                    refBlockHash: transaction.raw_data.ref_block_hash,
                                    timestamp: transaction.raw_data.timestamp
                                });
                            });
                            this.storage.CommonTransaction.insertMany(dbTransactions);

                            //token transactions
                            const dbTokenTransactions: Array<TRC10Transfer> = [];

                            for (const key in ownTRC10Transactions) {
                                const transactions: Array<trxTransaction> = ownTRC10Transactions[key];
                                transactions.forEach(transaction => {
                                    console.log("transactiondb", transaction);
                                    dbTokenTransactions.push({
                                        contractRet: transaction.ret[0].contractRet,
                                        transactionHash: transaction.txID,
                                        value: transaction.raw_data.contract[0].parameter.value.amount + "",
                                        from: transaction.raw_data.contract[0].parameter.value.owner_address,
                                        to: transaction.raw_data.contract[0].parameter.value.to_address,
                                        refBlockHash: transaction.raw_data.ref_block_hash,
                                        timestamp: transaction.raw_data.timestamp,
                                        contractAddress: transaction.raw_data.contract[0].parameter.value.asset_name
                                    });
                                });
                            }
                            this.storage.TRC10Transfer.insertMany(dbTokenTransactions);
                        }

                        //make callback request
                        if(this._callbackEnabled) {
                            //trx transactions
                            ownCommonTransactions.forEach(ownTransaction => {
                                console.log(`[TRX] transaction happened: ${ownTransaction.txID}`);
                                rp({
                                    method: "GET",
                                    uri: this.config.walletChangeCallback.callbackUri + "/trx/" + ownTransaction.txID,
                                    json: true
                                });
                            });

                            //token transactions
                            for (const key in ownTRC10Transactions) {
                                const ownTransactions: Array<trxTransaction> = ownTRC10Transactions[key];
                                ownTransactions.forEach(ownTransaction => {
                                    console.log(`[${key}] transaction happened: ${ownTransaction.txID}`);
                                    rp({
                                        method: "GET",
                                        uri: this.config.walletChangeCallback.callbackUri + `/${key}/` + ownTransaction.txID,
                                        json: true
                                    });
                                });
                            }
                        }
                    }

                    //prepare next loop block object
                    loopBlock = await this.getBlockByNumber(--loopBlockNumber);
                }
                this.lastBlockNumberAtCallback = recentBlockNumber;
            } catch (e) {
                console.log("[TRX] ERROR: callback error", e);
            }
        });
    }
}
