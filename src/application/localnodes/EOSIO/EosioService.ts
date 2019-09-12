import { default as rp } from "request-promise-native";
import { environment } from "../../../environments/environment";
import { ICryptoCurrency, ITokenRouteMapping } from "../../cryptoCurrencies/ICryptoCurrency";
import { ILocalNodeConfig as Config, ITokenConfig } from "./ILocalNodeConfig";
import { default as Boom } from "boom";
import { ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";
import * as cron from "node-cron";
import { Api, JsonRpc, RpcError } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { default as fetch } from "node-fetch";
import { TextEncoder, TextDecoder } from "util";
import { ChainSchema, ITransactionTrace, IActionTrace } from "./db/ChainSchema";
import { IBlockhainInfo, INativeTransaction, SendedTransaction } from "./EosioService.d";
import { EosioTokenController } from "./tokens/EosioTokenController";
import { AsyncForeach } from "../../generic/AsyncForeach";
import { BigNumber } from "bignumber.js";

export class EosioService {

    private signatureProvider: JsSignatureProvider;
    private config: Config;
    private client: Api;
    // private walletClient: Api;
    private lastObservedBlockNumber: number; //the last observed block number at callback
    private chainDb: ChainSchema;
    private expireSeconds: number;
    private blocksBehind: number;
    private tokens: Array<ITokenConfig>;
    private eosioTokenInstances: Array<EosioTokenController>;

    constructor() {
        this.config = environment.localnodeConfigs.EOSIO;

        this.expireSeconds = this.config.transactionOptions && this.config.transactionOptions.expireSeconds ? this.config.transactionOptions.expireSeconds : 30;
        this.blocksBehind = this.config.transactionOptions && this.config.transactionOptions.blocksBehind ? this.config.transactionOptions.blocksBehind : 3;

        this.signatureProvider = new JsSignatureProvider([this.config.mainAccount.privateKey]);
        const nodeRpcClient = new JsonRpc(this.config.rpcClient.nodeURL, { fetch });
        // const walletRpcClient = new JsonRpc(this.config.rpcClient.walletURL, { fetch });
        this.client = new Api({ rpc: nodeRpcClient, signatureProvider: this.signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

        this.tokens = this.config.withTokens;
    }

    public async onInit() {
        await this.dbConnect();
        await this.transactionsObserver();
        await this.getPrecision();
    }

    public async getAccounts(): Promise<Array<string>> {
        const accounts = this.config.ownedAccounts ? this.config.ownedAccounts : [this.getMainAccount()];
        return accounts;
    }

    public async listAccountTransactions(
        account: string,
        options?: {
            offset?: number,
            page?: number,
            currency?: string,
            contract?: string
        }): Promise<Array<ITransaction>> {
        const currency = options && options.currency ? options.currency : "EOS";

        const listAccountActions: Array<IActionTrace> = await this.chainDb.listAccountTransactions(account, options);
        const accountTransactions: Array<ITransaction> = await this.DbActionTraceToNormalTransaction(listAccountActions, currency);
        return accountTransactions;
    }

    public async listAccountDeposits(
        account: string,
        options?: {
            offset?: number,
            page?: number,
            currency?: string,
            contract?: string
        }): Promise<Array<ITransaction>> {
        const currency = options && options.currency ? options.currency : "EOS";

        const listAccountActions: Array<IActionTrace> = await this.chainDb.listAccountDeposits(account, options);
        const accountTransactions: Array<ITransaction> = await this.DbActionTraceToNormalTransaction(listAccountActions, currency);
        return accountTransactions;
    }

    public async getBalance(account: string, symbol: string = "EOS", contract: string = "eosio.token"): Promise<string> {
        var options = {
            method: 'POST',
            uri: `${this.config.rpcClient.nodeURL}/v1/chain/get_currency_balance`,
            body: {
                code: contract,
                symbol: symbol,
                account: account
            },
            json: true
        };

        try {
            const balanceString = await rp(options);
            return balanceString[0].split(' ')[0];
        } catch(e) {
            throw Boom.serverUnavailable(e);
        }
    }

    public getMainAccount() {
        return this.config.mainAccount.accountName;
    }

    public async getTransaction(txid: string, currency: string = "EOS"): Promise<ITransaction> {
        return this.getAccountTransaction(this.getMainAccount(), txid, currency);
    }

    public async getNativeTransaction(txid: string): Promise<INativeTransaction> {
        const blocknum = await this.getTransactionBlockNumber(txid);

        const options = {
            method: 'POST',
            uri: `${this.config.rpcClient.nodeURL}/v1/history/get_transaction`,
            body: {
                id: txid,
                block_num_hint: blocknum
            },
            json: true
        };

        try {
            const transaction = await rp(options);
            return transaction;
        } catch(e) {
            throw Boom.notFound("Transaction not found", e);
        }
    }

    public async getAccountTransaction(account: string, txid: string, currency: string = "EOS"): Promise<ITransaction> {
        const nativeTransaction = await this.getNativeTransaction(txid);
        this.validateTransaction(nativeTransaction, currency);

        return this.getAccountTransactionFromNativeTransaction(nativeTransaction, account);
    }

    //doesn't have validation for the transaction
    public async getAccountTransactionFromNativeTransaction(nativeTransaction: INativeTransaction, account: string): Promise<ITransaction> {
        const currentBlockNumber = await this.getBlockNumber();

        const sender = nativeTransaction.trx.trx.actions[0].data.from;
        const receiver = nativeTransaction.trx.trx.actions[0].data.to;
        const memo = nativeTransaction.trx.trx.actions[0].data.memo;

        let category : "SEND" | "RECEIVE" | "OTHER" = "OTHER";
        if(sender === account && receiver === account) {
            category = "OTHER";
        } else if(sender === account) {
            category = "SEND";
        } else if(receiver === account) {
            category = "RECEIVE";
        }


        const transaction: ITransaction = {
            txid: nativeTransaction.id,
            confirmations: currentBlockNumber - nativeTransaction.block_num,
            amount: this.getBalanceValue(nativeTransaction.trx.trx.actions[0].data.quantity),
            category: category,
            from: sender,
            to: receiver,
            additionalInfo: {
                memo: memo
            }
        };
        return transaction;
    }

    public async generateAccount(newAccountName: string, pubKey: string = null): Promise<SendedTransaction> {
        const mainAccount = this.getMainAccount();
        pubKey = pubKey ? pubKey : this.config.mainAccount.publicKey;

        try {
            const result = await this.client.transact({
                actions: [{
                    account: "eosio",
                    name: "newaccount",
                    authorization: [{
                        actor: mainAccount,
                        permission: "active",
                    }],
                    data: {
                        creator: mainAccount,
                        name: newAccountName,
                        owner: {
                            threshold: 1,
                            keys: [{
                                key: pubKey,
                                weight: 1
                            }],
                            accounts: [],
                            waits: []
                        },
                        // {
                        //     account: "eosio",
                        //     name: "buyrambytes",
                        //     authorization: [{
                        //         actor: mainAccount,
                        //         permission: 'active',
                        //     }],
                        //     data: {
                        //         payer: mainAccount,
                        //         receiver: newAccountName,
                        //         bytes: 8192,
                        //     },
                        // },
                        // {
                        //     account: "eosio",
                        //     name: "delegatebw",
                        //     authorization: [{
                        //         actor: mainAccount,
                        //         permission: 'active',
                        //     }],
                        //     data: {
                        //         from: mainAccount,
                        //         receiver: newAccountName,
                        //         stake_net_quantity: '1.0000 SYS',
                        //         stake_cpu_quantity: '1.0000 SYS',
                        //         transfer: false,
                        //     }
                        // }
                        active: {
                            threshold: 1,
                            keys: [{
                                key: pubKey,
                                weight: 1
                            }],
                            accounts: [],
                            waits: []
                        },
                    },
                }]
            }, {
                blocksBehind: this.blocksBehind,
                expireSeconds: this.expireSeconds,
            });
            return result;
        } catch(e) {
            throw Boom.notAcceptable(e);
        }
    }

    public isAddress(address: string): boolean {
        //the eosio.token contract handles if the recipient not a valid account
        return true;
    }

    public async transfer(from: string, to: string, amount: string, memo: string, currency: string = "EOS", contract: string = "eosio.token"): Promise<string> {
        try {
            const precision: number = await this.getPrecision(currency, contract);

            const result = await this.client.transact({
                actions: [{
                    account: contract,
                    name: 'transfer',
                    authorization: [{
                        actor: from,
                        permission: 'active',
                    }],
                    data: {
                        from: from,
                        to: to,
                        quantity: `${new BigNumber(amount).toFixed(precision).toString()} ${currency}`,
                        memo: memo,
                    },
                }]
            }, {
                blocksBehind: this.blocksBehind,
                expireSeconds: this.expireSeconds,
                broadcast: true
            });
            console.log(`[${currency}] Token Transfer happened`, result);
            return result;
        } catch (e) {
            throw Boom.notAcceptable(e);
        }
    }

    private validateTransaction(transaction: INativeTransaction, currency: string) {
        if(transaction.trx.receipt.status !== "executed") {
            throw Boom.notAcceptable(`The requested transaction '${transaction.id}'' is not in executed status: ${transaction.trx.receipt.status}`);
        }
        if (transaction.trx.trx.actions[0].name !== "issue" && transaction.trx.trx.actions[0].name !== "transfer") {
            throw Boom.notAcceptable(`Transaction ${transaction.id} has not called method 'issue' or 'transfer'`);
        }
        if(transaction.trx.trx.actions[0].data.quantity.split(' ')[1] !== currency) {
            throw Boom.badData(`The transactions currency is ${transaction.trx.trx.actions[0].data.quantity.split(' ')[1]} instead of ${currency}`);
        }
    }

    private async getBlockNumber(): Promise<number> {
        const blockchainInfo = await this.getBlockchainInfo();
        return blockchainInfo.last_irreversible_block_num;
    }

    private async getBlockchainInfo(): Promise<IBlockhainInfo> {
        var options = {
            method: 'POST',
            uri: `${this.config.rpcClient.nodeURL}/v1/chain/get_info`,
            json: true
        };

        const info: IBlockhainInfo = await rp(options);
        return info;
    }

    private async getTransactionBlockNumber(txid: string): Promise<number> {
        const transactionTrace: ITransactionTrace = await this.chainDb.getTransactionById(txid);
        if(!transactionTrace) {
            throw Boom.notFound(`The transaction '${txid}' not found`);
        }
        return transactionTrace.block_num;
    }

    private getBalanceValue(nativeValue: string) {
        const balanceArray = nativeValue.split(' ');
        // if(currency !== balanceArray[1]) {
        //     throw Boom.badData(`The transactions currency is ${balanceArray[1]} instead of ${currency}`);
        // }
        return balanceArray[0];
    }

    private async dbConnect() {
        this.chainDb = new ChainSchema(this.config.database);
        await this.chainDb.onInit();
    }

    private async transactionsObserver() {
        if(this.config.walletChangeCallback.cron.startBlockNumber) {
            this.lastObservedBlockNumber = this.config.walletChangeCallback.cron.startBlockNumber;
        } else {
            this.lastObservedBlockNumber = await this.getBlockNumber();
        }

        cron.schedule(this.config.walletChangeCallback.cron.interval, async () => {
            try {
                const accounts = await this.getAccounts();
                const currentBlockNumber: number = await this.getBlockNumber();

                for (const account of accounts) {

                    const allAccountActions = await this.chainDb.listAccountActionsInBlockRange(account, this.lastObservedBlockNumber, currentBlockNumber);
                    for (const accountAction of allAccountActions) {
                        const nativeTransaction = await this.getNativeTransaction(accountAction.transaction_id);

                        //check eosio
                        if(this.checkTransactionCurrency(nativeTransaction, "EOS")) {
                            console.log(`[EOS] Balance change happened ${nativeTransaction.id}`);

                            if(this.config.walletChangeCallback.enabled) {
                                rp({
                                    method: "GET",
                                    uri: this.config.walletChangeCallback.callbackUri + `/eos/` + nativeTransaction.id,
                                    json: true
                                });
                            }
                        } else { //check tokens
                            for (const tokenInstance of this.eosioTokenInstances) {
                                if(this.checkTransactionCurrency(nativeTransaction, tokenInstance.getCurrency())) {
                                    console.log(`[${tokenInstance.getCurrency()}] Balance change happened ${nativeTransaction.id}`);

                                    if(this.config.walletChangeCallback.enabled) {
                                        rp({
                                            method: "GET",
                                            uri: this.config.walletChangeCallback.callbackUri + `/${tokenInstance.getRoute()}/` + nativeTransaction.id,
                                            json: true
                                        });
                                    }
                                }
                            }
                        }
                    }
                }

                this.lastObservedBlockNumber = currentBlockNumber;
            } catch (e) {
                console.log("[EOS] ERROR: callback error", e);
            }
        });
    }

    public async initTokens() {
        this.eosioTokenInstances = [];
        const tokenInstances: Array<ICryptoCurrency> = [];
        const routeMapping: Array<ITokenRouteMapping> = [];
        if(this.tokens) {
            await AsyncForeach(this.tokens, async (token): Promise<void> => {
                const tokenInstance = new EosioTokenController(this, token.currency, token.contract, token.route);
                await tokenInstance.onInit();
                const refereinceId = `TOKEN-EOSIO-TOKEN-${token.route}`;
                routeMapping.push({
                    route: token.route,
                    referenceId: refereinceId
                });
                tokenInstances[refereinceId] = tokenInstance;

                this.eosioTokenInstances.push(tokenInstance);
            });
        }
        return {
            routeMapping: routeMapping,
            instances: tokenInstances
        };
    }

    public async getPrecision(symbol: string = "EOS", contract: string = "eosio.token") {
        var options = {
            method: 'POST',
            uri: `${this.config.rpcClient.nodeURL}/v1/chain/get_currency_stats`,
            body: {
                code: contract,
                symbol: symbol
            },
            json: true
        };

        const response = await rp(options);
        const maxSupply = response[symbol]['max_supply'].split(' ')[0];
        const precision = maxSupply.split('.')[1].length;
        return precision;
    }

    private async DbActionTraceToNormalTransaction(actions: Array<IActionTrace>, currency: string): Promise<Array<ITransaction>> {
        const accountTransactions: Array<ITransaction> = [];

        for (const dbTransaction of actions) {
            const nativeTransaction = await this.getNativeTransaction(dbTransaction.transaction_id);
            if(!this.checkTransactionCurrency(nativeTransaction, currency)) {
                continue;
            }
            const accountTransaction: ITransaction = await this.getAccountTransactionFromNativeTransaction(nativeTransaction, dbTransaction.receipt_receiver);
            accountTransactions.push(accountTransaction);
        }
        return accountTransactions;
    }

    private checkTransactionCurrency(nativeTransaction: INativeTransaction, currency: string) {
        if(nativeTransaction.trx.trx.actions[0].data.quantity
            && nativeTransaction.trx.trx.actions[0].data.quantity.split(' ')[1] === currency){
                return true;
        }
        return false;
    }
}
