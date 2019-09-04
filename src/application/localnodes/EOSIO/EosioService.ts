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
import { TransactionTraceRepository } from "./db/TransactionTraceRepository";
import { TransactionTrace } from "./db/TransactionTrace";
import { Connection, ConnectionOptions, createConnection, getCustomRepository } from "typeorm";


export class EosioService {

    private signatureProvider: JsSignatureProvider;
    private config: ILocalNodeConfig;
    private client: Api;
    private walletClient: Api;
    private dbConnection: Connection;

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
        const repository: TransactionTraceRepository = getCustomRepository(TransactionTraceRepository);
        const result = await repository.getTransaction(txid);
        return result;
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

    private async dbConnect() {
        let connectionOptions: ConnectionOptions = this.config.database;
        connectionOptions = { ...connectionOptions, entities: [TransactionTrace] };
        try {
            const connection: Connection = await createConnection(connectionOptions);
            this.dbConnection = connection;
            console.log(`[EOS] Database connection is established with ${connectionOptions.database}`);
        } catch(errors) {
            console.log("[EOS] Error while connecting to the database (details bellow)...", errors);
        };
    }
}
