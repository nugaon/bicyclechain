```
o--o                        o         o-o  o               
|   |                       |        /     |               
O--o   O   o-o  o  o   o-o  |  o-o  O      O--o   oo  O  o-o  
|   |  |  |     |  |  |     |  |-'   \     |  |  | |  |  |  |
o--o   o   o-o  o--O   o-o  o  o-o    o-o  o  o  o-o- o  o  o
                   |                                  
                o--o                                 
```
# Description
The goal of the project to make unified API for the most cryptocurrencies to financial use.
Coins and Tokens must to handle in a same way when the client wants to make transaction from an account to another, ask for balance of an account or create one.
The common use-case when a coin exchange platform wants to integrate new digital assets for new markets or
a regular user would like to handle his/her distinct cryptocurrencies in a same way on its local nodes.
There is also opportunity to make notifications about wallet balance changes at the most coins/tokens.

## Terminology
Because the same words and expressions use differently in the blockchain world, needs to introduce some clear definitions to understand the application:
- ** address ** blockchain address which capable to receive cryptocurrency.
- ** account ** it would be always blockchain address or the account, which equals its usage and definition on the specified blockchain network.
It means if you call Bitcoin endpoint, you can pass account name, which could contain several addresses instead of a single BTC address for the account parameter.
- ** wallet ** contains accounts that the application can handle directly.
- ** withdraw ** send cryptocurrency from an address to another on the specified blockchain.
- ** transaction ** you can retrieve a "native" transaction by transactionID and it is equivalent to the blockhain transaction representation.
Also you can list all transactions of a specified address, which may contains the 'from', 'to' directions in the transaction, the confirmations and the type of the transaction (RECEIVE, SEND, OTHER).
- ** block number ** The sequence number of the block in the blockchain.
- ** token ** similar to coin, except its transport layer depends upon an existing and independent blockchain technology and doesn't have own.
- ** confirmation ** difference of the last synced block number of the configured blockchain node server and the block number of the transaction.

## File structure
```
│
├── src/ - Main source code base of the project
│   ├── application/ - Application codebase
│   │   ├── cryptoCurrencies/ - source code for the cryptoCurrency EPs and make interfaces for tokens and coins for its implementation
│   │   ├── generic/ - common used helper functions
│   │   └── localnodes/ - implementations for different blockchain technologies
│   │       └── {BlockchainTechnologyName}/ - contains all configuration, interfaces, API calls, functions of the {BlockchainTechnologyName}
│   │           ├── tokens/ - if the {BlockchainTechnologyName} able to transfer tokens it cointains its implementation. Its controller also implements the ICryptoCurrency interface like the coins.
│   │           ├── {BlockchainTechnologyName}Controller.ts - implements ICryptoCurrency interface and only contains the input/output handling.
│   │           ├── {BlockchainTechnologyName}Service.ts - business logic, the controller directly calls its functions.
│   │           └── ILocalNodeConfig.ts - configuration interface for its API
│   ├── engine/ - Framework engine codebase
│   ├── environments/ - Environment configuration files
│   └── server/ - Server codebase
├── logs/ - logs from Winston
├── dist/ - Distributable bundle (native javascript files)
└── node_modules/ - Node modules [requires $npm install]
```

## API documentation
If the application runs, you can reach the API documentation under http://127.0.0.1:3000/documentation or you can check the endpoints directly from src/application/cryptoCurrencies/CryptoCurrencyRoutes.ts

> get /api/v1/cryptocurrency/{cryptocurrency}/account/{account}/balance

Query balance of the given account. At Bitcoin (and forks) you can pass the account name instead of the address.

> get /api/v1/cryptocurrency/{cryptocurrency}/account/{account}/deposits

Get depsoit transactions of an account

> post /api/v1/cryptocurrency/{cryptocurrency}/account/{account}/deposits

Get all deposits of an account with pagination, by pass in the post payload
```
{
  "page": 1,
  "offset": 100
}
```
you get the first maximum 100 entries.

> get /api/v1/cryptocurrency/{cryptocurrency}/account/{account}/transactions

Get transactions of an account

> post /api/v1/cryptocurrency/{cryptocurrency}/account/{account}/transactions

Get transactions of an account in a limited list

> get /api/v1/cryptocurrency/{cryptocurrency}/account/{account}/transaction

Get transaction of an account, which tells the state of the account changed by the transaction and if yes, how

> get /api/v1/cryptocurrency/{cryptocurrency}/accounts

Get accounts that the keystore/wallet/application contains

> get /api/v1/cryptocurrency/{cryptocurrency}/address/{address}/check

Check if address valid

> get /api/v1/cryptocurrency/{cryptocurrency}/spendableBalance

Get the spendable amount of coin/token in the main account.

> get /api/v1/cryptocurrency/{cryptocurrency}/transaction/{txid}

Get transaction by ID and set type label (RECEIVE, SENT, OTHER) from viewpoint of your wallet.
For example if the transaction's 'to' value equals one of your account, then the label can be "RECEIVE" (or "OTHER" if it is in the 'from' property also).

> get /api/v1/cryptocurrency/{cryptocurrency}/nativeTransaction/{txid}

Get native transaction details from the blockchain

> post /api/v1/cryptocurrency/{cryptocurrency}/withdraw

Send transaction from the main account or a specified account to the given address. You maybe must to pass password or any other options if you specify sendFrom address (for example at Ethereum).
At some cryptocurrency obligatory to define some additional parameter in the additionalParams object.
Payload:
```
{
  "sendTo": "string",
  "sendFrom": "string",
  "amount": "string",
  "additionalParams": {}
}
```

# Usage
Before you run the BicycleChain, you must to do the followings:
- set your own environment configuration file
- install application dependencies
> npm i

The application designed for internal network usage, do not run on public server.

## Wallet Change Callback
When the state of the handled accounts change, the application makes a GET request to an arbitrary API endpoint with the transaction ID which caused the change itself.
To configure this EP you must to set the API URI in your environment.ts file at the configuration of the used coin. Design this EP to nothing else can call except the BicycleChain
and when it called do useful things with the transaction id, for example:
- log your transaction history,
- call getNativeTransaction to get all information about the transaction,
- make a request to the BicycleChain getTransaction method to figure out it was a received or a sent transaction, then you can check this account transactions with confirmations with listTransactions.
For BTC and its forks have a native client defined flag -walletnotify at the client start where you can set this feature, so the application has not a built-in feature for these coins.  

## Environment configuration
Set your active configuration to *src/environments/environment.ts* . You can start from the example configuration in *src/environments/environment.example.ts*.
The environment configuration has to implement the *src/engine/interfaces/AppConfiguration.ts* interface.

You can define cryptocurrency params at the endpoints in your environment file, for instance if you would like to handle Ethereum set the following:
```
localnodes: [
    {
        route: "eth",
        class: "Ethereum"
    },
    (...)
]
```  
The "route" will be the {cryptocurrency} param at the API endpoints. The class maps this route to the appropriate controller/service in the source code.
You can find this mapping in the *src/engine/configuration/LocalNodeControllerRegistry.ts*. The blockchain nodes configuration place in the localnodeConfigs section.
Emit those coins that you don't want to use, the application won't load those parts. For tokens you must configure its blockchain node configuration similar way (if it has)
```
localnodeConfigs: {
    Ethereum: {
        (...)
        withContracts: [
            {
                address: "0x5f3856E40105316EEF244Ea43714A03E04d209CA",
                route: "petty",
                type: "ERC20"
            }
        ]
    },
    (...)
```
The blockchain nodes configuration can be different from each other. You can find the exact structure for the correct setup one-by-one in the *src/application/localnodes/{localnode}/ILocalNodeConfig.ts*.

## Run the application
Run the application with PM2 (or any other alternatives which can build NodeJS Typescript code).

For PM2 you should install the typescript module with
> pm2 install typescript ts-node

Install node packages
> npm i

then you can start the BicycleChain with PM2
> pm2 start src/init.ts --name BicycleChain

# Contribution
On a separated branch you can make pull request for your cryptocurrency integration.
The condition for a coin pull request is the Dockerfile of the used blockchain node server have to be on the repository main branch of the [Cointainer](https://github.com/nugaon/cointainer) project.
