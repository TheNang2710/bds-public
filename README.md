# bds-public

# bds

# Setting Up WebSocket Client for Token Subscription

This guide will walk you through the steps needed to set up a WebSocket client for subscribing to token price updates. You will learn how to add an API key to the `.env` file and install the required packages.

## Prerequisites

- Node.js installed on your system.
- An API key from Birdeye or relevant service.

## Step 1: Create and Configure `.env` File

1. In your project directory, create a file named `.env` if it doesn't already exist.
2. Add your API key to the `.env` file using the following format:

    ```plaintext
    apiKey=YOUR_API_KEY_HERE
    ```

    Replace `YOUR_API_KEY_HERE` with your actual API key.

## Step 2: Install Required Packages

Run the following command to install the necessary Node.js packages:

```bash
npm install websocket dotenv util fs
```

## Step 3: Run the command for different js file as below
All are automatically close connection after 1 hour.

# Running WebSocket for Token Price Simple Subscription

To run the WebSocket for subscribing to a single token, you need to pass two arguments: the blockchain `chain` and the `token address`. If no arguments are passed, the default are chain = solana and token address is $SOL. Here is the command to execute this using Node.js:

## Command Syntax

```bash
node wsPrice.js <chain> <token address>
```
# Token Price Complex Subscription

To run a complex subscription for multiple tokens, you need to update the `tokenlist.json` file in the following format:

```json
{
  "tokens": [
    {"address": "So11111111111111111111111111111111111111112", "chartType": "1m", "currency": "usd"},
    {"address": "oreoN2tQbHXVaZsr3pf66A48miqcBXCDJozganhEJgz", "chartType": "1m", "currency": "usd"},
    {"address": "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5", "chartType": "1m", "currency": "usd"}
  ]
}
```
After updating the tokenlist.json file with the desired tokens and their respective chart types and currencies, you can run the WebSocket client for complex subscriptions using the following command:

```bash
node wsPriceMul.js
```
This command will initiate the WebSocket connection and subscribe to the price updates for all tokens listed in the tokenlist.json file.

# Running WebSocket for Token Transaction Simple Subscription

To run the WebSocket for subscribing to a single token, you need to pass two arguments: the blockchain `chain` and the `token address`. If no arguments are passed, the default are chain = solana and token address is $SOL. Here is the command to execute this using Node.js:

## Command Syntax

```bash
node wsTxs.js <chain> <token address>
```

# Multiple Token Transactions Subscription

To run a complex subscription for multiple tokens, you need to update the `tokenListTxs.json` file in the following format:

```json
{
  "tokens": [
    {"address": "So11111111111111111111111111111111111111112"},
    {"address": "oreoN2tQbHXVaZsr3pf66A48miqcBXCDJozganhEJgz"},
    {"address": "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5"}
  ]
}
```
The tokenListTxs.json file can contain up to a maximum of 100 addresses. Each entry should include either the token address or the pair address.

After updating the tokenListTxs.json file with the desired token addresses, you can run the WebSocket client for multiple token transactions using the following command:

```bash
node wsTxsMul.js
```
This command will initiate the WebSocket connection and subscribe to the transaction updates for all tokens listed in the tokenListTxs.json file.
