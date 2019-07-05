import * as Joi from "joi";

export class UniqueValidator {

    constructor() {
    }

    public createTRC10Token() {
        return {
            payload:
                Joi.object().keys({
                    name: Joi.string().description("Name of the token").example("Petty"),
                    abbreviation: Joi.string().description("The short acronym of the token").example("PEY"),
                    description: Joi.string().description("Description of the asset").example("Everyone deserves a Petty."),
                    url: Joi.string().description("Official webpage of the asset").example("https://pettytoken.network"),
                    totalSupply: Joi.number().positive().description("The all available token for the asset (in case of use decimals, it remains the same amount like without that)").example(1000000),
                    trxRatio: Joi.number().positive().description("How much TRX will tokenRatio cost?").example(1),
                    tokenRatio: Joi.number().positive().description("How many tokens will trxRatio afford?").example(1),
                    saleStart: Joi.number().optional().description("Timestamp. When the token ICO starts. Default is the current time").example(1580437783000),
                    saleEnd: Joi.number().optional().description("Timestamp. When the token ICO ends. Default is the current time + 60 seconds").example(1580437783),
                    freeBandwidth: Joi.number().optional().default(0).description("The creator's donated bandwidth for use by token holders. Default 0").example(10000),
                    freeBandwidthLimit:  Joi.number().optional().description("Out of totalFreeBandwidth; the amount each token holder get. Default 0").example(1000000),
                    frozenAmount:  Joi.number().optional().default(1).description("How many token will locked. Default 1").example(100000),
                    frozenDuration: Joi.number().optional().default(1).description("Number of days. How much time token will locked. Default 1").example(1),
                    precision: Joi.number().optional().description("Precision of the token values.").example(8),
                    additionalParams: Joi.object().optional().keys({
                        callFromPrivateKey: Joi.string().optional().description("The private key that will be used to sign the transaction")
                            .example("e5b30d0ebd5fd3ea24e0a07fc3b697f550c6ed5cf4895034ee9f379711aefb10")
                    })
                })
        };
    }

    public freezeBalance() {
        return  {
            payload:
                Joi.object().keys({
                    amount: Joi.number().positive().description("Amount of TRX to freeze.").example(1000),
                    duration: Joi.number().positive().default(3).description("Length in Days to freeze TRX for. Minimum of 3 days.").example(10),
                    resource: Joi.string().valid(["BANDWIDTH", "ENERGY"]).default("ENERGY").description("Resource that you're freezing TRX in order to obtain.").example("ENERGY"),
                    ownerAddress: Joi.string().optional().description("Address which owns the TRX that has to be freezed. Default is the main address").example("TFdjdrhuhsSzWK1Z2NiizaDnyFhdx7zLJh"),
                    receiverAddress: Joi.string().optional().description("Address of other user receiving the resource. Default is the ownerAddress").example("TFdjdrhuhsSzWK1Z2NiizaDnyFhdx7zLJh"),
                    permissionId: Joi.number().positive().valid([0, 1, 2]).default(0).optional().description("The permission Id").example(0),
                    additionalParams: Joi.object().optional().keys({
                        callFromPrivateKey: Joi.string().optional().description("The private key that will be used to sign the transaction")
                            .example("e5b30d0ebd5fd3ea24e0a07fc3b697f550c6ed5cf4895034ee9f379711aefb10")
                    })
                })
        }
    }

}
