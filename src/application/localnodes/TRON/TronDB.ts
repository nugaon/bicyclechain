import { Document, Schema, Model, createConnection, Connection} from "mongoose";
import { environment } from "../../../environments/environment";

export class TronDB {

    private connectionUri: string;
    private client: Connection;
    private AccountModel: Model<IAccount>;
    private AccountSchema: Schema;

    constructor() {}

    public async onInit() {
        this.connectionUri = environment.localnodeConfigs.TRON.mongoDB.connectionUri;
        try {
            this.client = await createConnection(this.connectionUri, { useNewUrlParser: true });
            console.log(`[TRX] Service connected to database: ${this.connectionUri}`);
            this.initModels();
        }
        catch(e) {
            console.log(e);
        }
    }

    public async onDestroy() {
        await this.client.close();
        console.log(`MongoDB connection closed on ${this.connectionUri}`);
    }

    private initModels() {
        this.AccountSchema = new Schema({
            address: String,
            addressInHex: String,
            privateKey: String,
            publicKey: String
        });
        this.AccountModel = this.client.model<IAccount>("Account", this.AccountSchema)
    }

    public get Account() {
        return this.AccountModel;
    }
}

export interface IAccount extends Document {
    address: string;
    addressInHex: string;
    privateKey: string;
    publicKey: string;
}
