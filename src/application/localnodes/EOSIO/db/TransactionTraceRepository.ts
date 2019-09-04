import { EntityRepository, Repository } from "typeorm";
import { TransactionTrace } from "./TransactionTrace";

@EntityRepository(TransactionTrace)
export class TransactionTraceRepository extends Repository<TransactionTrace> {

    public async getTransaction(
        txid: string
    ): Promise<TransactionTrace> {
        return this.findOneOrFail({
            id: txid
        });
    }

}
