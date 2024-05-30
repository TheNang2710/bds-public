const WebSocketClient = require('websocket').client;
const util = require('util');
const fs = require('fs');
require('dotenv').config();
const client = new WebSocketClient();

// Load the API key from environment variables
const apiKey = process.env.apiKey;

// Accept chain from command line arguments with a default
const chain = process.argv[2] || 'solana'; // Default to 'solana' if not specified

// Read the token list from tokenListTxs.json
const tokenList = JSON.parse(fs.readFileSync('tokenListTxs.json', 'utf8'));

// Construct the WebSocket URL
const url = util.format('wss://public-api.birdeye.so/socket/%s?x-api-key=%s', chain, apiKey);

client.on('connectFailed', function(error) {
    console.error('Connect Error:', error.toString());
});

client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');

    connection.on('error', function(error) {
        console.error('Connection Error:', error.toString());
    });

    connection.on('close', function() {
        console.log('WebSocket Connection Closed');
    });

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received:', message.utf8Data);
            const data = JSON.parse(message.utf8Data);
            if (data.blockUnixTime) { // Simple check to ensure it's a transaction message
                console.log('Transaction Data:', data);
            }
        }
    });

    // Build the complex query string from the token list
    const query = tokenList.tokens.map(token => `address = ${token.address}`).join(' OR ');

    // Subscription message for token transactions with a complex query
    const subscriptionMsg = {
        type: 'SUBSCRIBE_TXS',
        data: {
            queryType: 'complex',
            query: query
        }
    };

    connection.send(JSON.stringify(subscriptionMsg));

    // Automatically close the connection after 1 hour
    setTimeout(() => {
        connection.close();
        console.log('Connection automatically closed after 1 hour');
    }, 3600000); // 1 hour in milliseconds
});

client.connect(url, 'echo-protocol');
