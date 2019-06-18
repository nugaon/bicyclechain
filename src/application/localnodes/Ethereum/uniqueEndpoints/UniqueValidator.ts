import * as Joi from "joi";

export class UniqueValidator {

    private abiValidator: Joi;

    constructor() {
        this.abiValidator = Joi.array().items({
            constant: Joi.boolean(),
            inputs: Joi.array(),
            name: Joi.string(),
            outputs: Joi.array(),
            payable: Joi.boolean(),
            stateMutability: Joi.string(),
            type: Joi.string(),
            anonymous: Joi.boolean().optional()
        })
        .default([{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}])
        .description("JSON Abi object in stringified form");
    }

    public callContractMethod() {
        return {
            payload:
                Joi.object().keys({
                    methodName: Joi.string().default("owner").description("The name of the method, which the api will call"),
                    methodType: Joi.string().valid(["call", "send"]).default("call").description("call methodtype only runs in EVM, not change the contract state"),
                    contractAddress: Joi.string().default("0x5f3856E40105316EEF244Ea43714A03E04d209CA").description("The contract hash address"),
                    contractAbi: this.abiValidator,
                    additionalParams: Joi.object().optional().keys({
                        gas: Joi.number().positive().optional().default(50000).description("Used gas for the function call"),
                        gasPrice: Joi.string().optional().default("2000000000").description("wei to pay after one gas"),
                        functionParams: Joi.array().optional().items(Joi.alternatives().try(
                            Joi.string(), Joi.number()
                        )).description("The parameters of the function in correct order"),
                        callFrom: Joi.string().optional().default("0x0E18C1e20DD1A03a41548dA76C736Fe1C4cD1FE3").description("the address where the function call sent from. default is the mainwalletaddress"),
                        callFromPassword: Joi.string().optional().default("xyzPass").description("if 'senFrom' passed, then it neccessary to pass too")
                    })
                })
        };
    }

    public deployContract() {
        return {
            payload:
                Joi.object().keys({
                    bytecode: Joi.string().default("60556023600b82828239805160001a607314601657fe5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600080f"
                        + "dfea265627a7a72305820aa4aefb55bd0c928b4309091c84293bc96a29c48906fd1df36ef90f71fd2182864736f6c63430005090032")
                        .description("The bytecode of the contract that the EVM can process"),
                    abi: this.abiValidator,
                    additionalParams: Joi.object().optional().keys({
                        gas: Joi.number().positive().optional().default(50000).description("Used gas for the function call"),
                        gasPrice: Joi.string().optional().default("2000000000").description("wei to pay after one gas"),
                        constructorParams: Joi.array().optional().items(Joi.alternatives().try(
                            Joi.string(), Joi.number()
                        )).description("The parameters of the constructor in correct order"),
                        callFrom: Joi.string().optional().default("0x0E18C1e20DD1A03a41548dA76C736Fe1C4cD1FE3").description("the address where the function call sent from. default is the mainwalletaddress"),
                        callFromPassword: Joi.string().optional().default("xyzPass").description("if 'senFrom' passed, then it neccessary to pass too")
                    })
                })
        };
    }

}
