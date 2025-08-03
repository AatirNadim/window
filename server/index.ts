import { WebSocketServer, WebSocket } from "ws";
import { ExtendedWebSocket, Room, WebSocketMessage } from "./utils/types";
import { SocketService } from "./utils/socket";

const PORT = Number(process.env.PORT) || 8080;

// // Extend WebSocket type to include custom properties

// In-memory storage (use Redis in production)
const rooms = new Map<string, Room>();
const userSockets = new Map<string, ExtendedWebSocket>();

const socketService = new SocketService(rooms, userSockets);

const wss = new WebSocketServer({ port: PORT });

console.log(`🚀 Signaling server running on port ${PORT}`);

wss.on("connection", (ws: ExtendedWebSocket) => {
  console.debug("New client connected");

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
    console.debug("Client disconnected");
  });

  // @ts-expect-error
  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
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
    process.exit(0);
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
