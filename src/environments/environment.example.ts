import { AppConfiguration } from "../engine/interfaces/AppConfiguration";

/**
 * DEVELOPMENT ENVIRONMENT CONFIG
 */
export const environment: AppConfiguration = {
    /**
     * The version of the application.
     * You can also use build-number from CI.
     */
     /**
     * Is the environment production?
     */
    production: false,

    /**
     * Sets the hostname or IP address the server will listen on.
     * Use '0.0.0.0' to listen on all available network interfaces
     */
    host: `0.0.0.0`,

    /**
     * The TCP port the server will listen to.
     */
    port: `3000`,


    localnodes: [
        {
            route: "eth",
            class: "Ethereum"
        },
        {
            route: "btc",
            class: "Bitcoin"
        },
        {
            route: "bch",
            class: "BitcoinCash"
        },
        {
            route: "ltc",
            class: "Litecoin"
        },
        {
            route: "cpc",
            class: "Capricoin"
        },
        {
            route: "eos",
            class: "EOSIO",
        }
    ],

    localnodeConfigs: {
        EOSIO: {
            mainAccount: {
                privateKey: "... Your Private Key....",
                publicKey: "EOS8 ...",
                accountName: "viktor"
            },
            database: { //eosio db filler for Postgre
                host: "127.0.0.1",
                port: 5432,
                user: "postgres",
                password: "eosio-dbpass",
                database: "postgres",
            },
            rpcClient: {
                nodeURL: "http://127.0.0.1:8888",
            },
            walletChangeCallback: {
                callbackUri: "127.0.0.1/test", //callback for wallet change
                enabled: false,
                cron: {
                    interval: "0 * * * * *"
                }
            },
            withTokens: [{
                currency: "SYS",
                route: "sys",
                contract: "eosio.token" //optional
            }]
        },
        Ethereum: {
            connectionType: "websocket",
            connectionString: "ws://127.0.0.1:8546",
            web3Config: {
                defaultAccount: "ether address",
                defaultBlock: "latest",
                defaultGas: 21001,
                defaultGasPrice: "2000000000",
                transactionBlockTimeout: 50,
                transactionConfirmationBlocks: 24,
                transactionPollingTimeout: 480
            },
            mainWalletPassword: "TestPass123",
            etherscan: {
                uri: "https://api-rinkeby.etherscan.io/api",
                apiKey: "Ether apikey"
            },
            priorityGasPrices: {
                LOW: "1500000000",
                MEDIUM: "2000000000",
                HIGH: "2500000000"
            },
            mongoDB: {
                connectionString: "mongodb://127.0.0.1:27017/ethereum",
                saveNormalTransactions: true,
                saveContractTransactions: true
            },
            walletChangeCallback: {
                callbackUri: "https://test/api/v1/futureTransaction",
                enabled: true,
                cron: {
                    interval: "0 * * * * *",
                }
            },
            withContracts: [
                {
                    address: "0x5f3856E40105316EEF244Ea43714A03E04d209CA",
                    route: "petty",
                    type: "ERC20"
                }
            ]
        },
        Bitcoin: {
            rpcClient: {
                username: "cointainer",
                password: "bD0tf5Gm6ohGPAurmkm2ODph0vYAMjbnSBbcBf0ClpM=",
                network: "testnet",
                port: 18332
            },
            changeAddress: "2N7mEzme1wKqswU99dmzW6UPykaAMWYXhyB",
            transactionPriority: {
                HIGH: 1,
                MEDIUM: 5,
                LOW: 10

            },
        },
        BitcoinCash: {
            rpcClient: {
                username: "cointainer",
                password: "pCpXJwIE15M3N4I5C4pZFyNmdlNACMykrVQ3OilVf8I=",
                network: "testnet",
                port: 18442
            },
            changeAddress: "bchtest:qpqwcv8j5du0vk4sztama752sfk4rdytaqyqn42aj3",
        },
        Capricoin: {
            rpcClient: {
                //username: "cointainer",
                //password: "pCpXJwIE15M3N4I5C4pZFyNmdlNACMykrVQ3OilVf8I=",
                username: "foo",
                password: "SUPERSECRETPASSWORD",
                network: "mainnet",
                port: 22713,
            },
        },
        Litecoin: {
            rpcClient: {
                username: "cointainer",
                password: "pCpXJwIE15M3N4I5C4pZFyNmdlNACMykrVQ3OilVf8I=",
                network: "testnet",
                port: 19332
            },
            changeAddress: "QgAphnEhon4VxKPFMHUnwRJMTT1QZjVn2r",
            transactionPriority: {
                HIGH: 1,
                MEDIUM: 5,
                LOW: 10

            },
        },
        Ripple: {
            clientConfig: {
                server: "ws://127.0.0.1:6006",
                timeout: 4000
            },
            mainAccount: {
                address: "rMD56Fh...",
                secret: "secret",
            },
            requireDestinationTags: true,
            walletChangeCallback: {
            callbackUri: "https://test/api/v1/futureTransaction/xrp",
                enabled: true
            },
            mongoDB: {
                connectionUri: "mongodb://127.0.0.1:27017/ripple",
                saveMainAccountPayments: true
            },
            fees: {
                priorityMultipliers: {
                    LOW: 1,
                    MEDIUM: 1.2,
                    HIGH: 1.5
                }
            }
        },

        TRON: {
            clientConfig: {
                fullHost: "http://127.0.0.1:8090",
            },
            mainAccount: {
                address: "TWrCD448j7c6NVXKeF8(...)",
                privateKey: "961e9f81976cea478(...)"
            },
            withTokens: [{
                tokenID: "1000(...)",
                route: "petty",
                type: "TRC10"
             }, {
                contractAddress: "TD46UAGUaoe8tTsMN(...)",
                type: "TRC20",
                route: "petty2"
             }
            ],
            fees: {
                priorityMultipliers: {
                    LOW: 1,
                    MEDIUM: 1.2,
                    HIGH: 1.5
                }
            },
            mongoDB: {
                connectionUri: "mongodb://127.0.0.1:27017/tron"
            },
            walletChangeCallback: {
                callbackUri: "http://127.0.0.1/coin",
                enabled: true,
                cron: {
                    interval: "0 * * * * *"
                }
            }
        }

    }
};
