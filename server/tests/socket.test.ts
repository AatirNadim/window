import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { SocketService } from "../utils/socket";
import type { WebSocketMessage } from "@window/shared";
import type { ExtendedWebSocket } from "../utils/constants";

class FakeSocket {
  readyState = WebSocket.OPEN;
  userId?: string;
  userName?: string;
  roomId?: string;
  sent: WebSocketMessage[] = [];
  send(payload: string) { this.sent.push(JSON.parse(payload)); }
}
const socket = (service: SocketService, id: string) => {
  const peer = new FakeSocket();
  service.handleMessage(peer as unknown as ExtendedWebSocket, { type: "join-room", roomId: "room", userId: id, userName: id });
  return peer;
};
const service = new SocketService();
const owner = socket(service, "owner");
const peer = socket(service, "peer");
assert(peer.sent.some((message) => message.type === "identity-accepted"));
assert(owner.sent.some((message) => message.type === "user-joined"));
assert(!peer.sent.some((message) => (message as { type: string }).type === "file-offer-snapshot"));
service.handleMessage(owner as unknown as ExtendedWebSocket, {
  type: "offer", roomId: "room", fromUserId: "owner", fromUserName: "owner", toUserId: "peer", offer: { type: "offer", sdp: "test" },
});
assert(peer.sent.some((message) => message.type === "offer"));
service.handleMessage(owner as unknown as ExtendedWebSocket, { type: "publish-file-offer" } as unknown as WebSocketMessage);
assert(owner.sent.some((message) => message.type === "error" && message.message === "Unsupported message type"));
const proof = (owner.sent.find((message) => message.type === "identity-accepted") as { identityToken: string }).identityToken;
service.cleanupSocket(owner as unknown as ExtendedWebSocket);
assert(peer.sent.some((message) => message.type === "user-left"));
const impostor = socket(service, "owner");
assert(impostor.sent.some((message) => message.type === "error"));
const returning = new FakeSocket();
service.handleMessage(returning as unknown as ExtendedWebSocket, { type: "join-room", roomId: "room", userId: "owner", userName: "owner", identityToken: proof });
assert(returning.sent.some((message) => message.type === "identity-accepted"));
service.cleanupSocket(returning as unknown as ExtendedWebSocket);
service.cleanupSocket(peer as unknown as ExtendedWebSocket);
console.log("PASS signaling, cleanup and identity proof");
