import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { SocketService } from "./utils/socket";
import { ExtendedWebSocket } from "./utils/constants";
import { WebSocketMessage } from "@window/shared";

const PORT = Number(process.env.PORT) || 8080;

const socketService = new SocketService();

// Create HTTP server for health endpoint
const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ status: "ok", timestamp: new Date().toISOString() })
    );
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Attach WebSocket server to the HTTP server
const wss = new WebSocketServer({ server });

server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
  console.log(`Health endpoint available at http://localhost:${PORT}/health`);
});

const registerWSEventHandlers = (ws: ExtendedWebSocket) => {
  try {
    // @ts-expect-error
    ws.on("message", (data) => {
      console.debug("Received message");
      try {
        const message = JSON.parse(data.toString());
        console.info("Parsed message:", message);
        socketService.handleMessage(ws, message as WebSocketMessage);
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });

    // @ts-expect-error
    ws.on("close", () => {
      console.log("Client disconnected");
    });

    // @ts-expect-error
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  } catch (error) {
    console.error("Error in registering WebSocket event handlers:", error);
  }
};

wss.on("connection", (ws: ExtendedWebSocket) => {
  console.debug("New client connected");
  registerWSEventHandlers(ws);
});

const gracefulShutdown = () => {
  console.log("Server shutting down gracefully...");

  // Close all WebSocket connections
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1001, "Server restarting");
    }
  });

  // Close the WebSocket server
  wss.close(() => {
    console.log("WebSocket server closed");
    // Close the HTTP server
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });
};

// Handle different termination signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Handle process restart (for development)
process.on("SIGUSR2", gracefulShutdown); // nodemon sends this signal

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown();
});
