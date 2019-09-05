import { default as rp } from "request-promise-native";
import { environment } from "../../../environments/environment";
import { ICryptoCurrency, ITokenRouteMapping } from "../../cryptoCurrencies/ICryptoCurrency";
import { ILocalNodeConfig } from "./ILocalNodeConfig";
import { ILocalNodeConfig as Config} from "./ILocalNodeConfig";
import { default as Boom } from "boom";
import { ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";
import * as cron from "node-cron";
import { Api, JsonRpc, RpcError } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { fetch } from "node-fetch";
import { TextEncoder, TextDecoder } from "util";
import { ChainSchema, ITransactionTrace } from "./db/ChainSchema";
import { Connection, ConnectionOptions, createConnection, getCustomRepository } from "typeorm";
import { IBlockhainInfo } from "./IEosio";

export class EosioService {

    private signatureProvider: JsSignatureProvider;
    private config: ILocalNodeConfig;
    private client: Api;
    private walletClient: Api;
    private chainDb: ChainSchema;

    constructor() {
        this.config = environment.localnodeConfigs.EOSIO;

        this.signatureProvider = new JsSignatureProvider([this.config.mainAccount.privateKey]);
        const nodeRpcClient = new JsonRpc(this.config.rpcClient.nodeURL, { fetch });
        const walletRpcClient = new JsonRpc(this.config.rpcClient.walletURL, { fetch });
        this.client = new Api({ rpc: nodeRpcClient, authorityProvider: walletRpcClient, signatureProvider: this.signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
    }

    public async onInit() {
        await this.dbConnect();
    }

    public async getAccounts(): Promise<Array<string>> {
        return [];
    }

    public async getBalance(account: string): Promise<string> {
        return "0";
    }

    public getMainAccount() {
        return this.config.mainAccount.accountName;
    }

    public async getBlockNumber(): Promise<number> {
        return 0;
    }

    public async getTransaction(txid: string): Promise<ITransaction> {
        return null;
    }

    public async getNativeTransaction(txid: string) {
        const blocknum = await this.getTransactionBlockNumber(txid);

        var options = {
            method: 'POST',
            uri: `${this.config.rpcClient.nodeURL}/v1/history/get_transaction`,
            body: {
                id: txid,
                block_num_hint: blocknum
            },
            json: true // Automatically stringifies the body to JSON
        };

        const transaction = await rp(options);
        return transaction;
    }

    public async getAccountTransaction(account: string, txid: string): Promise<ITransaction> {
        return null;
    }

    public async generateAccount(): Promise<string> {
        return "";
    }

    public isAddress(address: string): boolean {
        return true;
    }

    public async transfer() {
        try {
            const result = await this.client.transact({
                actions: [{
                  account: 'eosio.token',
                  name: 'transfer',
                  authorization: [{
                    actor: 'useraaaaaaaa',
                    permission: 'active',
                  }],
                  data: {
                    from: 'useraaaaaaaa',
                    to: 'useraaaaaaab',
                    quantity: '0.0001 SYS',
                    memo: '',
                  },
                }]
              }, {
                blocksBehind: 3,
                expireSeconds: 30,
              });
              console.log(result);
        } catch (e) {
            throw Boom.notAcceptable(e);
        }
    }

    private async getCurrentBlockNumber(): Promise<number> {
        const blockchainInfo = await this.getBlockchainInfo();
        return blockchainInfo.last_irreversible_block_num;
    }

    private async getBlockchainInfo(): Promise<IBlockhainInfo> {
        var options = {
            method: 'POST',
            uri: `${this.config.rpcClient.nodeURL}/v1/history/get_info`,
            json: true // Automatically stringifies the body to JSON
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

    private async dbConnect() {
        this.chainDb = new ChainSchema(this.config.database);
        await this.chainDb.onInit();
    }
}
