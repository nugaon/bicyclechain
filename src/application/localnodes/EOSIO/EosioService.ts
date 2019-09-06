import { default as rp } from "request-promise-native";
import { environment } from "../../../environments/environment";
import { ICryptoCurrency, ITokenRouteMapping } from "../../cryptoCurrencies/ICryptoCurrency";
import { ILocalNodeConfig as Config} from "./ILocalNodeConfig";
import { default as Boom } from "boom";
import { ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";
import * as cron from "node-cron";
import { Api, JsonRpc, RpcError } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { default as fetch } from "node-fetch";
import { TextEncoder, TextDecoder } from "util";
import { ChainSchema, ITransactionTrace } from "./db/ChainSchema";
import { IBlockhainInfo, INativeTransaction, SendedTransaction } from "./IEosio";

export class EosioService {

    private signatureProvider: JsSignatureProvider;
    private config: Config;
    private client: Api;
    // private walletClient: Api;
    private chainDb: ChainSchema;
    private expireSeconds: number;
    private blocksBehind: number;

    constructor() {
        this.config = environment.localnodeConfigs.EOSIO;

        this.expireSeconds = this.config.transactionOptions && this.config.transactionOptions.expireSeconds ? this.config.transactionOptions.expireSeconds : 30;
        this.blocksBehind = this.config.transactionOptions && this.config.transactionOptions.blocksBehind ? this.config.transactionOptions.blocksBehind : 3;

        this.signatureProvider = new JsSignatureProvider([this.config.mainAccount.privateKey]);
        const nodeRpcClient = new JsonRpc(this.config.rpcClient.nodeURL, { fetch });
        // const walletRpcClient = new JsonRpc(this.config.rpcClient.walletURL, { fetch });
        this.client = new Api({ rpc: nodeRpcClient, signatureProvider: this.signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
    }

    public async onInit() {
        await this.dbConnect();
    }

    public async getAccounts(): Promise<Array<string>> {
        return [this.getMainAccount()];
    }

    public async getBalance(account: string, symbol: string = "SYS", contract: string = "eosio.token"): Promise<string> {
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

    public async getTransaction(txid: string, currency: string = "SYS"): Promise<ITransaction> {
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

    public async getAccountTransaction(account: string, txid: string, currency: string = "SYS"): Promise<ITransaction> {
        const nativeTransaction = await this.getNativeTransaction(txid);
        this.validateTransaction(nativeTransaction);

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
            amount: this.getBalanceValue(nativeTransaction.trx.trx.actions[0].data.quantity, currency),
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

    public async transfer(from: string, to: string, amount: string, memo: string, currency: string = "SYS", contract: string = "eosio.token"): Promise<string> {
        try {
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
                        quantity: `${amount} ${currency}`,
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

    private validateTransaction(transaction: INativeTransaction) {
        if(transaction.trx.receipt.status !== "executed") {
            throw Boom.notAcceptable(`The requested transaction '${transaction.id}'' is not in executed status: ${transaction.trx.receipt.status}`);
        }
        if (transaction.trx.trx.actions[0].name !== "issue" && transaction.trx.trx.actions[0].name !== "transfer") {
            throw Boom.notAcceptable(`Transaction ${transaction.id} has not called method 'issue' or 'transfer'`);
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

    private getBalanceValue(nativeValue: string, currency: string) {
        const balanceArray = nativeValue.split(' ');
        if(currency !== balanceArray[1]) {
            throw Boom.badData(`The transactions currency is ${balanceArray[1]} instead of ${currency}`);
        }
        return balanceArray[0];
    }

    private async dbConnect() {
        this.chainDb = new ChainSchema(this.config.database);
        await this.chainDb.onInit();
    }
}
