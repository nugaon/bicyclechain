import { default as rp } from "request-promise-native";
import { environment } from "../../../../environments/environment";
import { TronDB, IAccount } from "../TronDB";
import { TronService } from "../TronService";
import { ILocalNodeConfig as Config} from "../ILocalNodeConfig";
import * as cron from "node-cron";
import { ITransaction } from "../../../cryptoCurrencies/ICryptoCurrency";
import { sendedTransaction, trxTransaction, block, accountData, extendedTransaction } from "../ITron";
import { BigNumber } from "bignumber.js";
import { default as Boom } from "boom";
import { default as TronWeb } from 'tronweb';
import { ITRC20Transfer } from "../TronDB";

export class TRC20Service {

    private storage: TronDB;
    private tokenAddress: string;
    private tronService: TronService;
    private tokenName: string;
    private tokenSymbol: string;
    private routeName: string;
    private config: Config;
    private lastBlockNumberAtCallback: number; //the last emitted block number at callback
    private client: TronWeb;
    private contractInstance: any;
    private decimals: number;
    private callbackEnabled: boolean;

    constructor(tronService: TronService, storage: TronDB, client: TronWeb, tokenAddress: string, routeName: string) {
        this.tronService = tronService;
        this.storage = storage;
        this.routeName = routeName;
        this.config = environment.localnodeConfigs.TRON;
        this.tokenAddress = tokenAddress;
        this.client = client;
    }

    public async onInit() {
        try {
            this.contractInstance = await this.client.contract().at(this.tokenAddress);

            this.tokenSymbol = await this.contractInstance.methods.symbol().call(this.mainAccountTransaction());
            this.decimals = await this.contractInstance.methods.decimals().call(this.mainAccountTransaction());
            this.tokenName = await this.contractInstance.methods.name().call(this.mainAccountTransaction());
            console.log(`The ${this.tokenName}(${this.tokenSymbol}) TRC20 contract initialized.` +
            `\n[${this.tokenSymbol}] Contract address: ${this.tokenAddress}` +
            `\n[${this.tokenSymbol}] Used decimals: ${this.decimals}`);

            if(this.tronService.callbackEnabled) {
                console.log(`[${this.tokenSymbol}] send callbacks to ${this.config.walletChangeCallback.callbackUri}/${this.routeName} and cron ${this.config.walletChangeCallback.cron.interval}`);
            }

            if(this.tronService.observerNeededToEnvoke) {
                await this.transactionsObserver();
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

        //we don't know the category value yet in absence of "to" address. we don't want to query the database twice because of it.
        let regularTransaction = await this.nativeTransactionToRegularTransaction(nativeTransaction, "OTHER");

        const senderAddress = regularTransaction.from;
        const receiverAddress = regularTransaction.to;
        const senderAccountInstance = await this.storage.Account.findOne({address: senderAddress});
        const receiverAccountInstance = await this.storage.Account.findOne({address: receiverAddress});

        if(senderAccountInstance && receiverAccountInstance) {
            regularTransaction.category = "OTHER";
        }
        else if(senderAccountInstance) {
            regularTransaction.category = "SEND";
        } else if (receiverAccountInstance){
            regularTransaction.category = "RECEIVE";
        } else {
            regularTransaction.category = "OTHER";
        }

        return regularTransaction;
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
            throw Boom.badData(`The transaction not a valid ${this.tokenName} token transaction`);
        }
        return transaction;
    }

    public async getAccountTransaction(account: string, txid: string): Promise<ITransaction> {
        const nativeTransaction = await this.getNativeTransaction(txid);

        let regularTransaction = await this.nativeTransactionToRegularTransaction(nativeTransaction, "OTHER");

        const senderAddress = regularTransaction.from;
        const receiverAddress = regularTransaction.to;

        if(senderAddress.toLowerCase() === account.toLowerCase() && receiverAddress.toLowerCase() === account.toLowerCase()) {
            regularTransaction.category  = "OTHER";
        }
        else if(senderAddress.toLowerCase() === account.toLowerCase()) {
            regularTransaction.category  = "SEND";
        } else if (receiverAddress.toLowerCase() === account.toLowerCase()){
            regularTransaction.category  = "RECEIVE";
        } else {
            regularTransaction.category  = "OTHER";
        }

        return regularTransaction;
    }

    public async getAccountBalance(account: string): Promise<string> {
        const balance = await this.contractInstance.methods.balanceOf(account).call(this.mainAccountTransaction());
        return this.transformFromBasicUnit(balance);
    }

    public async sendTokenFromMainAccount(to: string, amount: string): Promise<string> {
        const result = await this.performWithdraw(this.getMainAccount(), to, amount);
        return result;
    }

    private mainAccountTransaction() {
        return this.transactionOptions(this.tronService.getMainAccount());
    }

    private transactionOptions(from: string, trxToSendInSun: number = null, feeLimitInSun: number = 100000) {
        let options: any = {
            from: from,
            feeLimit: feeLimitInSun,
            shouldPollResponse: false
        };
        if(trxToSendInSun) {
            options.callValue = trxToSendInSun;
        }
        return options;
    }

    public async performWithdraw(fromAddress: string,
        toAddress: string,
        amount: string,
        options?: {
            callFromPrivateKey?: string
        }): Promise<string> {
        try{
            if(options && options.callFromPrivateKey) {
                this.client.setPrivateKey(options.callFromPrivateKey);
            }

            let withdrawTransactionOption = this.transactionOptions(fromAddress);
            withdrawTransactionOption.shouldPollResponse = false;

            const txId = await this.contractInstance.methods.transfer(toAddress, this.transformToBasicUnit(amount)).send(withdrawTransactionOption);
            this.tronService.setDefaultPrivateKey();
            return txId;
        }
        catch(e) {
            throw Boom.notAcceptable(JSON.stringify(e));
        }
    }

    public hasOwnExplorer(): boolean {
        return !!environment.localnodeConfigs.TRON.mongoDB;
    }

    public async getBlockNumber(): Promise<number> {
        return await this.tronService.getBlockNumber();
    }

    public async listAccountTransactionsFromDb(account: string, page: number = 1, offset: number = 100): Promise<Array<ITRC20Transfer>> {
        const transactions: Array<ITRC20Transfer> = await this.storage.TRC20Transfer.find({
                $and: [
                    { $or:[ { from: { $regex: new RegExp("^" + this.client.address.toHex(account), "i") } }, { to: { $regex: new RegExp("^" + this.client.address.toHex(account), "i") } } ]},
                    { contractAddress: { $regex: new RegExp("^" + this.tokenAddress, "i") } }
                ]
            })
            .sort({ blockNumber: -1 })
            .skip((page - 1) * offset).limit(offset);
        transactions.forEach((transaction) => {
            transaction.value = this.transformFromBasicUnit(transaction.value);
        })
        return transactions;
    }

    public async listAccountDepositsFromDb(account: string, page: number = 1, offset: number = 100): Promise<Array<ITRC20Transfer>> {
        const transactions: Array<ITRC20Transfer> = await this.storage.TRC20Transfer.find({
                $and: [
                    { to: { $regex: new RegExp("^" + this.client.address.toHex(account), "i") } },
                    { contractAddress: { $regex: new RegExp("^" + this.tokenAddress, "i") } }
                ]
            })
            .sort({ blockNumber: -1 })
            .skip((page - 1) * offset).limit(offset);
        transactions.forEach((transaction) => {
            transaction.value = this.transformFromBasicUnit(transaction.value);
        })
        return transactions;
    }

    public addressToHex(address: string) {
        return this.client.address.toHex(address);
    }

    private transformToBasicUnit(amount: string): string {
        return new BigNumber(amount).multipliedBy(new BigNumber(10).pow(this.decimals)).integerValue().toString();
    }

    private transformFromBasicUnit(amount: string): string {
        return new BigNumber(amount).multipliedBy(new BigNumber(10).pow(-this.decimals)).toString();
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
            if(contract.type !== "TriggerSmartContract" || this.client.address.fromHex(contract.parameter.value.contract_address) !== this.tokenAddress) {
                return false;
            }
        }
        return true;
    }

    private async nativeTransactionToRegularTransaction(nativeTransaction: extendedTransaction, category: "SEND" | "RECEIVE" | "OTHER"): Promise <ITransaction> {
        const txid = nativeTransaction.id;
        const senderAddress = this.tronService.getSenderOfTheTransaction(nativeTransaction);
        const currentBlockNumber = await this.getBlockNumber();
        const txBlockNumber = nativeTransaction.blockNumber;

        const dbTransaction = await this.storage.TRC20Transfer.findOne({transactionHash: txid},"-_id -__v");
        if(!dbTransaction) {
            throw Boom.notFound(`The transaction ${txid} not found in the db`);
        }
        if(dbTransaction.contractAddress !== this.tokenAddress) {
            throw Boom.notAcceptable(`Transaction ${txid} not belongs to ${this.tokenSymbol} token`);
        }

        return {
            txid: nativeTransaction.txID,
            amount: dbTransaction.value,
            confirmations: currentBlockNumber - txBlockNumber,
            category: category,
            from: senderAddress,
            to: this.client.address.fromHex(dbTransaction.to)
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

    private async transactionsObserver() {

        this.contractInstance.methods.Transfer().watch((err, event) => {
            if (err) return console.error(`[${this.tokenSymbol}] Error occured at the Transfer event subscription`, err);
            if (event) { // some function
                console.log(`[${this.tokenSymbol}] Transaction happened`, event);
                if(this.tronService.hasOwnExplorer()) {
                    const newTRC20Transfer = new this.storage.TRC20Transfer({
                        contractAddress: event.contract,
                        blockNumber: event.block,
                        timestamp: event.timestamp,
                        transactionHash: event.transaction,
                        from: event.result.from,
                        to: event.result.to,
                        value: event.result.value
                    });

                    newTRC20Transfer.save();
                }

                if(this.tronService.callbackEnabled) {
                    rp({
                        method: "GET",
                        uri: this.config.walletChangeCallback.callbackUri + "/" + this.routeName + "/" + event.transaction,
                        json: true
                    });
                }
            }
        });
    }
}
