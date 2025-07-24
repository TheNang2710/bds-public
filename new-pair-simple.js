const WebSocketClient = require('websocket').client;
const util = require("util");

const client = new WebSocketClient();

// Hardcoded API key
const apiKey = 'API_KEY_HERE';

// Construct the WebSocket URL
const url = util.format('wss://public-api.birdeye.so/socket/%s?x-api-key=%s', 'solana', apiKey);

// Function to handle connection close
const handleConnectionClose = () => {
    console.log('WebSocket Connection Closed');
};

client.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString());
    handleConnectionClose();
});

client.on('connect', function (connection) {
    console.log('WebSocket Client Connected');

    connection.on('error', function (error) {
        console.log("Connection Error: " + error.toString());
        connection.close();
    });

    connection.on('close', handleConnectionClose);

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            const data = JSON.parse(message.utf8Data);

            // Process only NEW_PAIR_DATA messages
            if (data.type === 'NEW_PAIR_DATA') {
                console.log('New Pair Data Received:');
                console.log(data.data); // Display the data to the command UI
            }
        }
    });

    // Send a subscription message for new pairs
    const subscriptionMsgPair = {
        type: "SUBSCRIBE_NEW_PAIR"
    };
    connection.send(JSON.stringify(subscriptionMsgPair));

    // Automatically close the connection after 24 hours
    setTimeout(() => {
        connection.close();
        console.log('Connection automatically closed after 24 hours');
    }, 86400000); // 24 hours in milliseconds

    // Listen for user input to cancel the connection
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
        connection.close();
        console.log('Connection manually closed by user');
        process.exit(0);
    });
});

// Connect to WebSocket with specified URL
client.connect(url, 'echo-protocol');
