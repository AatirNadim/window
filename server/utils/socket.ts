import {
  WebSocketMessage,
  Room,
  User,
  JoinRoomMessage,
  LeaveRoomMessage,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
  UserJoinedMessage,
  UserLeftMessage,
  ErrorMessage,
  ExtendedWebSocket,
} from "./types";

export class SocketService {
  constructor(
    private rooms: Map<string, Room>,
    private userSockets: Map<string, ExtendedWebSocket>
  ) {}

  handleMessage(ws: ExtendedWebSocket, message: WebSocketMessage) {
    console.debug("Handling websocket message from client:", message);
    try {
      switch (message.type) {
        case "join-room":
          this.joinRoom(ws, message);
          break;
        case "leave-room":
          console.log(
            "received message to leave the room with id:",
            message.roomId,
            "by the user id: ",
            message.userId
          );
          this.handleLeaveRoom(ws, message);
          break;
        case "offer":
          this.handleOffer(message);
          break;
        case "answer":
          this.handleAnswer(message);
          break;
        case "ice-candidate":
          this.handleIceCandidate(message);
          break;
        default:
          console.warn("Unknown message type:", message.type);
          throw new Error(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error("Error handling message:", error);
      const errorMessage: ErrorMessage = {
        type: "error",
        message: "An error occurred while processing your request.",
      };
      ws.send(JSON.stringify(errorMessage));
    } finally {
      console.log("\nroom details:", Array.from(this.rooms.keys()));
      console.log("user sockets:", Array.from(this.userSockets.keys()), "\n");
    }
  }

  private joinRoom(ws: ExtendedWebSocket, message: JoinRoomMessage) {
    const { roomId, userId, userName } = message;

    const user: User = {
      id: userId,
      name: userName,
    };

    ws.userId = userId;

    ws.roomId = roomId;
    this.userSockets.set(userId, ws);

    let room = this.rooms.get(roomId);
    if (!room) {
      console.log(
        "No existing room with the id:",
        roomId,
        "creating a new room"
      );
      room = { id: roomId, users: [] };
    }

    if (!room.users.find((u) => u.id === userId)) {
      room.users.push(user);
    } else {
      console.log("User already in room:", userId);
      return;
    }

    this.rooms.set(roomId, room);

    console.log(`User ${userId} joined room ${roomId}`);

    this.broadcastToRoom(roomId, {
      roomId,
      type: "user-joined",
      userId,
      userName,
    } as UserJoinedMessage);
  }

  private handleOffer(message: OfferMessage) {
    const { toUserId } = message;
    const targetSocket = this.userSockets.get(toUserId);

    console.debug("Sending offer to user:", toUserId, "message:", message);
    targetSocket?.send(JSON.stringify(message));
  }

  private handleAnswer(message: AnswerMessage) {
    const { toUserId } = message;
    const targetSocket = this.userSockets.get(toUserId);

    console.debug("Sending answer to user:", toUserId, "message:", message);
    targetSocket?.send(JSON.stringify(message));
  }

  private handleIceCandidate(message: IceCandidateMessage) {
    const { toUserId } = message;
    const targetSocket = this.userSockets.get(toUserId);

    if (targetSocket) {
      targetSocket.send(JSON.stringify(message));
    }
  }

  private handleLeaveRoom(ws: ExtendedWebSocket, message: LeaveRoomMessage) {
    const { roomId, userId } = message;

    const room = this.rooms.get(roomId);

    if (!room) {
      console.warn(`Room with ID ${roomId} does not exist.`);
      return;
    }

    room.users = room.users.filter((u) => u.id !== userId);

    // Remove empty rooms
    if (room.users.length === 0) {
      this.rooms.delete(roomId);
    } else {
      room.users = room.users.filter((u) => u.id !== userId);

      this.rooms.set(roomId, room);

      // Notify remaining users
      const userLeftMessage: UserLeftMessage = {
        type: "user-left",
        roomId,
        userId,
      };
      this.broadcastToRoom(roomId, userLeftMessage);
    }

    this.userSockets.delete(userId);

    console.log(`User ${userId} left room ${roomId}`);
  }

  private sendSocketMessageUtil(userIds: string[], message: WebSocketMessage) {
    userIds.forEach((userId) => {
      const userSocket = this.userSockets.get(userId);
      if (userSocket && userSocket.readyState === WebSocket.OPEN) {
        userSocket.send(JSON.stringify(message));
      } else {
        console.warn(
          `Socket for user ${userId} is not available or not ready.`
        );
        throw new Error(
          `Socket for user ${userId} is not available or not ready.`
        );
      }
    });
  }

  private broadcastToRoom(roomId: string, message: WebSocketMessage) {
    try {
      const room = this.rooms.get(roomId);

      if (!room) {
        throw new Error(`Room with ID ${roomId} does not exist.`);
      }
      // for now, send user-join notification to all users in the room

      switch (message.type) {
        case "user-joined":
          console.log(`Broadcasting user-joined message to room ${roomId}`);
          this.sendSocketMessageUtil(
            room.users.filter((u) => u.id !== message.userId).map((u) => u.id),
            message
          );
          break;
        case "user-left":
          console.log(`Broadcasting user-left message to room ${roomId}`);
          this.sendSocketMessageUtil(
            room.users.filter((u) => u.id !== message.userId).map((u) => u.id),
            message
          );
          break;
        case "offer":
          console.log(`Broadcasting offer message to room ${roomId}`);
          this.sendSocketMessageUtil(
            room.users
              .filter((u) => u.id === message.toUserId)
              .map((u) => u.id),
            message
          );
          break;
        case "answer":
          console.log(`Broadcasting answer message to room ${roomId}`);
          this.sendSocketMessageUtil(
            room.users
              .filter((u) => u.id === message.toUserId)
              .map((u) => u.id),
            message
          );
          break;
        case "ice-candidate":
          console.log(`Broadcasting ice-candidate message to room ${roomId}`);
          this.sendSocketMessageUtil(
            room.users
              .filter((u) => u.id === message.toUserId)
              .map((u) => u.id),
            message
          );
          break;
        default:
          console.warn(
            `Broadcasting unknown message type ${message.type} to room ${roomId}`
          );
          throw new Error(
            `Unknown message type: ${message.type} for room ${roomId}`
          );
      }
    } catch (error) {
      console.error("Error broadcasting message:", error);
      throw error;
    }
  }
}
