export interface TRC10Token {
    owner_address: string;
    name: string;
    abbr: string;
    total_supply: number;
    trx_num: number;
    num: number;
    start_time: number; //ts
    end_time: number; //ts
    description: string;
    url: string;
    id: string;
}

export interface tokenCreateOptions {
    name: string;
    abbreviation: string;
    description?: string;
    url: string;
    totalSupply: number;
    trxRatio: number; // How much TRX will tokenRatio cost?
    tokenRatio: number; // How many tokens will trxRatio afford?
    saleStart: number; //timestamp
    saleEnd?: number; //timestamp
    freeBandwidth: number; // The creator's "donated" bandwidth for use by token holders
    freeBandwidthLimit: number; // Out of totalFreeBandwidth; the amount each token holder get
    frozenAmount: number;
    frozenDuration: number; //days to freeze
}
