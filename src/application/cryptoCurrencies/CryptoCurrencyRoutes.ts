import { ServerRoute } from "hapi";
import { injectable } from "inversify";
import { Routes } from "../generic/Routes";
import { CryptoCurrencyController } from "./CryptoCurrencyController";
import { CryptoCurrencyValidator } from "./CryptoCurrencyValidator";

@injectable()
export class CryptoCurrencyRoutes implements Routes {

    constructor(
        private controller: CryptoCurrencyController,
        private validator: CryptoCurrencyValidator
    ) { }

    public readonly routes: ServerRoute[] = [
        {
            method: "GET",
            path: "/api/v1/cryptocurrency/{cryptocurrency}/accounts",
            options: {
                description: "Get accounts that the keystore/wallet contains",
                tags: ["api", "v1", "coin"],
                validate: this.validator.availableCoins(),
                handler: async (request: any) => {
                    return this.controller.getAccounts(request);
                }
            }
        },
        {
            method: "POST",
            path: "/api/v1/cryptocurrency/{cryptocurrency}/account",
            options: {
                description: "Generate an account with an address on the specified blockchain",
                tags: ["api", "v1", "coin"],
                validate: this.validator.createAccount(),
                handler: async (request: any) => {
                    return this.controller.generateAccount(request);
                }
            }
        },
        {
            method: "GET",
            path: "/api/v1/cryptocurrency/{cryptocurrency}/account/{account}/transactions",
            options: {
                description: "Get transactions of an account",
                tags: ["api", "v1", "coin"],
                validate: this.validator.account(),
                handler: async (request: any) => {
                    return this.controller.listAccountTransactions(request);
                }
            }
        },
        {
            method: "GET",
            path: "/api/v1/cryptocurrency/{cryptocurrency}/account/{account}/transaction/{txid}",
            options: {
                description: "Get transaction of an account",
                tags: ["api", "v1", "coin"],
                validate: this.validator.accountTransaction(),
                handler: async (request: any) => {
                    return this.controller.getAccountTransaction(request);
                }
            }
        },
        {
            method: "POST",
            path: "/api/v1/cryptocurrency/{cryptocurrency}/account/{account}/transactions",
            options: {
                description: "Get transactions of an account with pagination",
                tags: ["api", "v1", "coin"],
                validate: this.validator.listTransactions(),
                handler: async (request: any) => {
                    return this.controller.listAccountTransactions(request);
                }
            }
        },
        {
            method: "GET",
            path: "/api/v1/cryptocurrency/{cryptocurrency}/transaction/{txid}",
            options: {
                description: "Get transaction by ID and set type label (RECEIVE, SENT, OTHER) from viewpoint of your wallet",
                tags: ["api", "v1", "coin"],
                validate: this.validator.transaction(),
                handler: async (request: any) => {
                    return this.controller.getTransaction(request);
                }
            }
        },
        {
            method: "GET",
            path: "/api/v1/cryptocurrency/{cryptocurrency}/nativeTransaction/{txid}",
            options: {
                description: "Get native transaction details from the blockchain",
                tags: ["api", "v1", "coin"],
                validate: this.validator.transaction(),
                handler: async (request: any) => {
                    return this.controller.getNativeTransaction(request);
                }
            }
        },
        {
            method: "GET",
            path: "/api/v1/cryptocurrency/{cryptocurrency}/account/{account}/deposits",
            options: {
                description: "Get depsoits of an account",
                tags: ["api", "v1", "coin"],
                validate: this.validator.account(),
                handler: async (request: any) => {
                    return this.controller.listAccountDeposits(request);
                }
            }
        },
        {
            method: "POST",
            path: "/api/v1/cryptocurrency/{cryptocurrency}/account/{account}/deposits",
            options: {
                description: "Get deposits of an account with pagination",
                tags: ["api", "v1", "coin"],
                validate: this.validator.listTransactions(),
                handler: async (request: any) => {
                    return this.controller.listAccountDeposits(request);
                }
            }
        },
        {
            method: "GET",
            path: "/api/v1/cryptocurrency/{cryptocurrency}/spendableBalance",
            options: {
                description: "Get the spendable amount of coin/token in the main account.",
                tags: ["api", "v1", "coin"],
                validate: this.validator.availableCoins(),
                handler: async (request: any) => {
                    return this.controller.getGlobalBalance(request);
                }
            }
        },
        {
            method: "GET",
            path: "/api/v1/cryptocurrency/{cryptocurrency}/account/{account}/balance",
            options: {
                description: "Get the spendable amount of coin/token in the specified account.",
                tags: ["api", "v1", "coin"],
                validate: this.validator.account(),
                handler: async (request: any) =>{
                    return this.controller.getBalance(request);
                }
            }
        },
        {
            method: "POST",
            path: "/api/v1/cryptocurrency/{cryptocurrency}/withdraw",
            options: {
                description: "Send transaction from the main account or a specified account to the given address.",
                tags: ["api", "v1", "coin"],
                validate: this.validator.withdraw(),
                handler: async (request: any) => {
                    return this.controller.performWithdraw(request);
                }
            }
        },
        {
            method: "GET",
            path: "/api/v1/cryptocurrency/{cryptocurrency}/address/{address}/check",
            options: {
                description: "Check if address valid",
                tags: ["api", "v1", "coin"],
                validate: this.validator.address(),
                handler: async (request: any) => {
                    return this.controller.isAddress(request);
                }
            }
        }
    ];
}
