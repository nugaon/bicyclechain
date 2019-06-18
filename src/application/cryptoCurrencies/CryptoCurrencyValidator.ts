import { injectable } from "inversify";
import * as Joi from "joi";
import { jsonInterfaceMethodToString } from "web3-utils/types";
import { environment } from "../../environments/environment";

@injectable()
export class CryptoCurrencyValidator {

    private availableCurrencyRoutes: string[];

    constructor() {
        this.availableCurrencyRoutes = [];
        environment.localnodes.forEach((localnode) => {
            this.availableCurrencyRoutes.push(localnode.route);
        });
        if (environment.localnodeConfigs.Ethereum && environment.localnodeConfigs.Ethereum.withContracts) {
            environment.localnodeConfigs.Ethereum.withContracts.forEach((token) => {
                this.availableCurrencyRoutes.push(token.route);
            });
        }
    }
    public account() {
        return {
            params:
                Joi.object().keys({
                    cryptocurrency: Joi.string().valid(this.availableCurrencyRoutes)
                        .description("The currencyies are defined in the application's environment").example("eth"),
                    account: Joi.string().description("May vary depending on coins")
                })
        };
    }
    public accountTransaction() {
        return {
            params:
                Joi.object().keys({
                    cryptocurrency: Joi.string().valid(this.availableCurrencyRoutes)
                        .description("The currencyies are defined in the application's environment").example("eth"),
                    account: Joi.string().description("May vary depending on coins"),
                    txid: Joi.string().required().description("ID of transaction")
                })
        };
    }
    public availableCoins() {
        return {
            params:
                Joi.object().keys({
                    cryptocurrency: Joi.string().valid(this.availableCurrencyRoutes)
                        .description("The currencyies are defined in the application's environment").example("eth")

                })
        };
    }
    public createAccount() {
        return {
            params:
                Joi.object().keys({
                    cryptocurrency: Joi.string().valid(this.availableCurrencyRoutes)
                        .description("The currencyies are defined in the application's environment").example("eth")

                }),
                payload:
                Joi.object().keys({
                    //account: Joi.string().optional().description("FOR_BTC_RELATED_COINS"),
                    additionalParams: Joi.object().optional().description("Contains coin dependent parameter")
                })
        };
    }
    public transaction() {
        return {
            params:
                Joi.object().keys({
                    cryptocurrency: Joi.string().valid(this.availableCurrencyRoutes)
                        .description("The currencyies are defined in the application's environment").example("eth"),
                    txid: Joi.string().required().description("ID of transaction")
                })
        };
    }
    public withdraw() {
        return {
            params:
                Joi.object().keys({
                    cryptocurrency: Joi.string().valid(this.availableCurrencyRoutes)
                        .description("The currencyies are defined in the application's environment").example("eth")
                }),
            payload:
                Joi.object().keys({
                    sendTo: Joi.string().required(),
                    sendFrom: Joi.string().optional().description("Default: MainWalletAddress"),
                    amount: Joi.string().required(),
                    //priority: Joi.string().optional().valid("HIGH", "MEDIUM", "LOW").description("FOR_BTC_RELATED_COINS"),
                    //subFee: Joi.bool().optional().default(false).description("FOR_BTC_RELATED_COINS. Whether to substract the fee from amount, Default: false"),
                    //password: Joi.string().optional().description("FOR ETHEREUM. Ethereum service needs this parameter if sendFrom key passed."),
                    additionalParams: Joi.object().optional().description("Contains coin dependent parameters")

                })
        };
    }
    public address() {

        return {
            params:
                Joi.object().keys({
                    cryptocurrency: Joi.string().valid(this.availableCurrencyRoutes)
                        .description("The currencyies are defined in the application's environment").example("eth"),
                    address: Joi.string().required(),
                }),
        };
    }
    public listTransactions() {

        return {
            params:
                Joi.object().keys({
                    cryptocurrency: Joi.string().valid(this.availableCurrencyRoutes).required()
                        .description("The currencyies are defined in the application's environment").example("eth"),
                    account: Joi.string().required()
                }),
            payload:
                Joi.object().keys({
                    page: Joi.number().optional().default(1),
                    offset: Joi.number().optional().default(100)
                })
        };
    }


}
