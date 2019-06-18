import * as Joi from "joi";

export class UniqueValidator {

    constructor() {
    }

    public createTRC10Token() {
        return {
            payload:
                Joi.object().keys({
                    name: Joi.string().default("Petty").description("Name of the token"),
                    abbreviation: Joi.string().default("PEY").description("The short acronym of the token"),
                    description: Joi.string().default("Everyone deserves a Petty.").description("Description of the asset"),
                    url: Joi.string().default("https://pettytoken.network").description("Official webpage of the asset"),
                    totalSupply: Joi.number().positive().default(1000000).description("The all available token for the asset"),
                    trxRatio: Joi.number().positive().default(1).description("How much TRX will tokenRatio cost?"),
                    tokenRatio: Joi.number().positive().default(1).description("How many tokens will trxRatio afford?"),
                    saleStart: Joi.number().optional().default(1560437783).description("Timestamp. When the token circulation starts. Default is the current time"),
                    saleEnd: Joi.number().optional().default(1580437783).description("Timestamp. When the token circulation ends"),
                    freeBandwidth: Joi.number().optional().default(10000).description("The creator's donated bandwidth for use by token holders. Default 0"),
                    freeBandwidthLimit:  Joi.number().optional().default(1000000).description("Out of totalFreeBandwidth; the amount each token holder get. Default 0"),
                    frozenAmount:  Joi.number().optional().default(100000).description("How many token will locked. Default 0"),
                    frozenDuration: Joi.number().optional().default(1570437783).description("Number of days. How much time token will locked."),
                })
        };
    }

}
