import { BigNumber } from "bignumber.js";
import { default as rp } from "request-promise-native";
import { Contract } from "web3-eth-contract";
import { AbiItem } from "web3-utils";
import { environment } from "../../../../environments/environment";
import { EthereumDB, IERC20Transfer } from "../EthereumDB";
import { EthereumService } from "../EthereumService";
import { IEtherscanTransaction, IEtherscanTransactions } from "../EtherscanResponses";
import { IEtherscanConfig } from "../ILocalNodeConfig";
import { defaultABI } from "./ERC20DefaultABI";
import { IERC20TransferResponse } from "./IERC20";
import { ILocalNodeConfig as Config} from "../ILocalNodeConfig";
import { AsyncForeach } from "../../../generic/AsyncForeach";
import * as cron from "node-cron";
import { ITransaction } from "../../../cryptoCurrencies/ICryptoCurrency";
import { default as Boom } from "boom";

export class ERC20Service {

    private storage: EthereumDB;
    private contractAddress: string;
    private abi: AbiItem[];
    private ethereumService: EthereumService;
    private tokenName: string;
    private tokenSymbol: string;
    private decimals: number;
    private contractInstance: Contract;
    private defaultGas: number;
    private defaultGasPrice: string;
    private etherscanConfig: IEtherscanConfig | null;
    private routeName: string;
    private config: Config;
    private lastBlockNumberAtCallback: number; //the last emitted block number at callback

    constructor(ethereumService: EthereumService, storage: EthereumDB, contractAddress: string, routeName: string, abi: AbiItem[] = null) {
        this.ethereumService = ethereumService;
        this.contractAddress = contractAddress;
        this.routeName = routeName;
        this.abi = abi ? abi : defaultABI;
        this.contractInstance = this.ethereumService.getContractInstance(this.contractAddress, this.abi); //new this.web3.eth.Contract(abi, address);
        this.defaultGas = 100000;
        this.defaultGasPrice = "2000000000";
        this.storage = storage;
        this.etherscanConfig = environment.localnodeConfigs.Ethereum.etherscan;
        this.config = environment.localnodeConfigs.Ethereum;
    }

    public async onInit() {
        this.tokenName = await this.contractInstance.methods.name().call(this.mainAccountTransaction());
        this.tokenSymbol = await this.contractInstance.methods.symbol().call(this.mainAccountTransaction());
        this.decimals = await this.contractInstance.methods.decimals().call(this.mainAccountTransaction());
        console.log(`The ${this.tokenName}(${this.tokenSymbol}) ERC20 contract initialized.` +
        `\n[${this.tokenSymbol}] Contract address: ${this.contractInstance.options.address}` +
        `\n[${this.tokenSymbol}] Used decimals: ${this.decimals}`);

        if(this.hasOwnExplorer()) {
            this.initExplorer();
        }
        if(this.config.walletChangeCallback && this.config.walletChangeCallback.enabled) {
            console.log(`[${this.tokenSymbol}] send callbacks to ${this.config.walletChangeCallback.callbackUri} with ${this.routeName} symbol and cron ${this.config.walletChangeCallback.cron.interval}`);
            await this.initCallback();
        }
    }

    public async getAccounts() {
        return this.ethereumService.getAccounts();
    }

    public getMainAccount() {
        return this.ethereumService.getMainAccount();
    }

    public async generateAccount(password: string) {
        return this.ethereumService.generateAccount(password);
    }

    public isAddress(address: string) {
        return this.ethereumService.isAddress(address);
    }

    public async getTransaction(txid: string): Promise<ITransaction> {
        //to make sure it is in the blockchain yet we query the blockchain itself
        let nativeTransaction = await this.ethereumService.getNativeTransaction(txid);

        //to receive 'amount' of the transaction
        if(!this.hasOwnExplorer()) {
            throw Boom.failedDependency("Cannot receive the value of the transaction, because no explorer configured");
        }

        const dbTransaction = await this.storage.ERC20Transfer.findOne({transactionHash: txid},"-_id -__v");
        if(dbTransaction.address !== this.contractAddress) {
            throw Boom.notFound(`The transaction not belongs to ${this.tokenSymbol} token`);
        }

        //rewrite the 'to' attribute, because it's always the contract address, and recheck accounts to define category
        nativeTransaction.to = dbTransaction.to;

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

        let transaction: ITransaction = await this.ethereumService.nativeTransactionToRegularTransaction(nativeTransaction, category);

        //amount calculation to humans O.O
        transaction.amount = this.transformFromBasicUnit(dbTransaction.value);
        return transaction;
    }

    public getNativeTransaction(txid: string) {
        return this.ethereumService.getNativeTransaction(txid);
    }

    public async getAccountTransaction(account: string, txid: string): Promise<ITransaction> {
        //perspective of the account
        let nativeTransaction = await this.ethereumService.getNativeTransaction(txid);

        //to receive 'amount' of the transaction
        if(!this.hasOwnExplorer()) {
            throw Boom.failedDependency("Cannot receive the value of the transaction, because no explorer configured");
        }

        const dbTransaction = await this.storage.ERC20Transfer.findOne({transactionHash: txid},"-_id -__v");
        if(!dbTransaction) {
            throw Boom.notFound(`The transaction ${txid} not found in the db`);
        }
        if(dbTransaction.address !== this.contractAddress) {
            throw Boom.notFound(`The transaction not belongs to ${this.tokenSymbol} token`);
        }
        //rewrite the 'to' attribute, because it's always the contract address, and recheck accounts to define category
        nativeTransaction.to = dbTransaction.to;

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

        let transaction: ITransaction = await this.ethereumService.nativeTransactionToRegularTransaction(nativeTransaction, category);

        transaction.amount = this.transformFromBasicUnit(dbTransaction.value);
        return transaction;
    }

    public async getAccountBalance(account: string): Promise<string> {
        const balance = await this.contractInstance.methods.balanceOf(account).call(this.mainAccountTransaction());
        return this.transformFromBasicUnit(balance);
    }

    public async listAccountTransactionsFromDb(account: string, page: number = 1, offset: number = 100): Promise<Array<IERC20Transfer>> {
        const transactions: Array<IERC20Transfer> = await this.storage.ERC20Transfer.find({
                $and: [
                    { $or:[ { from: { $regex: new RegExp("^" + account, "i") } }, { to: { $regex: new RegExp("^" + account, "i") } } ]},
                    { address: { $regex: new RegExp("^" + this.contractAddress, "i") } },
                    { removed: false }
                ]
            })
            .sort({ blockNumber: -1 })
            .skip((page - 1) * offset).limit(offset);
        transactions.forEach((transaction) => {
            transaction.value = this.transformFromBasicUnit(transaction.value);
        })
        return transactions;
    }

    public async listAccountDepositsFromDb(account: string, page: number = 1, offset: number = 100): Promise<Array<IERC20Transfer>> {
        const transactions: Array<IERC20Transfer> = await this.storage.ERC20Transfer.find({
                $and: [
                    { to: { $regex: new RegExp("^" + account, "i") } },
                    { address: { $regex: new RegExp("^" + this.contractAddress, "i") } },
                    { removed: false }
                ]
            })
            .sort({ blockNumber: -1 })
            .skip((page - 1) * offset).limit(offset);
        transactions.forEach((transaction) => {
            transaction.value = this.transformFromBasicUnit(transaction.value);
        })
        // return transactions.filter((transaction) => {
        //     return transaction.to.toLowerCase() === account.toLowerCase() && transaction.to !== transaction.from;
        // });
        return transactions;
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

    public async sendTokenFromMainWallet(
        toAddress: string,
        amount: string,
        options?: {
            priority?: "HIGH"|"MEDIUM"|"LOW"
        }): Promise<string> {
        await this.ethereumService.unlockMainAccount();
        return this.performWithdraw(this.getMainAccount(), toAddress, amount, options);
    }

    public async sendToken(
        fromAddress: string,
        toAddress: string,
        amount: string,
        password: string,
        options?: {
            priority?: "HIGH"|"MEDIUM"|"LOW"
        }): Promise<string> {
        await this.ethereumService.unlockAccount(fromAddress, password);
        return this.performWithdraw(fromAddress, toAddress, amount, options);
    }

    public async performWithdraw(fromAddress: string,
        toAddress: string,
        amount: string,
        options?: {
            priority?: "HIGH"|"MEDIUM"|"LOW"
        }): Promise<string> {
        try{
            return new Promise((resolve) => {
                const priority = options && options.priority ? options.priority : "MEDIUM";
                this.contractInstance.methods.transfer(toAddress, this.transformToBasicUnit(amount)).send(this.transactonOptions(fromAddress, this.getGasPrice(priority)))
                .once('transactionHash', function(hash: string){
                    resolve(hash);
                    // it has error but https://github.com/ethereum/web3.js/issues/2542 they're working on it now.
                });
            });
        }
        catch(e) {
            console.log(e);
        }
    }

    public hasOwnExplorer(): boolean {
        return this.storage && environment.localnodeConfigs.Ethereum.mongoDB.saveContractTransactions;
    }

    public async getBlockNumber(): Promise<number> {
        return await this.ethereumService.getBlockNumber();
    }

    public async listAccountTransactionsFromEtherscan(account: string, page: number = 1, offset: number = 100): Promise<Array<IEtherscanTransaction>> {
        const response: IEtherscanTransactions = await rp({
            method: "GET",
            uri: `${this.etherscanConfig.uri}?module=account&action=tokentx&contractaddress=${this.contractAddress}&address=${account}&page=${page}&offset=${offset}&sort=asc&apikey=${this.etherscanConfig.apiKey}`,
            json: true
        });
        response.result.forEach((transaction: IEtherscanTransaction) => {
            transaction.value = this.transformFromBasicUnit(transaction.value);
        })
        return response.result;
    }

    private getGasPrice(priority: "HIGH"|"MEDIUM"|"LOW"|null = null): string {
        if(priority) {
            return environment.localnodeConfigs.Ethereum.priorityGasPrices[priority];
        } else {
            return this.defaultGasPrice
        }
    }

    private mainAccountTransaction() {
        return this.transactonOptions(this.ethereumService.getMainAccount());
    }

    private transactonOptions(from: string, gasPrice: string = null) {
        return {
            from: from,
            gas: this.defaultGas,
            gasPrice: gasPrice ? gasPrice : this.defaultGasPrice
        }
    }

    private transformToBasicUnit(amount: string): string {
        return new BigNumber(amount).multipliedBy(new BigNumber(10).pow(this.decimals)).integerValue().toString();
    }

    private transformFromBasicUnit(amount: string): string {
        return new BigNumber(amount).multipliedBy(new BigNumber(10).pow(-this.decimals)).toString();
    }

    private initExplorer() {
        console.log(`[${this.tokenSymbol}] subscribe to Transfer events of the contract`);
        // const addressesToWatch = await this.getAccounts();
        this.contractInstance.events.Transfer({
            fromBlock: "latest",
            // address: addressesToWatch
        }, (error, event: IERC20TransferResponse) => {
            // console.log(`${this.tokenSymbol}: transaction happened: ${util.inspect(event)}`);
            if(error) {
                console.log(`Error at contract event listening: ${error}`);
            }

            const newERC20Transfer = new this.storage.ERC20Transfer({
                address: event.address,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
                blockHash: event.blockHash,
                removed: event.removed,
                id: event.id,
                from: event.returnValues.from,
                to: event.returnValues.to,
                value: event.returnValues.value,
                signature: event.signature
            });

            this.storage.ERC20Transfer.findOneAndUpdate({transactionHash: event.transactionHash}, newERC20Transfer, {upsert: true, new: true, runValidators: true}, (err, model) => {
                if(error) {
                    console.log("error happened at erc20 transaction mongoose upsert", err);
                }
            });
        });
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
                    const transactions: Array<IERC20Transfer> = await this.storage.ERC20Transfer.find(
                            { $and: [
                                { $or:[ { from: { $in: accounts } }, { to: { $in: accounts } } ] },
                                { address: this.contractAddress },
                                { blockNumber: { $gt: this.lastBlockNumberAtCallback } }
                            ]}
                        )
                        .sort({ blockNumber: -1 });
                    await AsyncForeach(transactions, async (transaction): Promise<void> => {

                        console.log(`transaction happened ${this.routeName}: ${transaction.transactionHash}`);
                        rp({
                            method: "GET",
                            uri: this.config.walletChangeCallback.callbackUri + "/" + this.routeName + "/" + transaction.transactionHash,
                            json: true
                        });
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
