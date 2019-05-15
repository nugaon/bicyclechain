## GET /api/v1/cryptocurrency/{cryptocurrency}/accounts
(Same format with ethereum)

Get accounts that the keystore/wallet contains

Response Body

[
  "",
  "change",
  "main",
  "main-test-account",
  "test",
  "test1",
  "test2",
  "test3"
]

Response Code
200

## GET /api/v1/cryptocurrency/{cryptocurrency}/spendableBalance
(Same format with ethereum)

Get the spendable amount of coin/token in the main account.

Response Body

{
  "account": "main",
  "balance": "0.13830607"
}

Response Code
200

## GET /api/v1/cryptocurrency/{cryptocurrency}/account/{account}/balance
(Same format with ethereum)

Get the spendable amount of coin/token in the specified account.

account: bitcoin account or bitcoin address (eg.: "main")

Response Body
{
  "account": "main",
  "balance": "0.13830607"
}

Response Code
200


## POST /api/v1/cryptocurrency/{cryptocurrency}/account 
(Same response format with ethereum)

Generate an account with an address on the specified blockchain (or return the address of the account if already exists)

eg.:
{
  "additionalParams":{
    "account": "test_account" 
  }
}

Response Body
{
  "address": "2N7NwAhNRHvBPcymDLHC6TfFJCDzhjqUrBo"
}

Response Code
200

## GET /api/v1/cryptocurrency/{cryptocurrency}/address/{address}/check
(Same format with ethereum)

Check if address is valid

address:bitcoin address (eg.:2NCsk8xCBkquVanb255kWy5HUtExMh2L4KN)

Response Body
{
  "address": ":2NCsk8xCBkquVanb255kWy5HUtExMh2L4KN",
  "valid": true
}
Response Code
200

### OR 

Response Body
{
  "address": ":2NF7mYkk4JsqCuVeQ3if99ot1u6vuWNcRWM",
  "valid": false
}
Response Code
200

## GET /api/v1/cryptocurrency/{cryptocurrency}/account/{account}/deposits 
(Same format with ethereum)

Get depsoits of an account

account: bitcoin account (eg.: "main")

Response Body
[
  {
    "txid": "275c79e5ac4864b84e4667d0204c20375fa27771d1a3381b659fc1f58b22ef25",
    "amount": 0.00099,
    "confirmations": 162,
    "category": "RECEIVE"
  },
  {
    "txid": "2be1608d1a125f2fb0ca8cd7ee71fd2d67e2bee6375c918ee0d2c0cd040fa298",
    "amount": 0.00099,
    "confirmations": 152,
    "category": "RECEIVE"
  },
  {
    "txid": "fd78e0369da16838693059e0b803763285b0ff19f3e90fc34ab12d1af39c4921",
    "amount": 0.00299,
    "confirmations": 149,
    "category": "RECEIVE"
  }
]
Response Code
200

## POST /api/v1/cryptocurrency/{cryptocurrency}/account/{account}/deposits
(Same format with ethereum)

Get (<~offset) depsoits of an account

account: bitcoin account (eg.: "main")

example payload.:
{
  "page": 1,
  "offset": 10
}

Response Body
[
  {
    "txid": "275c79e5ac4864b84e4667d0204c20375fa27771d1a3381b659fc1f58b22ef25",
    "amount": 0.00099,
    "confirmations": 162,
    "category": "RECEIVE"
  },
  {
    "txid": "2be1608d1a125f2fb0ca8cd7ee71fd2d67e2bee6375c918ee0d2c0cd040fa298",
    "amount": 0.00099,
    "confirmations": 152,
    "category": "RECEIVE"
  },
  {
    "txid": "fd78e0369da16838693059e0b803763285b0ff19f3e90fc34ab12d1af39c4921",
    "amount": 0.00299,
    "confirmations": 149,
    "category": "RECEIVE"
  }
]
Response Code
200

## GET /api/v1/cryptocurrency/{cryptocurrency}/account/{account}/transactions
(Same format with ethereum)

Get all transactions of an account

    Can be slow!
account: bitcoin account (eg.: "main")

    account:"_" return all sent transaction

Response Body
[
  {
    "txid": "b17122a74ba09ab6691d864d7d8bfd6b57531789b468c6cdc2ca1b6452455001",
    "amount": 0.08134517,
    "confirmations": 2366,
    "category": "RECEIVE"
  },
  {
    "txid": "d2bb2940459b7c69eebc826accc169c02c2681175ef0ae63f3d07ebd90a1b906",
    "amount": 0.07135351,
    "confirmations": 2347,
    "category": "RECEIVE"
  },
  {
    "txid": "78b1e7b619b3f4388be3ccfe9c991b829c340ca2366b0baab7c264c127c5877f",
    "amount": 0.04135095,
    "confirmations": 2125,
    "category": "RECEIVE"
  },
  {
    "txid": "89bb200a49d409a0fe2a16674007766b0a76ab57c2c37126fd4a1e9f74ba76c7",
    "amount": 0.01,
    "confirmations": 576,
    "category": "RECEIVE"
  },
  {
    "txid": "d2bb2940459b7c69eebc826accc169c02c2681175ef0ae63f3d07ebd90a1b906",
    "amount": -0.07135351,
    "confirmations": 2347,
    "category": "SEND"
  },
  {
    "txid": "78b1e7b619b3f4388be3ccfe9c991b829c340ca2366b0baab7c264c127c5877f",
    "amount": -0.04135095,
    "confirmations": 2125,
    "category": "SEND"
  }
]
Response Code
200

## POST /api/v1/cryptocurrency/{cryptocurrency}/account/{account}/transactions
(Same format with ethereum)

Get ~offset transactions of an account

    Can be slow!
account: bitcoin account (eg.: "main")
example payload.:
{
  "page": 1,
  "offset": 6
}

    account:"_" return all sent transaction

Response Body
[
  {
    "txid": "d2bb2940459b7c69eebc826accc169c02c2681175ef0ae63f3d07ebd90a1b906",
    "amount": 0.07135351,
    "confirmations": 2348,
    "category": "RECEIVE"
  },
  {
    "txid": "78b1e7b619b3f4388be3ccfe9c991b829c340ca2366b0baab7c264c127c5877f",
    "amount": 0.04135095,
    "confirmations": 2126,
    "category": "RECEIVE"
  },
  {
    "txid": "89bb200a49d409a0fe2a16674007766b0a76ab57c2c37126fd4a1e9f74ba76c7",
    "amount": 0.01,
    "confirmations": 577,
    "category": "RECEIVE"
  },
  {
    "txid": "d2bb2940459b7c69eebc826accc169c02c2681175ef0ae63f3d07ebd90a1b906",
    "amount": -0.07135351,
    "confirmations": 2348,
    "category": "SEND"
  },
  {
    "txid": "78b1e7b619b3f4388be3ccfe9c991b829c340ca2366b0baab7c264c127c5877f",
    "amount": -0.04135095,
    "confirmations": 2126,
    "category": "SEND"
  }
]
Response Code
200

## GET /api/v1/cryptocurrency/{cryptocurrency}/transaction/{txid}
Get details of specified transaction

txid: bitcoin  transaction (eg.:"fd78e0369da16838693059e0b803763285b0ff19f3e90fc34ab12d1af39c4921")

    Response may vary depending on coins
Response Body
{
  "amount": 0,
  "fee": -0.00000166,
  "confirmations": 149,
  "blockhash": "0000000005eb8555ad7c715278e16a4ee21a35b220155fe95af234204fa6b794",
  "blockindex": 277,
  "blocktime": 1553613473,
  "txid": "fd78e0369da16838693059e0b803763285b0ff19f3e90fc34ab12d1af39c4921",
  "walletconflicts": [],
  "time": 1553612448,
  "timereceived": 1553612448,
  "bip125-replaceable": "no",
  "details": [
    {
      "account": "",
      "address": "2MstmvCLLMu2WA5cmpFo65rvUGaRd2regKy",
      "category": "send",
      "amount": -0.12096821,
      "label": "change_address",
      "vout": 0,
      "fee": -0.00000166,
      "abandoned": false
    },
    {
      "account": "",
      "address": "2NF7mYkk4JsqCuVeQ3if99ot1u6vuWNcRWM",
      "category": "send",
      "amount": -0.00299,
      "label": "test3",
      "vout": 1,
      "fee": -0.00000166,
      "abandoned": false
    },
    {
      "account": "change_address",
      "address": "2MstmvCLLMu2WA5cmpFo65rvUGaRd2regKy",
      "category": "receive",
      "amount": 0.12096821,
      "label": "change_address",
      "vout": 0
    },
    {
      "account": "test3",
      "address": "2NF7mYkk4JsqCuVeQ3if99ot1u6vuWNcRWM",
      "category": "receive",
      "amount": 0.00299,
      "label": "test3",
      "vout": 1
    }
  ],
  "hex": "02000000000101004479211c31567933aeb611592f95ff0dc71dbc3a1f0029f5ac7bf705de742d00000000171600141af444f65ad2e42f6cece2110199d655ac715578ffffffff023595b8000000000017a914071a0b4428cb1c8d7c1c67b81af054bb60d72f4887f88f04000000000017a914efe9c8cd341ebc831020b1130d1ddacfa6e2415187024730440220696883305259c02a1d3342185be8897ada9f3c5a18d9f37401b580dc4aeac6f802203043f56f38a48cd42e21dafc77e0e3601f7db3c8aa160a44b676fb59ca7ae5f90121026125f710933c8b463d9bc1b03dcc8aae9c81708a530e07ca165297ed1816cb7d00000000"
}
Response Code
200

### OR:
{
  "statusCode": 406,
  "error": "Not Acceptable",
  "message": "Invalid or non-wallet transaction id"
}

## POST /api/v1/cryptocurrency/{cryptocurrency}/withdraw
Start a withdraw from to the given address.

{
  "sendTo": "string",     <-bitcoin address
  "sendFrom": "string",   <-optional(default:all accounts[start from the oldest unspent]) (bitcoin address or account)
  "amount": "string",
  additionalParams:{
    "priority": "HIGH",   <-optional(default:MEDIUM)   <-valids:"HIGH","MEDIUM","LOW"
    "subFee": false       <-optional(default:false) whether to subtract the fee from the amount
  }
}
example payload.:
{
    "sendTo": "2NF7mYkk4JsqCuVeQ3if99ot1u6vuWNcRWM"
    "amount": "0.001"
}

Response Body
{
  "txid": "180e181d6c193587dfa529c3ef2b0b5a398b7f70acc60f71e9884ba4dae3e197"
}
Response Code
200

### OR 

{
  "statusCode": 406,
  "error": "Not Acceptable",
  "message": "No unspent transaction available."
}
### OR 

{
  "statusCode": 406,
  "error": "Not Acceptable",
  "message": "Insufficient funds."
}
