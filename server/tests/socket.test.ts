import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { SocketService } from "../utils/socket";
import type { SharedFileOffer, WebSocketMessage } from "@window/shared";
import type { ExtendedWebSocket } from "../utils/constants";

class FakeSocket {
  readyState = WebSocket.OPEN;
  userId?: string;
  userName?: string;
  roomId?: string;
  sent: WebSocketMessage[] = [];
  send(payload: string) {
    this.sent.push(JSON.parse(payload) as WebSocketMessage);
  }
  latest(type: string) {
    return [...this.sent].reverse().find((message) => message.type === type);
  }
}

const connect = (
  service: SocketService,
  userId: string,
  roomId = "room",
  userName = userId,
) => {
  const socket = new FakeSocket();
  service.handleMessage(socket as unknown as ExtendedWebSocket, {
    type: "join-room",
    roomId,
    userId,
    userName,
  });
  return socket;
};

const offer = (
  ownerId: string,
  roomId = "room",
  recipientIds: string[] = [],
): SharedFileOffer => {
  const createdAt = Date.now();
  return {
    offerId: `offer-${ownerId}`,
    roomId,
    ownerId,
    ownerName: ownerId,
    name: "report.pdf",
    type: "application/pdf",
    size: 1234,
    createdAt,
    expiresAt: createdAt + 60_000,
    visibility: recipientIds.length ? "selected" : "room",
    recipientIds,
  };
};

const cases: Array<[string, () => void]> = [];

cases.push([
  "selected offers are visible only to the owner and selected peers",
  () => {
    const service = new SocketService();
    const owner = connect(service, "owner");
    const recipient = connect(service, "recipient");
    const stranger = connect(service, "stranger");
    owner.sent = [];
    recipient.sent = [];
    stranger.sent = [];

    service.handleMessage(owner as unknown as ExtendedWebSocket, {
      type: "publish-file-offer",
      roomId: "room",
      offer: offer("owner", "room", ["recipient"]),
    });

    assert.equal(owner.latest("file-offer-added")?.type, "file-offer-added");
    assert.equal(
      recipient.latest("file-offer-added")?.type,
      "file-offer-added",
    );
    assert.equal(stranger.latest("file-offer-added"), undefined);
    service.cleanupSocket(owner as unknown as ExtendedWebSocket);
    service.cleanupSocket(recipient as unknown as ExtendedWebSocket);
    service.cleanupSocket(stranger as unknown as ExtendedWebSocket);
  },
]);

cases.push([
  "late joiners receive active room offers and exclude restricted offers",
  () => {
    const service = new SocketService();
    const owner = connect(service, "owner");
    const recipient = connect(service, "recipient");
    owner.sent = [];
    service.handleMessage(owner as unknown as ExtendedWebSocket, {
      type: "publish-file-offer",
      roomId: "room",
      offer: offer("owner"),
    });
    const latePeer = connect(service, "late-peer");
    assert.equal(
      (latePeer.latest("file-offer-snapshot") as { offers: SharedFileOffer[] })
        .offers.length,
      1,
    );
    service.handleMessage(owner as unknown as ExtendedWebSocket, {
      type: "publish-file-offer",
      roomId: "room",
      offer: {
        ...offer("owner"),
        offerId: "selected-offer",
        visibility: "selected",
        recipientIds: ["recipient"],
      },
    });
    const laterPeer = connect(service, "later-peer");
    assert.equal(
      (
        laterPeer.latest("file-offer-snapshot") as { offers: SharedFileOffer[] }
      ).offers.some((item) => item.offerId === "selected-offer"),
      false,
    );
    service.cleanupSocket(owner as unknown as ExtendedWebSocket);
    service.cleanupSocket(recipient as unknown as ExtendedWebSocket);
    service.cleanupSocket(latePeer as unknown as ExtendedWebSocket);
    service.cleanupSocket(laterPeer as unknown as ExtendedWebSocket);
  },
]);

cases.push([
  "expired offers are unavailable to pull requests",
  async () => {
    const service = new SocketService();
    const owner = connect(service, "owner");
    const peer = connect(service, "peer");
    const expiring = offer("owner");
    expiring.expiresAt = Date.now() + 30;
    service.handleMessage(owner as unknown as ExtendedWebSocket, {
      type: "publish-file-offer",
      roomId: "room",
      offer: expiring,
    });
    await new Promise((resolve) => setTimeout(resolve, 40));
    service.handleMessage(peer as unknown as ExtendedWebSocket, {
      type: "request-file-pull",
      offerId: expiring.offerId,
      requestId: "expired-request",
    });
    assert.equal(peer.latest("error")?.type, "error");
    service.cleanupSocket(owner as unknown as ExtendedWebSocket);
    service.cleanupSocket(peer as unknown as ExtendedWebSocket);
  },
]);

cases.push([
  "server authorizes pull requests and routes them to the owner",
  () => {
    const service = new SocketService();
    const owner = connect(service, "owner");
    const recipient = connect(service, "recipient");
    const stranger = connect(service, "stranger");
    owner.sent = [];
    recipient.sent = [];
    stranger.sent = [];
    service.handleMessage(owner as unknown as ExtendedWebSocket, {
      type: "publish-file-offer",
      roomId: "room",
      offer: offer("owner", "room", ["recipient"]),
    });
    owner.sent = [];
    recipient.sent = [];
    stranger.sent = [];

    service.handleMessage(stranger as unknown as ExtendedWebSocket, {
      type: "request-file-pull",
      offerId: "offer-owner",
      requestId: "denied",
    });
    service.handleMessage(recipient as unknown as ExtendedWebSocket, {
      type: "request-file-pull",
      offerId: "offer-owner",
      requestId: "request-1",
    });

    assert.equal(stranger.latest("error")?.type, "error");
    assert.equal(owner.latest("file-pull-request")?.type, "file-pull-request");
    assert.equal(
      owner.latest("file-pull-request") &&
        (owner.latest("file-pull-request") as { requestId: string }).requestId,
      "request-1",
    );
    service.cleanupSocket(owner as unknown as ExtendedWebSocket);
    service.cleanupSocket(recipient as unknown as ExtendedWebSocket);
    service.cleanupSocket(stranger as unknown as ExtendedWebSocket);
  },
]);

cases.push([
  "owner disconnect revokes offers and notifies authorized peers",
  () => {
    const service = new SocketService();
    const owner = connect(service, "owner");
    const peer = connect(service, "peer");
    owner.sent = [];
    peer.sent = [];
    service.handleMessage(owner as unknown as ExtendedWebSocket, {
      type: "publish-file-offer",
      roomId: "room",
      offer: offer("owner"),
    });
    owner.sent = [];
    peer.sent = [];

    service.cleanupSocket(owner as unknown as ExtendedWebSocket);

    assert.equal(peer.latest("file-offer-removed")?.type, "file-offer-removed");
    assert.equal(peer.latest("user-left")?.type, "user-left");
    service.cleanupSocket(peer as unknown as ExtendedWebSocket);
  },
]);

cases.push([
  "a disconnected identity cannot be reclaimed without its server-issued proof",
  () => {
    const service = new SocketService();
    const owner = connect(service, "known-peer");
    const proof = (
      owner.latest("identity-accepted") as { identityToken: string }
    ).identityToken;
    service.cleanupSocket(owner as unknown as ExtendedWebSocket);

    const attacker = new FakeSocket();
    service.handleMessage(attacker as unknown as ExtendedWebSocket, {
      type: "join-room",
      roomId: "room",
      userId: "known-peer",
      userName: "Impostor",
    });
    assert.equal(attacker.latest("error")?.type, "error");

    const returningPeer = new FakeSocket();
    service.handleMessage(returningPeer as unknown as ExtendedWebSocket, {
      type: "join-room",
      roomId: "room",
      userId: "known-peer",
      userName: "Known peer",
      identityToken: proof,
    });
    assert.equal(
      returningPeer.latest("identity-accepted")?.type,
      "identity-accepted",
    );
    service.cleanupSocket(returningPeer as unknown as ExtendedWebSocket);
  },
]);

cases.push([
  "cancellation is routed and successful pull acknowledgements reach the sender",
  () => {
    const service = new SocketService();
    const owner = connect(service, "owner");
    const peer = connect(service, "peer");
    service.handleMessage(owner as unknown as ExtendedWebSocket, {
      type: "publish-file-offer",
      roomId: "room",
      offer: offer("owner"),
    });

    service.handleMessage(peer as unknown as ExtendedWebSocket, {
      type: "request-file-pull",
      offerId: "offer-owner",
      requestId: "cancel-me",
    });
    service.handleMessage(owner as unknown as ExtendedWebSocket, {
      type: "file-pull-decision",
      offerId: "offer-owner",
      requestId: "cancel-me",
      requesterId: "peer",
      accepted: true,
    });
    service.handleMessage(peer as unknown as ExtendedWebSocket, {
      type: "cancel-file-pull",
      offerId: "offer-owner",
      requestId: "cancel-me",
    });
    assert.equal(owner.latest("file-pull-cancelled")?.type, "file-pull-cancelled");

    service.handleMessage(peer as unknown as ExtendedWebSocket, {
      type: "request-file-pull",
      offerId: "offer-owner",
      requestId: "finish-me",
    });
    service.handleMessage(owner as unknown as ExtendedWebSocket, {
      type: "file-pull-decision",
      offerId: "offer-owner",
      requestId: "finish-me",
      requesterId: "peer",
      accepted: true,
    });
    service.handleMessage(peer as unknown as ExtendedWebSocket, {
      type: "finish-file-pull",
      offerId: "offer-owner",
      requestId: "finish-me",
      bytes: 1234,
      chunks: 1,
    });
    assert.equal(owner.latest("file-pull-finished")?.type, "file-pull-finished");
    service.cleanupSocket(owner as unknown as ExtendedWebSocket);
    service.cleanupSocket(peer as unknown as ExtendedWebSocket);
  },
]);

for (const [name, run] of cases) {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}
