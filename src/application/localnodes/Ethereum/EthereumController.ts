import { IAddressCheck, ICryptoCurrency, ITokenTransporter, ITransaction } from "../../cryptoCurrencies/ICryptoCurrency";
import { DbNormalTransactionsToRegularTransactions, INormalTransaction } from "./EthereumDB";
import { EthereumService } from "./EthereumService";
import { etherscanTransactionsToRegularTransactions, IEtherscanTransaction } from "./EtherscanResponses";
import { UniqueRoutes } from "./uniqueEndpoints/UniqueRoutes";
import { IUniqueEndpoints } from "../../generic/IUniqueEndpoints";
import { default as Boom } from "boom";

export class EthereumController implements ICryptoCurrency, ITokenTransporter, IUniqueEndpoints {

    private service: EthereumService;

    public async onInit() {
        this.service = new EthereumService();
        this.service.onInit();
    }

    public async onDestroy() { }

    public async getAccounts() {
        return this.service.getAccounts();
    }

    public async getAccountBalance(req: any) {
        const account = req.params.account;

        try {
            const balance = await this.service.getBalance(account);
            return {"account": account, "balance": balance};
        } catch (e) {
            throw Boom.notFound(`Account ${account} has not got balance`);
        }
    }

    public async getGlobalBalance() {
        const account = this.service.getMainAccount();
        const balance = await this.service.getBalance(account);
        return {account: account, balance: balance};
    }

    public async listAccountTransactions(req: any) {
        const account = req.params.account;
        const page = (req.payload && req.payload.page) ? req.payload.page : 1;
        const offset = (req.payload && req.payload.offset) ? req.payload.offset : 100;
        const currentBlockNumber = await this.service.getBlockNumber(); //to calculate confirmations
        let standardizedTransactions: Array<ITransaction> = [];
        if(this.service.hasOwnExplorer()) {
            const transactions: Array<INormalTransaction> = await this.service.listAccountTransactionsFromDb(account, page, offset);
            if(transactions) {
                standardizedTransactions = DbNormalTransactionsToRegularTransactions(transactions, currentBlockNumber, account);
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
            const transactions: Array<INormalTransaction> = await this.service.listAccountDepositsFromDb(account, page, offset);
            if(transactions) {
                standardizedTransactions = DbNormalTransactionsToRegularTransactions(transactions, currentBlockNumber, account);
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
            throw Boom.badRequest("Bad parameters");
        }

        const receiver = req.payload.sendTo;
        const sender = req.payload.sendFrom;
        const amountInEther = req.payload.amount + "";
        const password = req.payload.additionalParams && req.payload.additionalParams.password ? req.payload.additionalParams.password : null;
        const gas = req.payload.additionalParams && req.payload.additionalParams.gas ? req.payload.additionalParams.gas : null;
        const options = {
            priority: req.payload.priority,
            gas: gas
        };

        //we always send coin from the main wallet
        //TODO log which account wanted to send ether to where

        if(sender) {
            if(!password) {
                throw Boom.badRequest("If you specified sender account, you must to pass the password to unlock it.");
            }
            const txid = await this.service.sendEtherWithUnlock(sender, receiver, amountInEther, password, options);
            return { txid: txid };
        } else {
            const txid = await this.service.sendEtherFromMainWallet(receiver, amountInEther, options);
            return { txid: txid };
        }
    }

    public async generateAccount(req: any) {
        if (!req.payload.additionalParams.password) {
            throw new Error("Bad parameters");
        }
        const address = await this.service.generateAccount(req.payload.additionalParams.password);
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

    public initTokens() {
        return this.service.initTokens();
    }

    public getUniqueRouteInstance() {
        return new UniqueRoutes(this);
    }

    public async callContractMethod(req: any) {
        const methodName = req.payload.methodName;
        const methodType = req.payload.methodType;
        const contractAddress = req.payload.contractAddress;
        const contractAbi = req.payload.contractAbi;
        const options = req.payload.additionalParams;
        return this.service.callContractMethod(methodName, methodType, contractAddress, contractAbi, options);
    }

    public async deployContract(req: any) {
        const abi = req.payload.abi;
        const bytecode = req.payload.bytecode;
        const options = req.payload.additionalParams;
        try {
            const txid = await this.service.deployContract(abi, bytecode, options);
            return { txid: txid };
        } catch(e) {
            throw Boom.notAcceptable(e);
        }
    }
}
