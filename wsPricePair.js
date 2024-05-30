const WebSocketClient = require('websocket').client;
const util = require("util");
require('dotenv').config();

const chain = process.argv[2] || 'solana'; // Use command line argument or default to 'solana'
const defaultPairAddress = 'JCt2VNnh4jtEceWcCJQJwgTnL6DZyPniqgii8Ur4g272';
const pairAddress = process.argv[3] || defaultPairAddress;

if (!pairAddress) {
    throw new Error('Pair token address must be provided as a command line argument.');
}

const apiKey = process.env.apiKey;
if (!apiKey) {
    throw new Error('API_KEY must be set in the environment.');
}

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
            if (data.type === "PRICE_DATA" && data.data) {
                console.log('Price Data:', data);
            }
        }
    });

    // Subscription message for pair token price updates
    const subscriptionMsg = {
        type: "SUBSCRIBE_PRICE",
        data: {
            queryType: "simple",
            chartType: "1m",
            address: pairAddress,
            currency: "pair"
        }
    };

    connection.send(JSON.stringify(subscriptionMsg));
});

client.connect(url, 'echo-protocol');
