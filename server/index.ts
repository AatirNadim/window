import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { SocketService } from "./utils/socket";
import { ExtendedWebSocket } from "./utils/constants";
import { WebSocketMessage } from "@window/shared";
import { createHmac } from "node:crypto";

const PORT = Number(process.env.PORT) || 8080;

const socketService = new SocketService();

// Create HTTP server for health endpoint
const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/ice-servers") {
    const turnUrls =
      process.env.TURN_URLS?.split(",")
        .map((url) => url.trim())
        .filter(Boolean) ?? [];
    const turnSecret = process.env.TURN_SHARED_SECRET;
    const iceServers: Array<{
      urls: string[];
      username?: string;
      credential?: string;
    }> = [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ];

    if (turnUrls.length && turnSecret) {
      const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
      const username = `${expiresAt}:window`;
      const credential = createHmac("sha1", turnSecret)
        .update(username)
        .digest("base64");
      iceServers.push({ urls: turnUrls, username, credential });
    }

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ iceServers }));
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
    );
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Attach WebSocket server to the HTTP server
const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });

server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
  console.log(`Health endpoint available at http://localhost:${PORT}/health`);
});

const registerWSEventHandlers = (ws: ExtendedWebSocket) => {
  try {
    // @ts-expect-error
    ws.on("message", (data) => {
      try {
        if (data.toString().length > 64 * 1024)
          throw new Error("Message exceeds 64 KB limit");
        const message = JSON.parse(data.toString());
        socketService.handleMessage(ws, message as WebSocketMessage);
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });

    // @ts-expect-error
    ws.on("close", () => {
      console.log("Client disconnected");
      socketService.cleanupSocket(ws);
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
