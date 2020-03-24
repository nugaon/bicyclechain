import { default as Client } from "bitcoin-core";
import { default as Boom } from "boom";
import { IBitcoinTransaction, IBitcoinTransactionNative, IFundRawTransaction, ISignedTransaction, IUnspentTransaction } from "./IBitcoinResponses";
import { ILocalNodeConfig } from "./ILocalNodeConfig";
import { ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";

export class BitcoinService {

    private client: Client;
    private priorityConfirmationBlocks: Object;
    private changeAddress: string; //the change is going to arrive this address after the transaction.
    private useSmartFee: boolean;
    private usePriorities: boolean;

    constructor(config: ILocalNodeConfig = null, useSmartFee: boolean = true) {

        if (config === undefined) {
            throw new Error("The Bitcoin localnode configuration not set.");
        }
        if (config) {
            this.client = new Client(config.rpcClient);
            console.log(`The Bitcoin Service initialized.`);
        } else {
            throw new Error("No passed valid config or bitcoin-core client at BitcoinService init");
        }

        this.priorityConfirmationBlocks = config.transactionPriority;
        // this.changeAddress = config.changeAddress;
        this.useSmartFee = useSmartFee;
        this.usePriorities = config.withdraw && config.withdraw.usePriorities ? config.withdraw.usePriorities : false;
    }

    public async onInit() {
        // this.defaultAccountAdresses = await this.client.getAddressesByAccount();
    }

    /**
    * Generate an account with an address on the specified blockchain (or return the address of the account if already exists)
    *
    * @param  {string} account account
    * @return {string} address
    */
    public async generateAccount(account: string) {
        return this.client.getNewAddress(account);
    }

    /**
    * Get accounts that the wallet contains
    */
    public async getAccounts(): Promise<any> {
        return this.client.listLabels();
    }

    /**
    * Get the balance of the specified account. The local node should be updated
    *
    * @param  {string} addressOrAccount account or address
    * @param  {boolean} isAccount the addressOrAccount is account or not
    * @return {string} balance in btc
    */
    public async getBalance(addressOrAccount: string, isAccount: boolean) {
        const unspentTransactions: Array<IUnspentTransaction> = await this.listUnspentTransactions(addressOrAccount, isAccount);
        let balance = 0;
        if (unspentTransactions.length) {
            unspentTransactions.forEach((unspentTransaction) => {
                balance += this.roundBitcoin(unspentTransaction.amount);
            });
        }
        return balance.toString();
    }

    /**
    * Get the whole balance of the wallet. The local node should be updated
    *
    * @return {string} balance in btc
    */
    public async getGlobalBalance(): Promise<string> {
        return this.client.getBalance();
    }

    /**
    * Get transaction by ID and set type label (RECEIVE, SENT, OTHER) from viewpoint of your wallet
    *
    * @param  {string} id txid
    * @return {ITransaction} transaction
    */
    public async getTransaction(id: string): Promise<ITransaction> {
        try {
            const transaction: IBitcoinTransactionNative = await this.client.getTransaction(id);
            let category: "SEND" | "RECEIVE" | "OTHER";
            if(+transaction.amount > 0) {
                category = "RECEIVE";
            } else if (+transaction.amount < 0) {
                category = "SEND";
            } else {
                category = "OTHER";
            }
            return this.nativeTransactionToRegularTransaction(transaction, category);
        }
        catch (e) {
            throw Boom.notAcceptable(e.message);
        }
    }

    /**
    * Get the details of a specific transaction The local node should be updated
    *
    * @param  {string} id txid
    * @return {IBitcoinTransactionNative} transaction
    */
    public async getNativeTransaction(id: string): Promise<IBitcoinTransactionNative> {
        try {
            const resp = await this.client.getTransaction(id);
            return resp;
        }
        catch (e) {
            throw Boom.notAcceptable(e.message);
        }
    }

    public async getAccountTransaction(addressOrAccount: string, txid: string): Promise<ITransaction> {
        try {
            let transaction: IBitcoinTransactionNative = await this.client.getTransaction(txid);
            let addressGiven: boolean = await this.isAddress(addressOrAccount);
            //category decision
            let category: "SEND" | "RECEIVE" | "OTHER";
            if(+transaction.amount > 0) {
                category = "RECEIVE";
            } else if (+transaction.amount < 0) {
                category = "SEND";
            } else {
                for (const detail of transaction.details) {
                    if((addressGiven && detail.address.toLowerCase() === addressOrAccount.toLowerCase())
                    || detail.label === addressOrAccount) {
                        transaction.amount = detail.amount + "";
                        switch (detail.category) {
                            case "send":
                                category = "SEND";
                                break;
                            case "receive":
                                category = "RECEIVE";
                                break;
                        }
                    }
                }
            }
            return this.nativeTransactionToRegularTransaction(transaction, category);
        }
        catch (e) {
            throw Boom.notAcceptable(e.message);
        }
    }

    /**
    * Get depsoits of an account. The local node should be updated
    *
    */
    public async listAccountDeposits(addressOrAccount: string, page: number = 1, offset: number = 100) {
        page -= 1;
        let transactions: Array<IBitcoinTransaction> = await this.client.listTransactions(addressOrAccount, offset, page * offset);
        return transactions.filter((transaction) => {
            return transaction.category === "receive";
        });
    }
    /**
    * Get transactions of an account. The local node should be updated
    *
    * @param  {string} account account
    * @param  {Object} options additional parameters that concerns to the list transactions (offset)
    * @return {Array<IBitcoinTransaction>} transaction
    */
    public async listAccountTransactions(
        addressOrAccount: string,
        options?: {
            page?: number, offset?: number
        }
    ): Promise<Array<IBitcoinTransaction>> {
        const offset = options && options.offset ? options.offset : 20;
        const page = options && options.page ? options.page - 1 : 0;
        const accontTransactions = await this.client.listTransactions(addressOrAccount, offset, page * offset);

        //add sended transactions also which listed in the root account
        let sentFromMainAccountTransactions: Array<IBitcoinTransaction> = await this.client.listTransactions("*", offset, page * offset);
        if (sentFromMainAccountTransactions.length) {
            sentFromMainAccountTransactions = sentFromMainAccountTransactions.filter((transansaction) => {
                return transansaction.label === addressOrAccount && transansaction.category === "send";
            });
        }
        let returnableTransactions = accontTransactions.concat(sentFromMainAccountTransactions);

        //sort
        returnableTransactions.sort(function(a : IBitcoinTransaction, b : IBitcoinTransaction){
            return a.confirmations - b.confirmations;
        });

        return returnableTransactions;
    }

    /**
    * Get unspent transactions of an address or account. The local node should be updated
    *
    * @param  {string} addressOrAccount account or address
    * @param  {boolean} account isAccount
    * @return {Array<IBitcoinTransaction>} transaction
    */
    public async listUnspentTransactions(addressOrAccount: string = null, account: boolean = false): Promise<Array<IUnspentTransaction>> {
        let unspent: Array<IUnspentTransaction> = await this.client.listUnspent();
        if (account) {
            unspent = unspent.filter((unspentTransaction) => unspentTransaction.label === addressOrAccount);
        } else {
            unspent = unspent.filter((unspentTransaction) => unspentTransaction.address === addressOrAccount);
        }
        return unspent;
    }

    /**
     * Perform withdraw to an address use by all unspent transactions.
     *
     * @param  {string} sendFrom Address
     * @param  {string} sendTo amount of btc
     * @param  {string} amount fee in btc for the transaction
     * @param  {Object} options additional parameters that concerns to the withdraw
     * @return {string} Returns the transaction id.
     */

    public async performWithdraw(
        sendFrom: string,
        sendTo: string,
        amount: string,
        options?: {
            priority?: "HIGH" | "MEDIUM" | "LOW",
            subFee?: boolean,
            changeAddress?: string
        }) {
        const priority = options.priority ? options.priority : "MEDIUM";

        const subFee = options.subFee ? options.subFee : false;

        ///Create more easily withdraws.
        try {
            if(this.usePriorities) {
                const fee = await this.calculateTxFee(priority);
                await this.client.setTxFee(fee);
            }

            const txid: string = this.client.sendToAddress(sendTo, +amount, "", "", subFee);
            return txid;
        } catch(e) {
            console.log(`transaction has not been happened for ${sendTo} ; ${amount}`)
            throw Boom.notAcceptable(e.message);
        }

        //TODO refactor this codeblock to generate the changeaddresses at witdrawals.
        // const changeAddress = options.changeAddress ? options.changeAddress : this.changeAddress;
        // if (changeAddress === sendTo) {
        //     throw Boom.notAcceptable("The change address is indentical to sendTo address");
        // }
        //
        // let unspentTransactions: Array<IUnspentTransaction>;
        // if (!sendFrom) {
        //     unspentTransactions = await this.client.listUnspent();
        // } else {
        //     unspentTransactions = await this.listUnspentTransactions(sendFrom, !await this.isAddress(sendFrom));
        // }
        //
        // const listTransactions = [];
        // let transactionAmount = 0;
        // let amountNumber = +amount;
        // //no ask for globalbalance (HTTP call), work with unspent transactions which are necessary.
        // if (unspentTransactions.length > 0) {
        //     unspentTransactions.some((unspentTransaction) => {
        //
        //         listTransactions.push({
        //             txid: unspentTransaction.txid,
        //             vout: unspentTransaction.vout
        //         });
        //         transactionAmount += parseFloat(unspentTransaction.amount);
        //         return transactionAmount >= amountNumber;
        //     });
        //     if (amountNumber <= transactionAmount) {
        //         try {
        //             const fee = await this.calculateTxFee(priority);
        //             const rawTransactionId = await this.createRawTransaction(listTransactions, sendTo, amountNumber, fee, subFee);
        //             const fundRawTransaction = await this.fundRawTransaction(rawTransactionId, changeAddress);
        //             const signedRawTransaction = await this.signRawTransaction(fundRawTransaction);
        //             const sendedTxId = await this.sendRawTransaction(signedRawTransaction);
        //             return sendedTxId;
        //         } catch (e) {
        //             throw Boom.notAcceptable(e.message);
        //         }
        //     }
        //     else {
        //         throw Boom.notAcceptable(`Insufficient funds. Requested for ${amountNumber} and only have ${transactionAmount}`);
        //     }
        // } else {
        //     throw Boom.notAcceptable("No unspent transaction available.");
        // }
    }

    /**
     * Submits raw transaction (serialized, hex-encoded) to local node and network.
     *
     * @param  {string} address
     * @return {boolean} isAddress
     */
     public async isAddress(address: string): Promise<boolean> {
        const valid = await this.client.validateAddress(address);
        if (valid.isvalid)
            return true;
        return false;
    }

    public nativeTransactionToRegularTransaction(transaction: IBitcoinTransactionNative, category: "OTHER" | "SEND" | "RECEIVE"): ITransaction {
        let returnableTransaction: ITransaction = {
            txid: transaction.txid,
            amount: transaction.amount.toString(),
            confirmations: transaction.confirmations,
            category: category,
            additionalInfo: {
                fee: transaction.fee
            }
        };

        for (const detail of transaction.details) {

            switch (detail.category) {
                case "send":
                    returnableTransaction.from = detail.address;
                    returnableTransaction.additionalInfo.fromAccount = detail.label;
                    break;
                case "receive":
                    if(detail.address === this.changeAddress) {
                        continue;
                    }
                    returnableTransaction.to = detail.address;
                    returnableTransaction.additionalInfo.toAccount = detail.label;
                    break;
            }
        }

        return returnableTransaction;
    }

    private async calculateTxFee(priority: "HIGH" | "LOW" | "MEDIUM") {
        if (this.useSmartFee) {
            const confirmations = this.priorityConfirmationBlocks[priority];
            const fee = await this.client.estimateSmartFee(confirmations);
            console.log("fee1", fee);
            return fee.feerate;
        }
        else {
            return this.client.estimateFee();
        }
    }

    /**
     * Create a transaction spending given inputs, send to given address(es)
     *
     * @param  {Array<IUnspentTransaction>} transactions IUnspentTransaction array
     * @param  {string} sendTo Address
     * @param  {float} amount amount of btc
     * @param  {float} fee fee in btc for the transaction
     * @param  {boolean} subFee the fee subtracts from the amount
     * @return {string} Returns the hex-encoded transaction in a string
     */
    private async createRawTransaction(transactions: Array<IUnspentTransaction>, sendTo: string, amount: number, fee: number, subFee: boolean = false) {
        if (subFee) {
            fee = this.roundBitcoin(fee);
            if(fee>=amount){
                throw Boom.notAcceptable("Fee must be less then amount(or turn off subFee)");
            }
            amount = amount - fee;
            amount = this.roundBitcoin(amount);
        }
        await this.client.setTxFee(fee);
        return await this.client.createRawTransaction(transactions, { [sendTo]: amount });
    }

    /**
     * Add sufficient unsigned inputs to meet the output value
     *
     * @param  {string} rawTransaction raw transaction hex from createRawTransaction method
     * @param  {string} changeAddress the change
     * @return {IFundRawTransaction} the funded transaction object
     */
    private async fundRawTransaction(rawTransaction: string, changeAddress: string | null): Promise<IFundRawTransaction> {

        return await this.client.fundRawTransaction(rawTransaction, { "changeAddress": changeAddress });
    }

    /**
     * Adds signatures to a raw transaction and returns the signed transaction
     *
     * @param  {IFundRawTransaction} rawTransaction hex encoded transaction
     * @return {ISignedTransaction} Signed raw transaction object
     */
    private async signRawTransaction(rawTransaction: IFundRawTransaction): Promise<ISignedTransaction> {
        return await this.client.signRawTransaction(rawTransaction.hex);
    }

    /**
     * Submits raw transaction (serialized, hex-encoded) to local node and network.
     *
     * @param  {ISignedTransaction} signedTransaction
     * @return {string} Transaction hash
     */
    private async sendRawTransaction(signedTransaction: ISignedTransaction) {
        return await this.client.sendRawTransaction(signedTransaction.hex);
    }

    //the bitcoin only 8
    private roundBitcoin(number: any) {
        const precision = 8;
        number = +number;
        return number.toFixed(precision);
    }
}
