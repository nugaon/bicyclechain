import { Socket } from "net";
import { default as rp } from "request-promise-native";
import { default as Web3 } from "web3";
import { TransactionReceipt, Transaction } from "web3-core";
import { BlockHeader } from "web3-eth";
import { Unit } from "web3-utils";
import { environment } from "../../../environments/environment";
import { ICryptoCurrency, ITokenRouteMapping } from "../../cryptoCurrencies/ICryptoCurrency";
import { AsyncForeach } from "../../generic/AsyncForeach";
import { EthereumDB } from "./EthereumDB";
import { INormalTransaction } from "./EthereumDB";
import { IEtherscanTransaction, IEtherscanTransactions } from "./EtherscanResponses";
import { ITransactionOptions } from "./IEthereum";
import { IContractConfig, IEtherscanConfig, ILocalNodeConfig } from "./ILocalNodeConfig";
import { ERC20Controller } from "./tokens/ERC20Controller";
import { ILocalNodeConfig as Config} from "./ILocalNodeConfig";
import { default as Boom } from "boom";
import { ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";
import * as cron from "node-cron";

export class EthereumService {

    private mainWalletPassword: string;
    private web3: Web3;
    private etherscanConfig: IEtherscanConfig | null;
    private tokens: Array<IContractConfig>;
    private storage: EthereumDB;
    private config: Config;
    private lastBlockNumberAtCallback: number; //the last emitted block number at callback

    constructor() {
        const config: ILocalNodeConfig | undefined = environment.localnodeConfigs.Ethereum;
        if(config === undefined) {
            throw new Error("The Ethereum localnode configuration not set.");
        }
        this.config = config;
        if(config.withContracts) {
            this.tokens = config.withContracts;
        }


        let connectionParameters: any;
        if(config.connectionType === "websocket") {
            connectionParameters = new Web3.providers.WebsocketProvider(config.connectionString);
        } else if (config.connectionType === "http") {
            connectionParameters = new Web3.providers.HttpProvider(config.connectionString);
        }
        let web3Config = config.web3Config; //we should add the signTx function
        const netSocket = new Socket();

        this.mainWalletPassword = config.mainWalletPassword;

        this.web3 = new Web3(connectionParameters, netSocket);
        this.web3.defaultAccount = web3Config.defaultAccount;
        this.web3.defaultGas = web3Config.defaultGas;
        this.web3.defaultGasPrice = web3Config.defaultGasPrice;
        this.web3.transactionBlockTimeout = web3Config.transactionBlockTimeout;
        this.web3.transactionPollingTimeout = web3Config.transactionPollingTimeout;
        this.web3.transactionConfirmationBlocks = web3Config.transactionConfirmationBlocks;

        this.etherscanConfig = config.etherscan ? config.etherscan : null;

        console.log(`The EthereumService initialized.` +
            `\n[ETH] main address is: ${this.web3.defaultAccount}`);
    }

    public async onInit() {
        if(this.config.mongoDB) {
            await this.initExplorer();
            if(this.config.mongoDB.removeNotUsedTransactions && this.config.mongoDB.removeNotUsedTransactions.atServerStart) {
                this.removeNotUsedTransactionsFromDb();
            }
        }
        if(this.config.walletChangeCallback && this.config.walletChangeCallback.enabled) {
            console.log(`[ETH] send callbacks to ${this.config.walletChangeCallback.callbackUri} with cron ${this.config.walletChangeCallback.cron.interval}`);
            await this.initCallback();
        }
    }

    public async onDestroy() {
        await this.storage.onDestroy();
    }

    public async getAccounts(): Promise<Array<string>> {
        return this.web3.eth.personal.getAccounts();
    }

    /**
    * Get a specified account's balance. The local node should be updated
    *
    * @param  {string} account
    * @param  {Unit} currency ether, wei, etc. (nullable)
    * @return {string} balance in ether
    */
    public async getBalance(account: string, currency: Unit = "ether") {
        const balanceInWei = await this.web3.eth.getBalance(account);
        return this.web3.utils.fromWei(balanceInWei, currency);
    }

    public async listAccountTransactions(account: string, currency: Unit = "ether") {
        if(this.etherscanConfig) {
            return this.etherscanTransactions(account, currency);
        }
    }

    public async getTransaction(txid: string): Promise<ITransaction> {
        //perspective of the wallet
        const nativeTransaction = await this.getNativeTransaction(txid);
        const currentAccounts = await this.getAccounts();
        let category: "RECEIVE" | "SEND" | "OTHER";
        if(currentAccounts.includes(nativeTransaction.from)) {
            category = "SEND";
            if(currentAccounts.includes(nativeTransaction.to)) {
                category = "OTHER";
            }
        } else if(currentAccounts.includes(nativeTransaction.to)){
            category = "RECEIVE";
        } else {
            category = "OTHER";
        }
        const transaction: ITransaction = await this.nativeTransactionToRegularTransaction(nativeTransaction, category);
        return transaction;
    }

    public async getNativeTransaction(txid: string) {
        return this.web3.eth.getTransaction(txid);
    }

    public async getAccountTransaction(account, txid): Promise<ITransaction> {
        //perspective of the user
        const nativeTransaction = await this.getNativeTransaction(txid);
        let category: "RECEIVE" | "SEND" | "OTHER";
        if(nativeTransaction.from.toLowerCase() === account.toLowerCase()) {
            category = "SEND";
            if(nativeTransaction.to.toLowerCase() === account.toLowerCase()) {
                category = "OTHER";
            }
        } else if(nativeTransaction.to.toLowerCase() === account.toLowerCase()){
            category = "RECEIVE";
        } else {
            category = "OTHER";
        }
        let transaction: ITransaction = await this.nativeTransactionToRegularTransaction(nativeTransaction, category);
        return transaction;
    }

    public async getBlockNumber(): Promise<number> {
        if (!await this.web3.eth.isSyncing()) {
            return this.web3.eth.getBlockNumber();
        } else {
            throw Boom.serverUnavailable("Ethereum is syncing");
        }
    }

    public async listAccountDeposits(account: string, currency: Unit = "ether") {
        //TODO filtered transactions from blocks
        const etherscanTransactionsArray = await this.etherscanTransactions(account, currency);

        return etherscanTransactionsArray.filter((etherscanTransaction) => {
            return etherscanTransaction.to.toLowerCase() === account.toLowerCase() && etherscanTransaction.to !== etherscanTransaction.from;
        });
    }

    public async generateAccount(password: string) {
        return this.web3.eth.personal.newAccount(password);
    }

    /**
    * Create a ether transaction spending to given account from the initialized main wallet
    *
    * @param  {String} toAccount
    * @param  {String} amount Amount of the ether to be sended
    * @param  {Object} options additional options
    * @return {TransactionReceipt} Returns the transaction Object.
    */
    public async sendEtherFromMainWallet(
        toAccount: string,
        amount: string,
        options?: ITransactionOptions): Promise<string> {
        return this.sendEtherWithUnlock(this.web3.defaultAccount, toAccount, amount, this.mainWalletPassword, options);
    }

    /**
    * Create a ether transaction spending to given account
    */
    public async sendEtherWithUnlock(
        fromAccount: string,
        toAccount:string,
        amount: string,
        password: string,
        options?: ITransactionOptions): Promise<string> {

        try {
            await this.unlockAccount(fromAccount, password);
        } catch (e) {
            throw Boom.badData("The given password is wrong");
        }
        try {
            const txid = await this.sendEther(fromAccount, toAccount, amount, options);
            return txid;
        } catch (e) {
            throw Boom.notAcceptable(e);
        }
    }

    public getMainAccount(): string {
        return this.web3.defaultAccount;
    }

    public isAddress(address: string): boolean {
        return this.web3.utils.isAddress(address);
    }

    public getContractInstance(address: string, abi: any) {
        return new this.web3.eth.Contract(abi, address);
    }

    public async sendTransaction(txObject: any): Promise<TransactionReceipt> {
        return this.web3.eth.sendTransaction(txObject);
    }

    public async unlockMainAccount(): Promise<boolean> {
        return this.unlockAccount(this.web3.defaultAccount, this.mainWalletPassword);
    }

    public async unlockAccount(account: string, password: string, duration = null) {
        return this.web3.eth.personal.unlockAccount(account, password, duration ? duration : 600);
    }

    public async listAccountTransactionsFromDb(account: string, page: number = 1, offset: number = 100): Promise<Array<INormalTransaction>> {
        const transactions: Array<INormalTransaction> = await this.storage.NormalTransaction.find(
                { $or:[ { from: { $regex: new RegExp("^" + account, "i") } }, { to: { $regex: new RegExp("^" + account, "i") } } ]
            })
            .sort({ blockNumber: -1 })
            .skip((page - 1) * offset).limit(offset);
        const returnableTransactions: Array<INormalTransaction> = [];

        await AsyncForeach(transactions, async (transaction): Promise<void> => {
            if(!transaction.blockNumber) { // check if the transaction was just pending when we stored. if its we save its block number
                const transactionFromChain = await this.web3.eth.getTransaction(transaction.hash);
                if(!transactionFromChain) {
                    console.log(`The transaction is not in the ledger, maybe corrupted, delete from database`, transaction);
                    transaction.remove();
                } else if (!transactionFromChain.blockNumber) {
                    console.log(`The transaction is not in the validated ledger yet.`, transaction);
                }
                else {
                    transaction.blockNumber = transactionFromChain.blockNumber;
                    await transaction.save();
                    transaction.value = this.web3.utils.fromWei(transaction.value, "ether");
                    returnableTransactions.push(transaction);
                }
            } else {
                transaction.value = this.web3.utils.fromWei(transaction.value, "ether");
                returnableTransactions.push(transaction);
            }
        });
        return returnableTransactions;
    }

    public async listAccountTransactionsFromEtherscan(account: string, page: number = 1, offset: number = 100): Promise<Array<IEtherscanTransaction>> {
        const response: IEtherscanTransactions = await rp({
            method: "GET",
            uri: `${this.etherscanConfig.uri}?module=account&action=txlist&address=${account}&startblock=0&endblock=999999999&sort=arc&apikey=${this.etherscanConfig.apiKey}&page=${page}&offset=${offset}`,
            json: true
        });
        if(response.status === "1") {
            response.result.forEach((transaction: IEtherscanTransaction) => {
                transaction.value = this.web3.utils.fromWei(transaction.value, "ether");
            });
            return response.result;
        } else {
            console.log("No successful return at listAccountTransactionsFromEtherscan", response);
            throw Boom.badData("The etherscan service not available or you should pay for them for the API usage");
        }
    }

    public async listAccountDepositsFromEtherscan(account: string, page: number = 1, offset: number = 100) {
        //TODO filtered transactions from blocks
        const etherscanTransactionsArray = await this.listAccountTransactionsFromEtherscan(account, page, offset);

        // return etherscanTransactionsArray.filter((etherscanTransaction) => {
        //     return etherscanTransaction.to.toLowerCase() === account.toLowerCase() && etherscanTransaction.to !== etherscanTransaction.from;
        // });
        return etherscanTransactionsArray.filter((etherscanTransaction) => {
            return etherscanTransaction.to.toLowerCase() === account.toLowerCase();
        });
    }

    public async listAccountDepositsFromDb(account: string, page: number = 1, offset: number = 100): Promise<Array<INormalTransaction>> {
        const transactions: Array<INormalTransaction> = await this.storage.NormalTransaction.find({ to: { $regex: new RegExp("^" + account, "i") } })
            .sort({ blockNumber: -1 })
            .skip((page - 1) * offset).limit(offset);

        const returnableTransactions: Array<INormalTransaction> = [];
        await AsyncForeach(transactions, async (transaction): Promise<void> => {
            if(!transaction.blockNumber) { // check if the transaction was just pending when we stored. if its we save its block number
                const transactionFromChain = await this.web3.eth.getTransaction(transaction.hash);
                if(!transactionFromChain) {
                    console.log(`The transaction is not in the ledger, maybe corrupted, delete from database`, transaction);
                    transaction.remove();
                } else if (!transactionFromChain.blockNumber) {
                    console.log(`The transaction is not in the validated ledger yet.`, transaction);
                }
                else {
                    transaction.blockNumber = transactionFromChain.blockNumber;
                    await transaction.save();
                    transaction.value = this.web3.utils.fromWei(transaction.value, "ether");
                    returnableTransactions.push(transaction);
                }
            } else {
                transaction.value = this.web3.utils.fromWei(transaction.value, "ether");
                returnableTransactions.push(transaction);
            }
        });
        // return transactions.filter((transaction) => {
        //     return transaction.to.toLowerCase() === account.toLowerCase() && transaction.to !== transaction.from;
        // });
        return transactions;
    }

    public async initTokens() {
        const tokenInstances: Array<ICryptoCurrency> = [];
        const routeMapping: Array<ITokenRouteMapping> = [];
        if(this.tokens) {
            await AsyncForeach(this.tokens, async (token): Promise<void> => {
                if(token.type == "ERC20") {
                    const tokenInstance = new ERC20Controller(this, this.storage, token.address, token.route, token.customAbi);
                    await tokenInstance.onInit();
                    const refereinceId = `TOKEN-ETHEREUM-ERC20-${token.route}`;
                    routeMapping.push({
                        route: token.route,
                        referenceId: refereinceId
                    });
                    tokenInstances[refereinceId] = tokenInstance;
                }
            });
        }
        return {
            routeMapping: routeMapping,
            instances: tokenInstances
        };
    }

    public async getTransactionReceipt(txid: string) {
        return this.web3.eth.getTransactionReceipt(txid);
    }

    private async sendEther(
        fromAccount: string,
        toAccount: string,
        amount: string,
        options?: ITransactionOptions): Promise<string> {
        const gasPriceInWei = this.getGasPrice(options.priority);
        const gas = options.gas ? options.gas : this.web3.defaultGas;
        this.web3.utils.toWei(amount, "ether");
        let balanceInWei = this.web3.utils.toBN(this.web3.utils.toWei(amount, "ether"));
        if(options.subFee) {
            balanceInWei.sub(this.web3.utils.toBN(gasPriceInWei).mul(this.web3.utils.toBN("21000"))).toString(); //21000 gas used in a sample ethereum transaction.
        } else {
            balanceInWei.toString();
        }

        return new Promise((resolve, reject) => {
            this.web3.eth.sendTransaction({
                from: fromAccount,
                to: toAccount,
                value: balanceInWei,
                gasPrice: gasPriceInWei,
                gas: gas
            }).once("transactionHash", function(hash: string){
                resolve(hash);
                // it has error but https://github.com/ethereum/web3.js/issues/2542 they're working on it now.
            }).once("error", function(error) {
                reject(error);
            });
        });

    }

    private getGasPrice(priority: "HIGH"|"MEDIUM"|"LOW"|null = null): string {
        if(priority) {
            return environment.localnodeConfigs.Ethereum.priorityGasPrices[priority];
        } else {
            return this.web3.defaultGasPrice;
        }
    }

    private async removeNotUsedTransactionsFromDb() {
        console.log("\t[ETH] remove transactions which not belong to the accounts of the application")
        const accounts = await this.getAccounts();
        await this.storage.NormalTransaction.deleteMany({
            $or: [
                { to: { $nin: accounts } },
                { from: { $nin: accounts } }
            ]
        });
    }

    private async etherscanTransactions(account: string, currency: Unit): Promise<Array<IEtherscanTransaction>> {
        let transactions: any[] = [];
        let etherscanTransactionsArray = await this.etherscanTransactionsRequest(account);
        etherscanTransactionsArray.result.forEach((etherscanTransaction: IEtherscanTransaction) => {
            etherscanTransaction.gasPrice = this.web3.utils.fromWei(etherscanTransaction.gasPrice.toString(), currency);
            etherscanTransaction.value = this.web3.utils.fromWei(etherscanTransaction.value.toString(), currency);

            transactions.push(etherscanTransaction);
        });

        return transactions;
    }

    private async etherscanTransactionsRequest(account: string): Promise<IEtherscanTransactions> {
        if(!this.etherscanConfig) {
            throw Boom.methodNotAllowed("Etherscan config was not set in Ethereum configuration.");
        }
        return rp({
            method: "GET",
            uri: `${this.etherscanConfig.uri}?module=account&action=txlist&address=${account}&startblock=0&endblock=999999999&sort=arc&apikey=${this.etherscanConfig.apiKey}`,
            json: true
        });
    }

    public hasOwnExplorer(): boolean {
        return this.storage && environment.localnodeConfigs.Ethereum.mongoDB.saveNormalTransactions;
    }

    public async nativeTransactionToRegularTransaction(nativeTransaction: Transaction, category: "RECEIVE" | "OTHER" | "SEND"): Promise<ITransaction> {
        const currentBlockNumber = await this.getBlockNumber();

        return {
            txid: nativeTransaction.hash,
            amount: this.web3.utils.fromWei(nativeTransaction.value),
            confirmations: currentBlockNumber - nativeTransaction.blockNumber,
            category: category,
            to: nativeTransaction.to,
            from: nativeTransaction.from
        }
    }

    private async initExplorer() {
        this.storage = new EthereumDB();
        await this.storage.onInit();
        if(this.hasOwnExplorer()) {
            if(this.config.mongoDB.savePendingTransactions) {
                console.log(`[ETH] subscribe to Log events`);
                const addressesToWatch = await this.getAccounts();
                this.web3.eth.subscribe("pendingTransactions", {
                    address: addressesToWatch
                }, async (error, txid: string) => {
                    if(!error) {
                        const transaction: Transaction = await this.web3.eth.getTransaction(txid);
                        const normalTransaction = new this.storage.NormalTransaction(transaction);
                        normalTransaction.save();
                    } else {
                        console.log(`Error happened at ETH subscription`, error);
                    }
                });
            } else {
                console.log(`[ETH] subscribe to new block header event`);
                this.web3.eth.subscribe("newBlockHeaders", null, async (error: Error, blockHeader: BlockHeader) => {
                    //unfortunately this subscrption doesn't work like it should -> https://github.com/ethereum/web3.js/issues/2726
                    if(error) {
                        console.log("[ETH] Error at new block headers event", error);
                        return;
                    }
                    try {
                        const currentBlock = await this.web3.eth.getBlock(blockHeader.hash, true);
                        // console.log("transaction docs", currentBlock.transactions);
                        const duplicateTxIds: Array<string> = [];
                        currentBlock.transactions.forEach((transaction) => {
                            duplicateTxIds.push(transaction.hash);
                        });

                        await this.storage.NormalTransaction.deleteMany({hash: { "$in": duplicateTxIds }}); //delete every transactions which the reorganized block has.
                        await this.storage.NormalTransaction.deleteMany({blockNumber: blockHeader.number}); //we delete the older version transactions of the reorganized block.
                        this.storage.NormalTransaction.insertMany(currentBlock.transactions);
                    } catch(e) {
                        console.log(`An error occured at new transaction insertion at block number ${blockHeader.number}`, e);
                    }
                });
            }
        }
    }

    private async initCallback() {
        if(this.config.walletChangeCallback.cron.startBlockNumber) {
            this.lastBlockNumberAtCallback = this.config.walletChangeCallback.cron.startBlockNumber;
        } else {
            this.lastBlockNumberAtCallback = await this.getBlockNumber();
        }
        cron.schedule(this.config.walletChangeCallback.cron.interval, async () => {
            try {
                const accounts = await this.getAccounts();
                const currentBlockNumber = await this.getBlockNumber();
                if(this.hasOwnExplorer() && currentBlockNumber) {
                    const transactions: Array<INormalTransaction> = await this.storage.NormalTransaction.find(
                            { $and: [
                                { $or:[ { from: { $in: accounts } }, { to: { $in: accounts } } ] },
                                { blockNumber: { $gt: this.lastBlockNumberAtCallback } }
                            ]}
                        )
                        .sort({ blockNumber: -1 });
                    await AsyncForeach(transactions, async (transaction): Promise<void> => {
                        if(transaction.value != "0") {
                            console.log(`transaction happened eth: ${transaction.hash}`);
                            rp({
                                method: "GET",
                                uri: this.config.walletChangeCallback.callbackUri + "/eth/" + transaction.hash,
                                json: true
                            });
                        }
                    });
                    this.lastBlockNumberAtCallback = currentBlockNumber;
                } else {
                    throw new Error("[ETH] No MongoDB configuration for Callback function");
                }

            } catch (e) {
                console.log("[ETH] ERROR: callback error", e);
            }
        });
    }
}
