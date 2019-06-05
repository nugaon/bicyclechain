import { environment } from "../../../environments/environment";
import { ILocalNodeConfig as Config } from "./ILocalNodeConfig";
import { RippleAPI } from "ripple-lib";
import {default as rp } from "request-promise-native";
import { DataApiAccountPaments } from "./DataApiResponses";
import { ITransactionEvent } from "./IRipple";
import { RippleDB, IPaymentTransaction } from "./RippleDB";
import { Amount } from "ripple-lib/dist/npm/common/types/objects";
import { default as Boom } from "boom";
import { BigNumber } from "bignumber.js";
import { ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";

export class RippleService {

    private client: RippleAPI;
    private config: Config;
    private storage: RippleDB;

    constructor() {
        this.config = environment.localnodeConfigs.Ripple;
        this.client = new RippleAPI(this.config.clientConfig);
    }

    public async onInit() {
        await this.client.connect();
        if(this.config.mongoDB && this.config.mongoDB.saveMainAccountPayments) {
            await this.connectToDb();

            this.client.connection.on("transaction", (event: ITransactionEvent) => {
                // console.log(util.inspect(event, {showHidden: false, depth: null}));
                let transactionAmount: Amount;
                if(typeof event.transaction.Amount === "string") {
                    transactionAmount = {
                        value: this.client.dropsToXrp(event.transaction.Amount),
                        currency: "XRP"
                    }
                } else {
                    transactionAmount = event.transaction.Amount;
                }
                if(event.transaction.TransactionType === "Payment") {
                    const paymentTransaction = new this.storage.PaymentTransaction({
                        hash: event.transaction.hash,
                        date: event.transaction.date,
                        txSignature: event.transaction.TxnSignature,
                        signingPubKey: event.transaction.SigningPubKey,
                        sequence: event.transaction.Sequence,
                        flags: event.transaction.Flags,
                        fee: event.transaction.Fee,
                        destinationTag: event.transaction.DestinationTag,
                        to: event.transaction.Destination,
                        from: event.transaction.Account,
                        amount: transactionAmount,
                        status: event.status,
                        blockNumber: event.ledger_index,
                        blockHash: event.ledger_hash,
                        result: event.engine_result,
                        resultCode: event.engine_result_code
                    });
                    paymentTransaction.save();
                }
            });
        }
        if(this.config.walletChangeCallback && this.config.walletChangeCallback.enabled) {
            this.client.connection.on("transaction", async (event: ITransactionEvent) => {
                try {
                    rp({
                        method: "GET",
                        uri: this.config.walletChangeCallback.callbackUri + "/" + event.transaction.hash,
                        json: true
                    });
                } catch(e) {
                    console.log(`\t[XRP] Error happened at Walletchange callback: ${e}`);
                }
            });
        }

        if((this.config.walletChangeCallback && this.config.walletChangeCallback.enabled)
            || (this.config.mongoDB && this.config.mongoDB.saveMainAccountPayments)) {
            this.client.connection.request({
                command: "subscribe",
                accounts: [ this.getMainAccount() ]
            });
        }
        console.log("[XRP] Ripple service initialized");
    }

    public async onDestroy() {
        this.client.disconnect();
    }

    public async getAccounts(): Promise<Array<string>> {
        //we only have this account wherewith we can send coins without passed secret key.
        return [ this.getMainAccount() ];
    }

    /**
    * Get a specified account's balance. The local node should be updated
    *
    * @param  {string} account
    * @param  {string} currency
    * @return {string} balance in ether
    */
    public async getBalance(account: string, currency: string = "XRP") {
        try {
            const balances = await this.client.getBalances(account);
            let returnBalance = "0";
            balances.forEach((balance) => {
                if (balance.currency === currency) {
                    returnBalance = balance.value;
                }
            });
            return returnBalance;
        } catch(e) {
            throw Boom.notFound(e);
        }
    }

    public async listAccountTransactionsFromDataApi(account: string, currency: string = "XRP", optionalParams?: {offset: number}) {
        const offset = optionalParams && optionalParams.offset ? optionalParams.offset : 100;
        return this.dataApiAccountTransactions(account, currency, offset);
    }

    public async listAccountDepositsFromDataApi(account: string, currency: string = "XRP", optionalParams?: {offset: number}) {
        const offset = optionalParams && optionalParams.offset ? optionalParams.offset : 100;
        return this.dataApiAccountTransactions(account, currency, offset);
    }

    public async listAccountTransactionsFromDb(account: string, currency: string = "XRP", optionalParams?: {offset: number, page: number, notOnlySuccessful: boolean}) {
        const offset = optionalParams && optionalParams.offset ? optionalParams.offset : 100;
        const page = optionalParams && optionalParams.page ? optionalParams.page : 1;
        const notOnlySuccessful = optionalParams && optionalParams.page ? optionalParams.notOnlySuccessful : false;
        let query: any = { $and: [
            { $or:[ { from: { $regex: new RegExp("^" + account, "i") } }, { to: { $regex: new RegExp("^" + account, "i") } } ] },
            { "amount.currency": currency }
        ]};
        if (!notOnlySuccessful) {
            query.$and.push(
                { result: "tesSUCCESS" }
            );
        }

        const transactions: Array<IPaymentTransaction> = await this.storage.PaymentTransaction.find(query)
        .sort({ blockNumber: -1 })
        .skip((page - 1) * offset).limit(offset);

        return transactions;
    }

    public async listAccountDepositsFromDb(account: string, currency: string = "XRP", optionalParams?: {offset: number, page: number, notOnlySuccessful: boolean}) {
        const offset = optionalParams && optionalParams.offset ? optionalParams.offset : 100;
        const page = optionalParams && optionalParams.page ? optionalParams.page : 1;
        const notOnlySuccessful = optionalParams && optionalParams.page ? optionalParams.notOnlySuccessful : false;

        let query: any = { $and: [
                { to: { $regex: new RegExp("^" + account, "i") } },
                { "amount.currency": currency }
        ]};
        if (!notOnlySuccessful) {
            query.$and.push(
                { result: "tesSUCCESS" }
            );
        }
        const transactions: Array<IPaymentTransaction> = await this.storage.PaymentTransaction.find(query)
            .sort({ blockNumber: -1 })
            .skip((page - 1) * offset).limit(offset);
        return transactions;
    }

    public async sendXrp(sendFrom: string, sendTo: string, amount: string, secret: string, options?: {
        priority?: "LOW" | "MEDIUM" | "HIGH",
        destinationTag?: number
    }): Promise<string> {
        if(this.config.requireDestinationTags && (!options || !options.destinationTag)) {
            throw Boom.badRequest("Destination tag required for every transaction");
        }

        let payment = {
            source: {
                address: sendFrom,
                maxAmount: {
                    value: this.client.xrpToDrops(amount),
                    currency: "drops"
                }
            },
            destination: {
                address: sendTo,
                amount: {
                    value: this.client.xrpToDrops(amount),
                    currency: "drops"
                }
            }
        };

        if(options.destinationTag) {
            payment.destination["tag"] = options.destinationTag;
        }

        let paymentInstructions = {
            maxLedgerVersionOffset: 75
        };

        if(options && options.priority) {
            const feeMultiplier = this.config.fees.priorityMultipliers[options.priority];
            const serverInfo = await this.client.getServerInfo();
            const loadFactor = serverInfo.loadFactor;
            let fee = this.client.xrpToDrops(serverInfo.validatedLedger.baseFeeXRP);
            fee = new BigNumber(fee).multipliedBy(feeMultiplier).multipliedBy(loadFactor).toString();
            paymentInstructions["fee"] = this.client.dropsToXrp(fee);
        }

        const preparedTx = await this.client.preparePayment(sendFrom, payment, paymentInstructions);
        const signedTransactionObject = this.client.sign(preparedTx.txJSON, secret);
        const txid = signedTransactionObject.id;
        const submitTransaction = await this.client.submit(signedTransactionObject.signedTransaction);
        if (submitTransaction.resultCode === "tesSUCCESS") {
            return txid;
        } else {
            throw Boom.badData(submitTransaction.resultMessage);
        }
    }

    public async getTransaction(txid: string) {
        //the application has only one main account to handle so it's equvivalent to the getAccountTransaction method.
        const nativeTransaction = await this.getNativeTransaction(txid);

        if(nativeTransaction.type !== "payment") {
            throw Boom.badData(`Transaction ${txid} is not a Payment`);
        }
        const transactionDetails: any = nativeTransaction.specification;

        //calculate confirmations
        const currentBlockNumber = await this.getBlockNumber();
        const confirmations = currentBlockNumber - nativeTransaction.outcome.ledgerVersion;

        //get balance change
        const balanceChanges = nativeTransaction.outcome.balanceChanges;
        let amountInDrops: BigNumber = new BigNumber(0);
        Object.keys(balanceChanges).forEach(address => {
            //check the currency is XRP
            balanceChanges[address].forEach(balanceChange => {
                if(balanceChange.currency === "XRP" && address.toLowerCase() === this.getMainAccount().toLowerCase()) { //only check XRP transactions
                    amountInDrops = amountInDrops.plus(new BigNumber(this.client.xrpToDrops(balanceChange.value)));
                }
            });
        });
        const amount = this.client.dropsToXrp(amountInDrops.toString());

        //get category and endpoints of the transaction
        let category: "SEND" | "RECEIVE" | "OTHER" = "OTHER";
        if(transactionDetails.source.address.toLowerCase() === this.getMainAccount().toLowerCase()) {
            category = "SEND"
        } else if (transactionDetails.destination.address.toLowerCase() === this.getMainAccount().toLowerCase()) {
            category = "RECEIVE";
        }

        let transaction: ITransaction = {
            amount: amount,
            from: transactionDetails.source.address,
            to: transactionDetails.destination.address,
            txid: nativeTransaction.id,
            category: category,
            confirmations: confirmations,
            additionalInfo: {
                fee: nativeTransaction.outcome.fee
            }
        }

        //check destinationTag
        if(transactionDetails.destination.tag) {
            transaction.additionalInfo.destinationTag = transactionDetails.destination.tag;
        } else {
            if(this.config.requireDestinationTags) {
                throw Boom.badData(`Transaction ${txid} has NOT got destinationTag`);
            }
        }

        return transaction;
    }

    public async getNativeTransaction(txid: string) {
        try {
            const transaction = await this.client.getTransaction(txid);
            return transaction;
        } catch (e) {
            throw Boom.notFound(e);
        }
    }

    public async getAccountTransaction(account: string, txid: string): Promise<ITransaction> {
        //the application has only one main account to handle so it's equvivalent to the getAccountTransaction method.
        if (account.toLowerCase() !== this.getMainAccount().toLowerCase()) {
            throw Boom.notAcceptable(`The application cannot set 'category' for account ${account} , because it's not an owned account`);
        }
        return this.getTransaction(txid);
    }

    public async getBlockNumber(): Promise<number> {
        return this.client.getLedgerVersion();
    }

    public async generateAccount() {
        return this.client.generateAddress();
    }

    public isAddress(address: string) {
        return this.client.isValidAddress(address);
    }

    public async sendXrpFromMainAccount(sendTo: string, amount: string, options?: {
        priority?: "LOW" | "MEDIUM" | "HIGH",
        destinationTag?: number
    }) {
        return this.sendXrp(this.getMainAccount(), sendTo, amount, this.config.mainAccount.secret, options);
    }

    public getMainAccount() {
        return this.config.mainAccount.address;
    }

    public hasOwnExplorer() {
        return !!this.config.mongoDB;
    }

    private async dataApiGetTransaction(txid: string) {
        return rp({
            method: "GET",
            uri: `https://data.ripple.com/v2/transactions/${txid}`,
            json: true
        });
    }

    private async dataApiAccountTransactions(account: string, currency: string = "XRP", limit: number = 10): Promise<DataApiAccountPaments> {
        return rp({
            method: "GET",
            uri: `https://data.ripple.com/v2/payments/${currency}+${account}?limit=${limit}&descending=true`,
            json: true
        });
    }

    private async connectToDb() {
        this.storage = new RippleDB();
        this.storage.onInit();
    }
}
