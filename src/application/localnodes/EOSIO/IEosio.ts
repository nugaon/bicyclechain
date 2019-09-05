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
