import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class TransactionTrace {

    @Column("bigint", { unique: true })
    public block_num: number;

    @Column("integer")
    public transaction_ordinal: number;

    @Column("character varying", {length: 64})
    public failed_dtrx_trace: string;

    @Column("character varying", {length: 64})
    public id: string;

    //
    @Column("character varying", {length: 64})
    public status: string;

    @Column("bigint")
    public cpu_usage_us: number;

    @Column("bigint")
    public net_usage_words: number;

    @Column("bigint")
    public elapsed: number;

    @Column("numeric")
    public net_usage: number;

    @Column("boolean")
    public scheduled: boolean;

    @Column("boolean")
    public account_ram_delta_present: boolean;

    @Column("character varying", {length: 13})
    public account_ram_delta_account: string;

    @Column("bigint")
    public account_ram_delta_delta: number;

    @Column("character varying")
    public except: string;

    @Column("numeric")
    public error_code: number;

    @Column("boolean")
    public partial_present: boolean;

    @Column("timestamp without time zone")
    public partial_expiration: number;

    @Column("integer")
    public partial_ref_block_num: number;

    @Column("bigint")
    public partial_ref_block_prefix: number;

    @Column("bigint")
    public partial_max_net_usage_words: number;

    @Column("smallint")
    public partial_max_cpu_usage_ms: number;

    @Column("bigint")
    public partial_delay_sec: number;

    @Column("character varying[]")
    public partial_signatures: Array<string>;

    @Column("bytea[]")
    public partial_context_free_data: Array<string>;
}
