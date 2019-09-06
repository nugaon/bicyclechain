export interface IBlockhainInfo {
    server_version: string; //Hash representing the last commit in the tagged release
    chain_id: string; //Hash representing the ID of the chain
    head_block_num: number; //Highest block number on the chain
    head_block_id: string; //Highest block ID on the chain
    head_block_time: string; //Highest block unix timestamp
    head_block_producer: string; //Producer that signed the highest block (head block)
    last_irreversible_block_num: number; //Highest block number on the chain that has been irreversibly applied to state
    last_irreversible_block_id: string; //Highest block ID on the chain that has been irreversibly applied to state
    virtual_block_cpu_limit: number; //CPU limit calculated after each block is produced, approximately 1000 times block_cpu_limit
    virtual_block_net_limit: number; //NET limit calculated after each block is produced, approximately 1000 times block_net_limit
    block_cpu_limit: number; //Actual maximum CPU limit
    block_net_limit: number; //Actual maximum NET limit
    server_version_string: string; //String representation of server version - Majorish-Minorish-Patchy - Warning - Not actually SEMVER!
    fork_db_head_block_num: number; //Sequential block number representing the best known head in the fork database tree
    fork_db_head_block_id: string;//Hash representing the best known head in the fork database tree;
}

export interface INativeTransaction {
    id: string;
    trx: {
        receipt: {
            status: "executed" | "soft_fail" | "hard_fail" | "delayed" | "expired";
            cpu_usage_us: number;
            net_usage_words: number;
            trx: Array<any>;
        },
        trx: {
            expiration: string;//"2019-09-05T20:49:28",
            ref_block_num: number;
            ref_block_prefix: number;
            max_net_usage_words: number;
            max_cpu_usage_ms: number;
            delay_sec: number;
            context_free_actions: Array<any>,
            actions: Array<
                {
                    account: string;
                    name: string;
                    authorization: Array<
                        {
                            actor: string;
                            permission: string;
                        }
                    >;
                    data: {
                        to: string;
                        quantity: string;
                        memo: string;
                        from?: string;
                    } | any;
                    hex_data: string;
                }
            >,
            transaction_extensions: Array<any>;
            signatures: Array<string>;
            context_free_data: Array<any>;
        }
    },
    block_time: string;
    block_num: number;
    last_irreversible_block: number;
    traces: any
}

export interface SendedTransaction {
    id: string;
    block_num: string;
    block_time: string;
    producer_block_id: string;
    receipt: {
        status: "executed" | "soft_fail" | "hard_fail" | "delayed" | "expired";
        cpu_usage_us: number;
        net_usage_words: number;
    },
    elapsed: number;
    net_usage: number;
    scheduled: boolean;
    action_traces: Array<any>;
    account_ram_delta: any;
    except: any;
    error_code: any;
}
