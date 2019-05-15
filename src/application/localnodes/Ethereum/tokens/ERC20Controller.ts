import { IAddressCheck, ICryptoCurrency, ITransaction } from "../../../cryptoCurrencies/ICryptoCurrency";
import { DbERC20TransactionsToRegularTransactions, EthereumDB, IERC20Transfer } from "../EthereumDB";
import { EthereumService } from "../EthereumService";
import { etherscanTransactionsToRegularTransactions, IEtherscanTransaction } from "../EtherscanResponses";
import { ERC20Service } from "./ERC20Service";
import { AbiItem } from "web3-utils";

export class ERC20Controller implements ICryptoCurrency {

    private service: ERC20Service;

    constructor(ethereumService: EthereumService, ethereumDB: EthereumDB, contractAddress: string, routeName: string, abi: Array<AbiItem> = null) {
        this.service = new ERC20Service(ethereumService, ethereumDB, contractAddress, routeName, abi);
    }

    public async onInit() {
        this.service.onInit();
    }

    public async onDestroy() { }

    public async getAccounts() {
        return this.service.getAccounts();
    }

    public async getAccountBalance(req: any) {
        const account = req.params.account;

        const balance = await this.service.getAccountBalance(account);
        return {"account": account, "balance": balance};
    }

    public async getGlobalBalance() {
        const account = this.service.getMainAccount();
        const balance = await this.service.getAccountBalance(account);
        return {account: account, balance: balance};
    }

    public async listAccountTransactions(req: any) {
        const account = req.params.account;
        const page = (req.payload && req.payload.page) ? req.payload.page : 1;
        const offset = (req.payload && req.payload.offset) ? req.payload.offset : 100;
        const currentBlockNumber = await this.service.getBlockNumber(); //to calculate confirmations
        let standardizedTransactions: Array<ITransaction> = [];
        if(this.service.hasOwnExplorer()) {
            const transactions: Array<IERC20Transfer> = await this.service.listAccountTransactionsFromDb(account, page, offset);
            if(transactions) {
                standardizedTransactions = DbERC20TransactionsToRegularTransactions(transactions, currentBlockNumber, account);
            }
        } else {
            const transactions: Array<IEtherscanTransaction> | undefined = await this.service.listAccountTransactionsFromEtherscan(account);
            if(transactions) {
                standardizedTransactions = etherscanTransactionsToRegularTransactions(transactions, account);
            }
        }
        return standardizedTransactions;
    }

    public async getTransaction(txid: string) {
        return this.service.getTransaction(txid);
    }

    public async getNativeTransaction(txid: string) {
        return this.service.getNativeTransaction(txid);
    }

    public async getAccountTransaction(req: any) {
        const account = req.params.account;
        const txid = req.params.txid;
        return this.service.getAccountTransaction(account, txid);
    }

    public async listAccountDeposits(req: any) {
        const account = req.params.account;
        const page = (req.payload && req.payload.page) ? req.payload.page : 1;
        const offset = (req.payload && req.payload.offset) ? req.payload.offset : 100;

        const currentBlockNumber = await this.service.getBlockNumber(); //to calculate confirmations
        let standardizedTransactions: Array<ITransaction> = [];
        if(this.service.hasOwnExplorer()) {
            const transactions: Array<IERC20Transfer> = await this.service.listAccountDepositsFromDb(account, page, offset);
            if(transactions) {
                standardizedTransactions = DbERC20TransactionsToRegularTransactions(transactions, currentBlockNumber, account);
            }
        } else {
            const transactions: Array<IEtherscanTransaction> | undefined = await this.service.listAccountDepositsFromEtherscan(account);
            if(transactions) {
                standardizedTransactions = etherscanTransactionsToRegularTransactions(transactions, account);
            }
        }
        return standardizedTransactions;
    }

    public async performWithdraw(req: any) {
        if (!req.payload.sendTo || !req.payload.amount) {
            throw new Error("Bad parameters");
        }
        const receiver = req.payload.sendTo;
        const sender = req.payload.sendFrom;
        const amountToken = req.payload.amount + "";
        const password = req.payload.password;
        const options = {
            priority: req.payload.priority
        }

        if(!sender && !password) {
            const txHash = await this.service.sendTokenFromMainWallet(receiver, amountToken,options);
            return { txid: txHash };
        } else {
            const txHash = await this.service.sendToken(sender, receiver, amountToken, password, options);
            return { txid: txHash };
        }
    }

    public async generateAccount(req: any) {
        if (!req.payload.password) {
            throw new Error("Bad parameters");
        }
        const address = await this.service.generateAccount(req.payload.password);
        return { address: address };
    }

    public async isAddress(req: any) {
        if (!req.params.address) {
            throw new Error("Bad parameters");
        }
        const valid = this.service.isAddress(req.params.address);
        return new Promise<IAddressCheck>((resolve) => {
            resolve({ address: req.params.address, valid: valid });
        });
    }
}
