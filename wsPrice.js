const WebSocketClient = require('websocket').client;
const util = require("util");
const fs = require('fs');
require('dotenv').config();
const client = new WebSocketClient();

// Load the API key from environment variables
const apiKey = process.env.apiKey;

// Accept chain and address from command line arguments with defaults
const chain = process.argv[2] || 'solana'; // Default to 'solana' if not specified
const address = process.argv[3] || 'So11111111111111111111111111111111111111112'; // Default address

// Construct the WebSocket URL
const url = util.format('wss://public-api.birdeye.so/socket/%s?x-api-key=%s', chain, apiKey);

client.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function (connection) {
    console.log('WebSocket Client Connected');

    connection.on('error', function (error) {
        console.log("Connection Error: " + error.toString());
    });

    connection.on('close', function () {
        console.log('WebSocket Connection Closed');
    });

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
            const data = JSON.parse(message.utf8Data);

            // Process different message types
            switch(data.type) {
                case 'PRICE_DATA':
                    console.log('Price Update Received:');
                    console.log(`Open: ${data.data.o}`);
                    console.log(`High: ${data.data.h}`);
                    console.log(`Low: ${data.data.l}`);
                    console.log(`Close: ${data.data.c}`);
                    console.log(`Volume: ${data.data.v}`);
                    console.log(`Symbol: ${data.data.symbol}`);
                    console.log(`Time: ${new Date(data.data.unixTime * 1000).toLocaleString()}`);
                    break;
                case 'WELCOME':
                    console.log('Welcome Message Received');
                    break;
                default:
                    console.log('Unhandled message type:', data.type);
            }
        }
    });

    // Send a subscription message
    const subscriptionMsg = {
        type: "SUBSCRIBE_PRICE",
        data: {
            queryType: "simple",
            chartType: "1m",
            address: address,
            currency: "usd"
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
