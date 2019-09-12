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
The goal of the project is to make unified API for more types of cryptocurrencies for financial use.
Coins and Tokens must be handled in the same way when the client wants to make transaction from one account to another, ask for balance of an account or create one.
The common use-case when a coin exchange platform wants to integrate new digital assets for new markets or
a regular user would like to handle his/her distinct cryptocurrencies in a same way on its local nodes.
There is also opportunity to make notifications about wallet balance changes at the most coins/tokens.

## Terminology
Because the same words and expressions are used differently in the blockchain world, clear definitions are provided to help to understand the application:
- ** address ** blockchain address which is able to receive cryptocurrency.
- ** account ** it would be always blockchain address or the account, which equals to its usage and definition on the specified blockchain network.
It means if you call Bitcoin endpoint, you can pass account name, which could contain several addresses instead of a single BTC address for the account parameter.
- ** wallet ** contains accounts that the application can handle directly.
- ** withdraw ** send cryptocurrency from one address to another on the specified blockchain.
- ** transaction ** you can retrieve a "native" transaction by transactionID and it is an equivalent of the blockhain transaction representation.
Also you can list all transactions of a specified address, which may contain the 'from', 'to' directions in the transaction, the confirmations and the type of the transaction (RECEIVE, SEND, OTHER).
- ** block number ** The sequence number of the block in the blockchain.
- ** token ** similar to coin, except that it does not have its own transport layer but it depends on an existent and independent blockchain technology.
- ** confirmation ** difference between the last synced block number of the configured blockchain node server and the block number of the transaction.

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
│   │           ├── uniqueEndpoints/ - if the {BlockchainTechnologyName} has implementation for specific tasks, it contains its routes and controllers.
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
If the application runs, you can reach the API documentation at http://127.0.0.1:3000/documentation or you can check the endpoints directly %via src/application/cryptoCurrencies/CryptoCurrencyRoutes.ts

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

Get transaction of an account, which shows the state of the account, changed by the transaction and if yes, how

> get /api/v1/cryptocurrency/{cryptocurrency}/accounts

Get accounts that the keystore/wallet/application contains

> get /api/v1/cryptocurrency/{cryptocurrency}/address/{address}/check

Check if the address is valid

> get /api/v1/cryptocurrency/{cryptocurrency}/spendableBalance

Get the spendable amount of coin/token on the main account.

> get /api/v1/cryptocurrency/{cryptocurrency}/transaction/{txid}

Get transaction by ID and set type label (RECEIVE, SENT, OTHER) from viewpoint of your wallet.
For example if the transaction's 'to' value equals to one of your accounts', then the label can be "RECEIVE" (or "OTHER" if it is in the 'from' property as well).

> get /api/v1/cryptocurrency/{cryptocurrency}/nativeTransaction/{txid}

Get native transaction details from the blockchain

> post /api/v1/cryptocurrency/{cryptocurrency}/account

Create account in the blockchain.
For bitcoin and its forks should pass * "additionalParams": { "account": "accountName" } * payload for the account generation.

> post /api/v1/cryptocurrency/{cryptocurrency}/withdraw

Make transaction from the main account or a specified account to the given address. You maybe should pass password or any other options if you specify sendFrom address (for example at Ethereum).
For some cryptocurrency it is obligatory to define an additional parameter in the additionalParams object.
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
The application is designed for internal network usage, do not run on public server.

## Wallet Change Callback
When the state of the handled accounts changes, the application makes a GET request to an arbitrary API endpoint with the transaction ID which caused the change itself.
To configure this EP you must set the API URI in your environment.ts file at the configuration of the used coin. Design this EP in the way that nothing else can call it except the BicycleChain
and when it is called do useful things with the transaction id, for example:
- log your transaction history,
- call getNativeTransaction to get all information about the transaction,
- make a request to the BicycleChain getTransaction method to figure out it was a received or a sent transaction, then you can check this account transactions with confirmations with listTransactions.
For BTC and its forks have a native client defined flag -walletnotify at the client start where you can set this feature, so the application has no built-in feature for these coins.  

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
Emit those coins that you don't want to use, the application won't load those parts. For tokens you must configure its blockchain node configuration in the similar way (if it has it)
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
The blockchain nodes configuration can differ from one another. You can find the exact structure for the correct setup one-by-one in the *src/application/localnodes/{localnode}/ILocalNodeConfig.ts*.

## Run the application
Install lib dependencies that the node packages use
> sudo apt-get install -y python build-essential

Install Nodejs (version 10 is supported), suggested install with [NVM](https://github.com/nvm-sh/nvm)
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash

> source ~/.bashrc

> nvm i 10

Run the application with PM2 (or with any other alternative which can build NodeJS Typescript code).
> npm i -g pm2

For PM2 you should install the typescript module with
> pm2 install typescript ts-node

Install node packages
> npm i

Set your own environment configuration file (in src/environments/environment.ts), then you can start the BicycleChain with PM2
> pm2 start src/init.ts --name BicycleChain

## Unique Routes
At some localnode config set, some particular routes can appear (if it has, in the {BlockchainTechnologyName} folder contains uniqueEndpoints folder).
These routes offer specific actions on the configured blockhain network.

### Ethereum

> post /api/v1/ethereum/callContractMethod

Invoke a contract's function with the passed parameters.
Payload:

```json
{
    "methodName": "sampleMethodName", /* the functon name that you want to call */
    "methodType": "send", /* at send will change on the contract state and send transaction to the blockchain, call methodtype only runs in EVM, not change the contract state */
    "contractAddress": "0xe1f45817c10a07fc7bb137a317f65b371d36af42", /* The contract hash address */
    "contractAbi": [{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}]}], /* JSON ABI objects in array */
    "additionalParams": { /* optional */
        "callFrom": "0x0E18C1e20DD1A03a41548dA76C736Fe1C4cD1FE3", /* default is the main address which set in the configuration */
        "callFromPassword": "testpassword", /* password if the callFrom */
        "gas": 50000,
        "gasPrice": "2000000000",
        "functionParams": ["something", 123] /* parameters in correct order for the function call */
    }
}
```

> post /api/v1/ethereum/deployContract

Deploy contract to the Ethereum Blockchain
Payload:

```json
{
    "bytecode": "60556023600b82828239805160001a607314601657fe5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600080f", /* bytecode generated by solc */
    "abi": [{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}]}], /* JSON ABI objects in array */
    "additionalParams": { /* optional */
        "callFrom": "0x0E18C1e20DD1A03a41548dA76C736Fe1C4cD1FE3", /* default is the main address which set in the configuration */
        "callFromPassword": "testpassword", /* password if the callFrom */
        "gas": 50000,
        "gasPrice": "2000000000",
        "functionParams": ["something", 123] /* parameters in correct order for the function call */
    }
}
```

### TRON

> post /api/v1/trx/createTRC10Token

Create TRC10 token on the TRON Network
Payload:

```json
{
    "name": "Petty", /* Name of the token */
    "abbreviation": "PEY", /* The short acronym of the token */
    "description": "Everyone deserves a Petty.", /* Description of the asset */
    "url": "https://pettytoken.network", /* Official webpage of the asset */
    "totalSupply": 1000000, /* The all available token for the asset (in case of use decimals, it remains the same amount like without that)* /
    "trxRatio": 1, /* How much TRX will tokenRatio cost? */
    "tokenRatio": 1 , /* How many tokens will trxRatio afford? */
    "saleStart": 1580437783000, / * Timestamp. When the token ICO starts. Default is the current time */
    "saleEnd": 1580437783, /* Timestamp. When the token ICO ends. Default is the current time + 60 seconds */
    "freeBandwidth": 10000, /* The creator's donated bandwidth for use by token holders. Default 0 */
    "freeBandwidthLimit":  1000000, /* Out of totalFreeBandwidth; the amount each token holder get. Default 0 */
    "frozenAmount":  100000, /* How many token will locked. Default 1 */
    "frozenDuration": 1, /* Number of days. How much time token will locked. Default 1 */
    "precision": 8, /* Precision of the token values. */
    "additionalParams": { /* optional */
        "callFromPrivateKey": "e5b30d0ebd5fd3ea24e0a07fc3b697f550c6ed5cf4895034ee9f379711aefb10" /* The private key that will be used to sign the transaction */
    }
}
```

# Notes for Local Nodes
To running this API with full functionalities for some local nodes MongoDB needed to have. You can run a simple MongoDB instance with Docker
> docker run -d -v bicycle-data:/data/db --name bicyclechain-mongo -p 127.0.0.1:27017:27017 mongo

Call its CLI with
> docker exec -ti bicyclechain-mongo mongo

Listing account transactions in most of the cases only work with * owned accounts * .

## TRON
For TRON network suggested to set up an MongoDB database in the interest of account handling (the application save the generated accounts into the database).
With MongoDB usage, the application utilize this resource for its own explorer and save transactions at transaction events into the database.
It is useful for listing transactions for a given user, also necessary for token usage
(in the case of the ERC20 tokens transaction value which is received at Transfer events, so it required at getTransaction methods).

At withdraw you can pass the privateKey of the sender by attend * additionalParams.privateKey * to your payload, if the MongoDB doesn't have the private key of the given address.

## EOSIO
The Bicyclechain supports only transactions which contains one action at `getTransaction` and `getAccountTransaction` endpoints. For further information call `nativeTransaction`.

For account creation the `additionalInfo.account` has to be specified and optional `additionalInfo.pubKey` can be added to the payload.
If you omit the latter, the application will use public key of your main account.

The balance change tracking only watch the main account's balance changes.

The `listAccountTransactions` and the `listAccountDeposits` only check the "Transfer" methods in the token contracts, by the original action ordinal.

# Contribution
On a separated branch you can make pull request for your cryptocurrency integration.
The condition for a coin pull request is that the Dockerfile of the used blockchain node server has to be on the repository main branch of the [Cointainer](https://github.com/nugaon/cointainer) project.
