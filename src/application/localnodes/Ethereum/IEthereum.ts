export interface ITransactionOptions {
    gas?: string | number;
    subFee?: boolean;
    priority?: "HIGH" | "MEDIUM" | "LOW"
}
