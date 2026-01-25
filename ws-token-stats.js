const WebSocketClient = require('websocket').client;
const util = require("util");
require('dotenv').config();
const client = new WebSocketClient();

// Load the API key from environment variables
const apiKey = process.env.BIRDEYE_API_KEY;

// Validate the API key
if (!apiKey) {
    console.error("Error: API key not found. Please set it in the .env file as 'BIRDEYE_API_KEY'.");
    process.exit(1);
}

// Accept chain and list of addresses from command line arguments
const chain = process.argv[2] || 'solana'; // Default to 'solana'
const addressesArg = process.argv[3] || '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN,EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm';

// Parse addresses
let addresses;
try {
    addresses = addressesArg.split(',').map(addr => addr.trim());
    if (addresses.length === 0 || addresses.some(addr => addr === '')) {
        throw new Error("Invalid address format");
    }
} catch (error) {
    console.error("Error: Invalid addresses format. Please provide a comma-separated list of addresses.");
    console.error("Example: node ws-token-stats.js solana address1,address2,address3");
    process.exit(1);
}

// Construct the WebSocket URL
const url = util.format('wss://zap-api.birdeye.so/socket/%s?x-api-key=%s', chain, apiKey);
console.log("Connecting to WebSocket...");

client.on('connectFailed', function (error) {
    console.error('Connect Error:', error.toString());
});

client.on('connect', function (connection) {
    console.log('WebSocket Client Connected');

    connection.on('error', function (error) {
        console.error("Connection Error:", error.toString());
    });

    connection.on('close', function () {
        console.log('WebSocket Connection Closed');
    });

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log("Received Message:", message.utf8Data);
            const data = JSON.parse(message.utf8Data);

            // Process different message types
            switch (data.type) {
                case 'TOKEN_STATS':
                    console.log('Token Stats Update Received:');
                    console.log(JSON.stringify(data.data, null, 2));
                    break;
                case 'WELCOME':
                    console.log('Welcome Message Received');
                    break;
                default:
                    console.log('Unhandled Message Type:', data.type);
            }
        }
    });

    // Send the subscription message
    const subscriptionMsg = {
        type: "SUBSCRIBE_TOKEN_STATS",
        data: {
            address: addresses
        }
    };

    connection.send(JSON.stringify(subscriptionMsg));
    console.log("Subscription message sent:", JSON.stringify(subscriptionMsg));

    // Automatically close the connection after 1 hour
    setTimeout(() => {
        connection.close();
        console.log('Connection automatically closed after 1 hour');
    }, 3600000); // 1 hour in milliseconds
});

client.connect(url, 'echo-protocol');
