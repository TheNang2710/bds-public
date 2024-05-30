const WebSocketClient = require('websocket').client;
const util = require("util");
require('dotenv').config();

// Load the API key from environment variables
const apiKey = process.env.apiKey;
if (!apiKey) {
    throw new Error('API_KEY must be set in the environment.');
}

// Chain defaults to 'solana' if not specified, pairAddress to provided default
const chain = process.argv[2] || 'solana';
const defaultPairAddress = 'JCt2VNnh4jtEceWcCJQJwgTnL6DZyPniqgii8Ur4g272';
const pairAddress = process.argv[3] || defaultPairAddress;

const url = util.format('wss://public-api.birdeye.so/socket/%s?x-api-key=%s', chain, apiKey);

const client = new WebSocketClient();

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
            console.log("Received:", message.utf8Data);
            const data = JSON.parse(message.utf8Data);
            if (data.type === "TXS_DATA" && data.data) {
                console.log('Transaction Data:', data);
            }
        }
    });

    // Subscription message for pair transactions with default or specified pair address
    const subscriptionMsg = {
        type: "SUBSCRIBE_TXS",
        data: {
            queryType: "simple",
            pairAddress: pairAddress
        }
    };

    connection.send(JSON.stringify(subscriptionMsg));
});

client.connect(url, 'echo-protocol');
