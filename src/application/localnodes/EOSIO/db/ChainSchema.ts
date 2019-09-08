import { Client } from "pg";

export class ChainSchema {

    private client = Client;

    public constructor(clientConfig: IDbClientConfig){
        clientConfig.host = clientConfig.host ? clientConfig.host : "127.0.0.1";
        clientConfig.user = clientConfig.user ? clientConfig.user : "postgres";
        clientConfig.database = clientConfig.database ? clientConfig.database : "postgres";
        clientConfig.password = clientConfig.password ? clientConfig.password : "";
        clientConfig.port = clientConfig.port ? clientConfig.port : 5432;

        this.client = new Client(clientConfig);
    }

    public async onInit() {
        await this.client.connect();
        console.log("[EOS] Successfully connected to the database. set 'chain' schema for the queries");
        await this.client.query(`SET search_path TO chain`);
    }

    public async getTransactionById(
        txid: string
    ): Promise<ITransactionTrace> {
        try {
            const transactionTrace = await this.client.query("SELECT * FROM transaction_trace WHERE id = $1 LIMIT 1", [txid.toUpperCase()]);
            const transaction: ITransactionTrace = transactionTrace.rows[0];
            return transaction;
        } catch(e) {
            console.log(`Error happened at the transaction ${txid}`, e);
        }
    }

    public async listAccountTransactions(
        account: string,
        options?: {
            offset?: number,
            page?: number,
            contract?: string
        }
    ): Promise<Array<IActionTrace>> {
        const offset = options && options.offset ? options.offset : 20;
        const page = options && options.page ? options.page : 0;
        const contract = options && options.contract ? options.contract : "eosio.token";

        try {
            const transactionTrace = await this.client.query(
                "SELECT * FROM action_trace WHERE receipt_receiver = $1 AND act_account = $4 ORDER BY -block_num OFFSET $2 ROWS FETCH FIRST $3 ROW ONLY",
                [account, offset * page, offset, contract]);
            const actions: Array<IActionTrace> = transactionTrace.rows;
            return actions;
        } catch(e) {
            console.log(`Error happened at the transaction listing of ${account}`, e);
        }
    }

    public async listAccountDeposits(
        account: string,
        options?: {
            offset?: number,
            page?: number,
            contract?: string
        }
    ): Promise<Array<IActionTrace>> {
        const offset = options && options.offset ? options.offset : 20;
        const page = options && options.page ? options.page : 0;
        const contract = options && options.contract ? options.contract : "eosio.token";

        try {
            const transactionTrace = await this.client.query(
                "SELECT * FROM action_trace WHERE receipt_receiver = $1 AND action_ordinal = 3 AND act_account = $4 ORDER BY -block_num OFFSET $2 ROWS FETCH FIRST $3 ROW ONLY",
                [account, offset * page, offset, contract]);
            const actions: Array<IActionTrace> = transactionTrace.rows;
            return actions;
        } catch(e) {
            console.log(`Error happened at the transaction listing of ${account}`, e);
        }
    }

    public async listAccountActionsInBlockRange(
        account: string,
        minBlock: number,
        maxBlock: number
    ): Promise<Array<IActionTrace>> {
        try {
            const transactionTrace = await this.client.query(
                "SELECT * FROM action_trace WHERE receipt_receiver = $1 AND block_num >= $2 AND block_num < $3 ORDER BY -block_num",
                [account, minBlock, maxBlock]);
            const actions: Array<IActionTrace> = transactionTrace.rows;
            return actions;
        } catch(e) {
            console.log(`Error happened at the transaction listing of ${account}`, e);
        }
    }

}

export interface IDbClientConfig {
    user?: string;
    host?: string;
    database?: string;
    password?: string;
    port?: number;
}

export interface ITransactionTrace {
    block_num: number;
    transaction_ordinal: number;
    failed_dtrx_trace: string;
    id: string;
    status: string;
    cpu_usage_us: number;
    net_usage_words: number;
    elapsed: number;
    scheduled: boolean;
    account_ram_delta_present: boolean;
    account_ram_delta_account: string;
    account_ram_delta: number;
    except: string;
    error_code: number;
    partial_present: boolean;
    partial_expiration: number;
    partial_ref_block_num: number;
    partial_ref_block_prefix: number;
    partial_max_net_usage_words: number;
    partial_max_cpu_usage_ms: number;
    partial_delay_sec: number;
    partial_signatures: Array<string>;
    partial_context_free_data: Array<number>;
}

export interface IActionTrace {
    block_num: number;
    transaction_id: string;
    transaction_status: "executed" | "soft_fail" | "hard_fail" | "delayed" | "expired";
    action_ordinal: number; //at transfer 2: sender; 3: receiver
    creator_action_ordinal: number;
    receipt_present: boolean;
    receipt_receiver: string;
    receipt_act_digest: string;
    receipt_global_sequence: number;
    receipt_code_sequence: number;
    receipt_abi_sequence: number;
    receiver: string;
    act_account: string;
    act_name: string;
    act_data: any;
    context_free: boolean;
    elapsed: number;
    console: string;
    except: string;
    error_code: number;
}
