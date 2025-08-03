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

  ws.on("close", () => {
    console.debug("Client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});
