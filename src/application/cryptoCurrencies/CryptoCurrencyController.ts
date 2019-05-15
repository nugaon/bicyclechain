import { inject, injectable } from "inversify";
import { IAddressCheck, IBalance, ICryptoCurrency, IGenerateAccount, IPerformWithdrawal, ITransaction } from "./ICryptoCurrency";


@injectable()
export class CryptoCurrencyController {

    @inject("cryptoCurrencies")
    private cryptoCurrencies;

    @inject("cryptoCurrenciesRouteMapping")
    private routeMapping;

    public async generateAccount(req: any): Promise<IGenerateAccount> {
        const service = this.getDecentService(req);
        return service.generateAccount(req);
    }

    public async getAccounts(req: any): Promise<Array<string>> {
        const service = this.getDecentService(req);
        return service.getAccounts();
    }

    public async getBalance(req: any): Promise<IBalance> {
        const service = this.getDecentService(req);
        return service.getAccountBalance(req);
    }

    public async getGlobalBalance(req: any): Promise<IBalance> {
        const service = this.getDecentService(req);
        return service.getGlobalBalance();
    }

    public async listAccountTransactions(req: any): Promise<Array<ITransaction>> {
        const service = this.getDecentService(req);
        return service.listAccountTransactions(req);
    }

    public async getAccountTransaction(req: any): Promise<ITransaction> {
        const service = this.getDecentService(req);
        return service.getAccountTransaction(req);
    }

    public async getTransaction(req: any): Promise<ITransaction> {
        const service = this.getDecentService(req);
        return service.getTransaction(req.params.txid);
    }

    public async getNativeTransaction(req: any): Promise<ITransaction> {
        const service = this.getDecentService(req);
        return service.getNativeTransaction(req.params.txid);
    }

    public async listAccountDeposits(req: any): Promise<Array<ITransaction>> {
        const service = this.getDecentService(req);
        return service.listAccountDeposits(req);
    }

    public async performWithdraw(req: any): Promise<IPerformWithdrawal> {
        const service = this.getDecentService(req);
        return service.performWithdraw(req);
    }

    private getDecentService(req: any): ICryptoCurrency {

        const className = this.routeMapping[req.params.cryptocurrency];
        return this.cryptoCurrencies[className];
    }
    public async isAddress(req: any): Promise<IAddressCheck> {
        const service = this.getDecentService(req);
        return service.isAddress(req);
    }
}
