const WebSocketClient = require('websocket').client;
const util = require("util");
require('dotenv').config();
const client = new WebSocketClient();

const apiKey = process.env.BIRDEYE_API_KEY;
const chain = process.argv[2] || 'solana'; // Default to 'solana'
const baseAddress = process.argv[3] || 'So11111111111111111111111111111111111111112'; // Default base token address
const quoteAddress = process.argv[4] || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // Default quote token address
const chartType = process.argv[5] || '1m'; // Default to '1m'

// Debugging: Log the passed parameters to verify them
console.log(`Chain: ${chain}`);
console.log(`Base Address: ${baseAddress}`);
console.log(`Quote Address: ${quoteAddress}`);
console.log(`Chart Type: ${chartType}`);

const subscriptionData = {
    type: "SUBSCRIBE_BASE_QUOTE_PRICE",
    data: {
        baseAddress: baseAddress,
        quoteAddress: quoteAddress,
        chartType: chartType
    }
};

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

    connection.on('ping', function (_) {
        console.log("Received ping from server");
        connection.pong();
    });

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received:", message.utf8Data);
            const data = JSON.parse(message.utf8Data);

            switch(data.type) {
                case 'BASE_QUOTE_PRICE_DATA':
                    console.log('Price Update Received:');
                    console.log(`Open: ${data.data.o}`);
                    console.log(`High: ${data.data.h}`);
                    console.log(`Low: ${data.data.l}`);
                    console.log(`Close: ${data.data.c}`);
                    console.log(`Volume: ${data.data.v}`);
                    console.log(`Base Address: ${data.data.baseAddress}`);
                    console.log(`Quote Address: ${data.data.quoteAddress}`);
                    console.log(`Time: ${new Date(data.data.unixTime * 1000).toLocaleString()}`);
                    break;
                case 'WELCOME':
                    console.log('Welcome Message Received');
                    break;
                case 'ERROR':
                    console.error('Error Received:', data.data);
                    break;
                default:
                    console.log('Unhandled message type:', data.type);
            }
        }
    });

    connection.send(JSON.stringify(subscriptionData));

    setTimeout(() => {
        connection.close();
        console.log('Connection automatically closed after 1 hour');
    }, 3600000);
});

client.connect(url, 'echo-protocol');
