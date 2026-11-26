import { WebSocket } from "ws";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type {
  AnswerMessage, IceCandidateMessage, JoinRoomMessage, LeaveRoomMessage,
  OfferMessage, Room, UserJoinedMessage, UserLeftMessage, WebSocketMessage,
} from "@window/shared";
import { ExtendedWebSocket, MAX_USERS_PER_ROOM } from "./constants";

const MAX_KNOWN_IDENTITIES = 100_000;

export class SocketService {
  private rooms = new Map<string, Room>();
  private userSockets = new Map<string, ExtendedWebSocket>();
  private identityTokens = new Map<string, Buffer>();
  handleMessage(ws: ExtendedWebSocket, raw: WebSocketMessage) {
    try {
      if (!raw || typeof raw !== "object" || typeof raw.type !== "string")
        throw new Error("Invalid message");
      const message = raw as WebSocketMessage;
      switch (message.type) {
        case "join-room":
          this.joinRoom(ws, message);
          break;
        case "leave-room":
          this.handleLeaveRoom(ws, message);
          break;
        case "offer":
          this.routePeerMessage(ws, message, message.toUserId);
          break;
        case "answer":
          this.routePeerMessage(ws, message, message.toUserId);
          break;
        case "ice-candidate":
          this.routePeerMessage(ws, message, message.toUserId);
          break;
        default:
          throw new Error("Unsupported message type");
      }
    } catch (error) {
      this.send(ws, {
        type: "error",
        message: error instanceof Error ? error.message : "Invalid request",
      });
    }
  }

  cleanupSocket(ws: ExtendedWebSocket) {
    this.removeUser(ws);
  }

  private send(ws: ExtendedWebSocket | undefined, message: WebSocketMessage) {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  }

  private joinRoom(ws: ExtendedWebSocket, message: JoinRoomMessage) {
    if (
      typeof message.roomId !== "string" ||
      !message.roomId ||
      message.roomId.length > 128 ||
      typeof message.userId !== "string" ||
      !message.userId ||
      message.userId.length > 128 ||
      typeof message.userName !== "string" ||
      !message.userName ||
      message.userName.length > 64
    )
      throw new Error("Invalid room identity");
    if (ws.roomId && ws.userId) this.removeUser(ws);
    const existingSocket = this.userSockets.get(message.userId);
    if (existingSocket && existingSocket !== ws)
      throw new Error("This peer identity is already active");
    const room = this.rooms.get(message.roomId) ?? {
      id: message.roomId,
      users: [],
    };
    if (room.users.some((user) => user.id === message.userId))
      throw new Error("User is already in this room");
    if (room.users.length >= MAX_USERS_PER_ROOM) {
      this.send(ws, { type: "room-full", roomId: message.roomId });
      return;
    }
    let identityToken = this.identityTokens.get(message.userId);
    if (identityToken) {
      const suppliedToken = Buffer.from(message.identityToken ?? "", "hex");
      if (
        suppliedToken.length !== identityToken.length ||
        !timingSafeEqual(suppliedToken, identityToken)
      )
        throw new Error("Peer identity proof is missing or invalid");
    } else {
      if (this.identityTokens.size >= MAX_KNOWN_IDENTITIES)
        throw new Error("Room identity capacity is temporarily full");
      identityToken = randomBytes(32);
      this.identityTokens.set(message.userId, identityToken);
    }
    ws.userId = message.userId;
    ws.userName = message.userName;
    ws.roomId = message.roomId;
    this.userSockets.set(message.userId, ws);
    room.users.push({ id: message.userId, name: message.userName });
    this.rooms.set(message.roomId, room);
    this.send(ws, {
      type: "identity-accepted",
      userId: message.userId,
      identityToken: identityToken.toString("hex"),
    });
    this.broadcast(
      message.roomId,
      {
        type: "user-joined",
        roomId: message.roomId,
        userId: message.userId,
        userName: message.userName,
      },
      message.userId,
    );
  }

  private routePeerMessage(
    ws: ExtendedWebSocket,
    message: OfferMessage | AnswerMessage | IceCandidateMessage,
    toUserId: string,
  ) {
    if (
      !this.isMember(ws) ||
      message.roomId !== ws.roomId ||
      message.fromUserId !== ws.userId
    )
      throw new Error("Invalid peer signaling identity");
    const room = this.rooms.get(ws.roomId!);
    if (!room?.users.some((user) => user.id === toUserId))
      throw new Error("Target peer is not in this room");
    const target = this.userSockets.get(toUserId);
    if (target?.roomId !== ws.roomId)
      throw new Error("Target peer is unavailable");
    this.send(target, message);
  }

  private removeUser(ws: ExtendedWebSocket) {
    const userId = ws.userId;
    const roomId = ws.roomId;
    if (!userId || !roomId) return;
    if (this.userSockets.get(userId) === ws) this.userSockets.delete(userId);
    const room = this.rooms.get(roomId);
    if (room) {
      room.users = room.users.filter((user) => user.id !== userId);
      if (room.users.length) this.rooms.set(roomId, room);
      else this.rooms.delete(roomId);
      this.broadcast(roomId, { type: "user-left", roomId, userId }, userId);
    }
    ws.userId = undefined;
    ws.userName = undefined;
    ws.roomId = undefined;
  }

  private handleLeaveRoom(ws: ExtendedWebSocket, _message: LeaveRoomMessage) {
    this.removeUser(ws);
  }
  private isMember(ws: ExtendedWebSocket) {
    return (
      !!ws.roomId &&
      !!ws.userId &&
      this.userSockets.get(ws.userId) === ws &&
      this.rooms.get(ws.roomId)?.users.some((user) => user.id === ws.userId)
    );
  }

  private broadcast(
    roomId: string,
    message: UserJoinedMessage | UserLeftMessage,
    exceptId: string,
  ) {
    for (const user of this.rooms.get(roomId)?.users ?? [])
      if (user.id !== exceptId)
        this.send(this.userSockets.get(user.id), message);
  }
}
