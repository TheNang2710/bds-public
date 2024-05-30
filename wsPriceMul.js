require('dotenv').config();
const WebSocketClient = require('websocket').client;
const fs = require('fs');
const util = require('util');
const yargs = require('yargs');

// Handle command-line arguments
const argv = yargs
    .option('chain', {
        alias: 'c',
        description: 'Blockchain chain to connect',
        type: 'string',
        default: 'solana'  // default chain if not specified
    })
    .help()
    .alias('help', 'h')
    .argv;

// Load the API key and use the chain from command line or default to 'solana'
const apiKey = process.env.apiKey;
const chain = argv.chain;
const url = util.format('wss://public-api.birdeye.so/socket/%s?x-api-key=%s', chain, apiKey);

// Load token list from a JSON file
const tokenList = JSON.parse(fs.readFileSync('tokenlist.json', 'utf8')).tokens;
const queryParts = tokenList.map(token => {
    return `(address = ${token.address} AND chartType = ${token.chartType} AND currency = ${token.currency})`;
});
const complexQuery = queryParts.join(' OR ');

const client = new WebSocketClient();

client.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function (connection) {
    console.log('WebSocket Client Connected');

    connection.on('error', function (error) {
        console.log("Connection Error: " + error.toString());
    });

    connection.on('close', function (code, reason) {
        console.log('WebSocket Connection Closed');
        console.log('Code:', code, 'Reason:', reason);
    });

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
            const data = JSON.parse(message.utf8Data);
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

    // Send a subscription message with dynamically constructed complex query
    const subscriptionMsg = {
        type: "SUBSCRIBE_PRICE",
        data: {
            queryType: "complex",
            query: complexQuery
        }
    };

    connection.send(JSON.stringify(subscriptionMsg));

    // Close the connection after 1 hour
    setTimeout(() => {
        connection.close();
        console.log('Connection closed after 1 hours');
    }, 3600000); // 3600000 milliseconds = 1 hour
});

client.connect(url, 'echo-protocol');
