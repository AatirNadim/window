import { WebSocket } from "ws";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type {
  AnswerMessage,
  FileOfferRemovedMessage,
  FilePullCancelledMessage,
  FilePullDecisionMessage,
  FilePullFinishedMessage,
  FinishFilePullMessage,
  CancelFilePullMessage,
  FilePullRejectedMessage,
  FilePullRequestMessage,
  IceCandidateMessage,
  JoinRoomMessage,
  LeaveRoomMessage,
  OfferMessage,
  PublishFileOfferMessage,
  RequestFilePullMessage,
  RevokeFileOfferMessage,
  Room,
  SharedFileOffer,
  User,
  UserJoinedMessage,
  UserLeftMessage,
  WebSocketMessage,
} from "@window/shared";
import { ExtendedWebSocket, MAX_USERS_PER_ROOM } from "./constants";

const MAX_OFFER_TTL_MS = 60 * 60 * 1000;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_ACTIVE_OFFERS_PER_USER = 20;
const MAX_ACTIVE_PULLS_PER_OWNER = 3;
const MAX_ADVERTISED_BYTES_PER_USER = 200 * 1024 * 1024;
const PULL_CHUNK_PAYLOAD_SIZE = 64 * 1024 - 36;
const MAX_KNOWN_IDENTITIES = 100_000;

export class SocketService {
  private rooms = new Map<string, Room>();
  private userSockets = new Map<string, ExtendedWebSocket>();
  private identityTokens = new Map<string, Buffer>();
  private offers = new Map<string, SharedFileOffer>();
  private activePulls = new Map<string, Set<string>>();
  private pendingPulls = new Map<
    string,
    {
      offerId: string;
      ownerId: string;
      requesterId: string;
      createdAt: number;
      accepted: boolean;
    }
  >();
  private expiryTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.expiryTimer = setInterval(() => this.expireOffers(), 1000);
    this.expiryTimer.unref?.();
  }

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
        case "publish-file-offer":
          this.publishOffer(ws, message);
          break;
        case "revoke-file-offer":
          this.revokeOffer(ws, message);
          break;
        case "request-file-pull":
          this.requestPull(ws, message);
          break;
        case "file-pull-decision":
          this.decidePull(ws, message);
          break;
        case "finish-file-pull":
          this.finishPull(ws, message);
          break;
        case "cancel-file-pull":
          this.cancelPull(ws, message);
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
    this.send(ws, {
      type: "file-offer-snapshot",
      offers: this.visibleOffers(message.roomId, message.userId),
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

  private publishOffer(
    ws: ExtendedWebSocket,
    message: PublishFileOfferMessage,
  ) {
    if (!this.isMember(ws) || message.roomId !== ws.roomId)
      throw new Error("You are not in this room");
    const offer = message.offer;
    const now = Date.now();
    if (
      !offer ||
      typeof offer.offerId !== "string" ||
      offer.offerId.length > 80 ||
      this.offers.has(offer.offerId)
    )
      throw new Error("Invalid or duplicate offer");
    if (
      offer.ownerId !== ws.userId ||
      offer.roomId !== ws.roomId ||
      offer.ownerName !== ws.userName
    )
      throw new Error("Offer owner does not match this connection");
    if (
      typeof offer.name !== "string" ||
      !offer.name.trim() ||
      offer.name.length > 255 ||
      typeof offer.type !== "string" ||
      offer.type.length > 160
    )
      throw new Error("Invalid file metadata");
    if (
      !Number.isSafeInteger(offer.size) ||
      offer.size < 0 ||
      offer.size > MAX_FILE_SIZE
    )
      throw new Error("File exceeds the 50 MB offer limit");
    if (
      !Number.isFinite(offer.createdAt) ||
      Math.abs(offer.createdAt - now) > 30_000 ||
      !Number.isFinite(offer.expiresAt) ||
      offer.expiresAt <= now ||
      offer.expiresAt > now + MAX_OFFER_TTL_MS
    )
      throw new Error("Invalid offer expiry");
    if (offer.visibility !== "room" && offer.visibility !== "selected")
      throw new Error("Invalid audience");
    if (
      !Array.isArray(offer.recipientIds) ||
      offer.recipientIds.length > MAX_USERS_PER_ROOM ||
      new Set(offer.recipientIds).size !== offer.recipientIds.length
    )
      throw new Error("Invalid recipient list");
    const members = new Set(
      this.rooms.get(ws.roomId!)?.users.map((user) => user.id),
    );
    if (
      offer.visibility === "selected" &&
      (!offer.recipientIds.length ||
        offer.recipientIds.some((id) => id === ws.userId || !members.has(id)))
    )
      throw new Error("Selected recipients must be active peers in this room");
    if (offer.visibility === "room" && offer.recipientIds.length)
      throw new Error("Room offers cannot have a recipient list");
    const ownerOffers = [...this.offers.values()].filter(
      (item) => item.ownerId === ws.userId && item.roomId === ws.roomId,
    );
    if (ownerOffers.length >= MAX_ACTIVE_OFFERS_PER_USER)
      throw new Error("You have reached the 20 active offer limit");
    if (
      ownerOffers.reduce((total, item) => total + item.size, offer.size) >
      MAX_ADVERTISED_BYTES_PER_USER
    )
      throw new Error("Active offers cannot exceed 200 MB total");
    const stored = {
      ...offer,
      name: offer.name.trim(),
      recipientIds: [...offer.recipientIds],
    };
    this.offers.set(stored.offerId, stored);
    this.broadcastOffer(stored);
  }

  private revokeOffer(ws: ExtendedWebSocket, message: RevokeFileOfferMessage) {
    const offer = this.offers.get(message.offerId);
    if (
      !this.isMember(ws) ||
      !offer ||
      offer.ownerId !== ws.userId ||
      offer.roomId !== ws.roomId
    )
      throw new Error("Offer not found");
    this.removeOffer(offer, "revoked");
  }

  private requestPull(ws: ExtendedWebSocket, message: RequestFilePullMessage) {
    const offer = this.offers.get(message.offerId);
    if (
      !this.isMember(ws) ||
      !offer ||
      offer.roomId !== ws.roomId ||
      offer.expiresAt <= Date.now()
    )
      throw new Error("This offer has expired or is unavailable");
    if (
      offer.ownerId === ws.userId ||
      (offer.visibility === "selected" &&
        !offer.recipientIds.includes(ws.userId!))
    )
      throw new Error("You are not allowed to download this file");
    const owner = this.userSockets.get(offer.ownerId);
    if (!owner || owner.roomId !== ws.roomId)
      throw new Error("Sender is offline");
    if (
      typeof message.requestId !== "string" ||
      message.requestId.length > 80 ||
      this.pendingPulls.has(message.requestId)
    )
      throw new Error("Invalid or duplicate pull request");
    if (
      [...this.pendingPulls.values()].filter(
        (pending) => pending.ownerId === offer.ownerId,
      ).length >= 10
    )
      throw new Error("The sender has too many pending download requests");
    this.pendingPulls.set(message.requestId, {
      offerId: offer.offerId,
      ownerId: offer.ownerId,
      requesterId: ws.userId!,
      createdAt: Date.now(),
      accepted: false,
    });
    this.send(owner, {
      type: "file-pull-request",
      offerId: offer.offerId,
      requestId: message.requestId,
      requesterId: ws.userId!,
      requesterName: ws.userName ?? "Peer",
    });
  }

  private decidePull(ws: ExtendedWebSocket, message: FilePullDecisionMessage) {
    const offer = this.offers.get(message.offerId);
    const pending = this.pendingPulls.get(message.requestId);
    if (
      typeof message.accepted !== "boolean" ||
      typeof message.requesterId !== "string" ||
      typeof message.requestId !== "string" ||
      message.requestId.length > 80 ||
      !this.isMember(ws) ||
      !offer ||
      offer.ownerId !== ws.userId ||
      offer.expiresAt <= Date.now() ||
      !pending ||
      pending.offerId !== offer.offerId ||
      pending.ownerId !== ws.userId ||
      pending.requesterId !== message.requesterId
    )
      throw new Error("Offer is no longer available");
    const requester = this.userSockets.get(message.requesterId);
    if (
      !requester ||
      requester.roomId !== ws.roomId ||
      (offer.visibility === "selected" &&
        !offer.recipientIds.includes(message.requesterId))
    )
      throw new Error("Requester is no longer authorized");
    const pulls = this.activePulls.get(offer.ownerId) ?? new Set<string>();
    if (message.accepted && pulls.size >= MAX_ACTIVE_PULLS_PER_OWNER) {
      this.pendingPulls.delete(message.requestId);
      this.send(requester, {
        type: "file-pull-rejected",
        offerId: offer.offerId,
        requestId: message.requestId,
        reason: "Sender is busy. Try again shortly.",
      });
      return;
    }
    if (message.accepted) {
      pulls.add(message.requestId);
      pending.accepted = true;
      pending.createdAt = Date.now();
    } else {
      pulls.delete(message.requestId);
      this.pendingPulls.delete(message.requestId);
    }
    this.activePulls.set(offer.ownerId, pulls);
    this.send(requester, message);
  }

  private finishPull(ws: ExtendedWebSocket, message: FinishFilePullMessage) {
    const pending = this.pendingPulls.get(message.requestId);
    if (
      !this.isMember(ws) ||
      !pending ||
      pending.offerId !== message.offerId ||
      pending.requesterId !== ws.userId ||
      !pending.accepted
    )
      return;
    const offer = this.offers.get(pending.offerId);
    const expectedChunks = offer
      ? Math.ceil(offer.size / PULL_CHUNK_PAYLOAD_SIZE)
      : -1;
    if (
      !offer ||
      !Number.isSafeInteger(message.bytes) ||
      message.bytes !== offer.size ||
      !Number.isSafeInteger(message.chunks) ||
      message.chunks !== expectedChunks
    ) {
      this.activePulls.get(pending.ownerId)?.delete(message.requestId);
      this.pendingPulls.delete(message.requestId);
      this.send(this.userSockets.get(pending.requesterId), {
        type: "file-pull-rejected",
        offerId: pending.offerId,
        requestId: message.requestId,
        reason: "Transfer verification failed. Try again.",
      });
      return;
    }
    this.activePulls.get(pending.ownerId)?.delete(message.requestId);
    this.pendingPulls.delete(message.requestId);
    const finished: FilePullFinishedMessage = {
      type: "file-pull-finished",
      offerId: pending.offerId,
      requestId: message.requestId,
      requesterId: pending.requesterId,
      bytes: message.bytes,
      chunks: message.chunks,
    };
    this.send(this.userSockets.get(pending.ownerId), finished);
  }

  private cancelPull(ws: ExtendedWebSocket, message: CancelFilePullMessage) {
    const pending = this.pendingPulls.get(message.requestId);
    if (
      !this.isMember(ws) ||
      !pending ||
      pending.offerId !== message.offerId ||
      pending.requesterId !== ws.userId
    )
      return;
    this.activePulls.get(pending.ownerId)?.delete(message.requestId);
    this.pendingPulls.delete(message.requestId);
    const cancelled: FilePullCancelledMessage = {
      type: "file-pull-cancelled",
      offerId: pending.offerId,
      requestId: message.requestId,
      requesterId: pending.requesterId,
    };
    this.send(this.userSockets.get(pending.ownerId), cancelled);
  }

  private visibleOffers(roomId: string, userId: string) {
    this.expireOffers();
    return [...this.offers.values()].filter(
      (offer) =>
        offer.roomId === roomId &&
        (offer.visibility === "room" ||
          offer.ownerId === userId ||
          offer.recipientIds.includes(userId)),
    );
  }

  private broadcastOffer(offer: SharedFileOffer) {
    const room = this.rooms.get(offer.roomId);
    for (const peer of room?.users ?? []) {
      if (
        peer.id === offer.ownerId ||
        offer.visibility === "room" ||
        offer.recipientIds.includes(peer.id)
      )
        this.send(this.userSockets.get(peer.id), {
          type: "file-offer-added",
          offer,
        });
    }
  }

  private removeOffer(
    offer: SharedFileOffer,
    reason: FileOfferRemovedMessage["reason"],
  ) {
    this.offers.delete(offer.offerId);
    for (const [requestId, pending] of this.pendingPulls)
      if (pending.offerId === offer.offerId) {
        this.activePulls.get(pending.ownerId)?.delete(requestId);
        this.pendingPulls.delete(requestId);
      }
    const room = this.rooms.get(offer.roomId);
    const message: FileOfferRemovedMessage = {
      type: "file-offer-removed",
      offerId: offer.offerId,
      ownerId: offer.ownerId,
      reason,
    };
    for (const peer of room?.users ?? [])
      if (
        peer.id === offer.ownerId ||
        offer.visibility === "room" ||
        offer.recipientIds.includes(peer.id)
      )
        this.send(this.userSockets.get(peer.id), message);
  }

  private expireOffers() {
    const now = Date.now();
    for (const offer of this.offers.values())
      if (offer.expiresAt <= now) this.removeOffer(offer, "expired");
    for (const [requestId, pending] of this.pendingPulls)
      if (now - pending.createdAt > (pending.accepted ? 10 : 2) * 60 * 1000) {
        this.activePulls.get(pending.ownerId)?.delete(requestId);
        this.pendingPulls.delete(requestId);
        const requester = this.userSockets.get(pending.requesterId);
        this.send(requester, {
          type: "file-pull-rejected",
          offerId: pending.offerId,
          requestId,
          reason: pending.accepted
            ? "The transfer timed out. Try again."
            : "The request timed out. Try again.",
        });
      }
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
    for (const offer of [...this.offers.values()])
      if (offer.ownerId === userId && offer.roomId === roomId)
        this.removeOffer(offer, "owner-left");
    for (const [requestId, pending] of this.pendingPulls)
      if (pending.requesterId === userId) {
        this.activePulls.get(pending.ownerId)?.delete(requestId);
        this.pendingPulls.delete(requestId);
        this.send(this.userSockets.get(pending.ownerId), {
          type: "file-pull-cancelled",
          offerId: pending.offerId,
          requestId,
          requesterId: userId,
        });
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
