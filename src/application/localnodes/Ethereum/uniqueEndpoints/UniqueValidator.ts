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
        .description("JSON Abi objects in array")
        .example([{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}]);
    }

    public callContractMethod() {
        return {
            payload:
                Joi.object().keys({
                    methodName: Joi.string().description("The name of the method, which the api will call").example("owner"),
                    methodType: Joi.string().valid(["call", "send"]).default("call").description("call methodtype only runs in EVM, not change the contract state").example("call"),
                    contractAddress: Joi.string().description("The contract hash address").example("0x5f3856E40105316EEF244Ea43714A03E04d209CA"),
                    contractAbi: this.abiValidator,
                    additionalParams: Joi.object().optional().keys({
                        gas: Joi.number().positive().optional().description("Used gas for the function call").example(50000),
                        gasPrice: Joi.string().optional().description("wei to pay after one gas").example("2000000000"),
                        functionParams: Joi.array().optional().items(Joi.alternatives().try(
                            Joi.string(), Joi.number()
                        )).description("The parameters of the function in correct order"),
                        callFrom: Joi.string().optional().description("the address where the function call sent from. default is the mainwalletaddress").example("0x0E18C1e20DD1A03a41548dA76C736Fe1C4cD1FE3"),
                        callFromPassword: Joi.string().optional().description("if 'senFrom' passed, then it neccessary to pass too").example("xyzPass")
                    })
                })
        };
    }

    public deployContract() {
        return {
            payload:
                Joi.object().keys({
                    bytecode: Joi.string().description("The bytecode of the contract that the EVM can process")
                        .example("60556023600b82828239805160001a607314601657fe5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600080f"
                        + "dfea265627a7a72305820aa4aefb55bd0c928b4309091c84293bc96a29c48906fd1df36ef90f71fd2182864736f6c63430005090032"),
                    abi: this.abiValidator,
                    additionalParams: Joi.object().optional().keys({
                        gas: Joi.number().positive().optional().description("Used gas for the function call").example(50000),
                        gasPrice: Joi.string().optional().description("wei to pay after one gas").example("2000000000"),
                        functionParams: Joi.array().optional().items(Joi.alternatives().try(
                            Joi.string(), Joi.number()
                        )).description("The parameters of the function in correct order"),
                        callFrom: Joi.string().optional().description("the address where the function call sent from. default is the mainwalletaddress").example("0x0E18C1e20DD1A03a41548dA76C736Fe1C4cD1FE3"),
                        callFromPassword: Joi.string().optional().description("if 'senFrom' passed, then it neccessary to pass too").example("xyzPass")
                    })
                })
        };
    }

}
