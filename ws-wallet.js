const WebSocketClient = require('websocket').client;
const util = require("util");

const client = new WebSocketClient();

// 🔑 Set API key directly in the code
const apiKey = "YOUR_BIRDEYE_API_KEY_HERE"; // Replace with your actual API key

// Accept chain and wallet address from command line arguments with defaults
const chain = process.argv[2] || 'solana'; // Default to 'solana' if not specified
const walletAddress = process.argv[3] || 'FXdojkHs9SUwzPuE4NPD5XrgWdKEdBL4m8juNrWcARce'; // Default wallet address

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
            try {
                const data = JSON.parse(message.utf8Data);

                switch (data.type) {
                    case 'WALLET_TXS_DATA':
                        console.log("\nWallet Transaction Update Received:");
                        console.log(`Type: ${data.data.type}`);
                        console.log(`Time: ${data.data.blockHumanTime} (Unix: ${data.data.blockUnixTime})`);
                        console.log(`Owner: ${data.data.owner}`);
                        console.log(`Source: ${data.data.source}`);
                        console.log(`Transaction Hash: ${data.data.txHash}`);
                        console.log(`Volume (USD): $${data.data.volumeUSD.toLocaleString()}`);
                        console.log(`Network: ${data.data.network}`);
                        console.log(`\nBase Token`);
                        console.log(`  Address: ${data.data.base.address}`);
                        console.log(`  Amount: ${data.data.base.uiAmount}`);
                        console.log(`\nQuote Token`);
                        console.log(`  Address: ${data.data.quote.address}`);
                        console.log(`  Amount: ${data.data.quote.uiAmount}`);
                        break;
                    
                    case 'WELCOME':
                        console.log('Welcome Message Received');
                        break;
                    
                    default:
                        console.log('Unhandled message type:', data.type);
                }
            } catch (err) {
                console.error("Error parsing JSON:", err);
            }
        }
    });

    // Send a subscription message for wallet transactions
    const subscriptionMsg = {
        type: "SUBSCRIBE_WALLET_TXS",
        data: {
            address: walletAddress
        }
    };

    connection.send(JSON.stringify(subscriptionMsg));

    // Automatically close the connection after 1 hour
    setTimeout(() => {
        connection.close();
        console.log('Connection automatically closed after 1 hour');
    }, 3600000); // 1 hour in milliseconds
});

// Connect to WebSocket with specified URL and protocol (if required)
client.connect(url, 'echo-protocol');
