package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/websocket"
)

type SubscriptionMessage struct {
	Type string `json:"type"`
	Data struct {
		QueryType string `json:"queryType"`
		ChartType string `json:"chartType"`
		Address   string `json:"address"`
		Currency  string `json:"currency"`
	} `json:"data"`
}

func main() {
	// Load API key from environment variables
	apiKey := os.Getenv("BIRDEYE_API_KEY")
	if apiKey == "" {
		log.Fatal("Error: BIRDEYE_API_KEY environment variable not set")
	}

	// Accept chain and address from command line arguments with defaults
	chain := "solana"
	if len(os.Args) > 1 {
		chain = os.Args[1]
	}

	address := "So11111111111111111111111111111111111111112"
	if len(os.Args) > 2 {
		address = os.Args[2]
	}

	// Construct the WebSocket URL
	url := fmt.Sprintf("wss://public-api.birdeye.so/socket/%s?x-api-key=%s", chain, apiKey)
	fmt.Println("Connecting to WebSocket URL:", url)

	// Set up custom headers
	headers := http.Header{}
	headers.Add("Origin", "ws://public-api.birdeye.so")
	headers.Add("Sec-WebSocket-Origin", "ws://public-api.birdeye.so")
	headers.Add("Sec-WebSocket-Protocol", "echo-protocol")

	// Connect to WebSocket with custom headers
	conn, resp, err := websocket.DefaultDialer.Dial(url, headers)
	if err != nil {
		log.Fatalf("Connection failed: %s, HTTP status: %d", err, resp.StatusCode)
	}
	defer conn.Close()

	log.Println("WebSocket Client Connected")

	// Subscription message
	subscriptionMsg := SubscriptionMessage{
		Type: "SUBSCRIBE_PRICE",
	}
	subscriptionMsg.Data.QueryType = "simple"
	subscriptionMsg.Data.ChartType = "1m"
	subscriptionMsg.Data.Address = address
	subscriptionMsg.Data.Currency = "usd"

	// Send subscription message
	err = conn.WriteJSON(subscriptionMsg)
	if err != nil {
		log.Fatalf("Error sending subscription message: %s", err)
	}

	// Automatically close the connection after 1 hour
	go func() {
		time.Sleep(1 * time.Hour)
		conn.Close()
		log.Println("Connection automatically closed after 1 hour")
	}()

	// Handle incoming messages
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Connection error: %s", err)
			break
		}

		// Process message
		var data map[string]interface{}
		err = json.Unmarshal(message, &data)
		if err != nil {
			log.Printf("Error parsing message: %s", err)
			continue
		}

		messageType, ok := data["type"].(string)
		if !ok {
			log.Println("Message type not found")
			continue
		}

		switch messageType {
		case "PRICE_DATA":
			log.Println("Price Update Received:")
			priceData := data["data"].(map[string]interface{})
			log.Printf("Open: %v, High: %v, Low: %v, Close: %v, Volume: %v, Symbol: %v, Time: %v",
				priceData["o"], priceData["h"], priceData["l"], priceData["c"],
				priceData["v"], priceData["symbol"],
				time.Unix(int64(priceData["unixTime"].(float64)/1000), 0).Format(time.RFC3339))
		case "WELCOME":
			log.Println("Welcome Message Received")
		default:
			log.Printf("Unhandled message type: %s", messageType)
		}
	}
}
