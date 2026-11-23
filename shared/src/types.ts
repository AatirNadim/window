// Shared types between client and server

// WebRTC type definitions
interface RTCSessionDescriptionInit {
  type: "offer" | "answer" | "pranswer" | "rollback";
  sdp: string;
}

interface RTCIceCandidateInit {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface User {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  users: Array<User>;
}

// WebSocket message types
export type WebSocketMessage =
  | JoinRoomMessage
  | LeaveRoomMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | UserJoinedMessage
  | UserLeftMessage
  | ErrorMessage
  | RoomFullMessage
  | PublishFileOfferMessage
  | FileOfferSnapshotMessage
  | FileOfferAddedMessage
  | RevokeFileOfferMessage
  | FileOfferRemovedMessage
  | RequestFilePullMessage
  | FilePullRequestMessage
  | FilePullRejectedMessage
  | FilePullDecisionMessage
  | FinishFilePullMessage
  | IdentityAcceptedMessage
  | CancelFilePullMessage
  | FilePullCancelledMessage
  | FilePullFinishedMessage;

// Pull-sharing offers contain metadata only. File bytes stay on peer data channels.
export interface SharedFileOffer {
  offerId: string;
  roomId: string;
  ownerId: string;
  ownerName: string;
  name: string;
  type: string;
  size: number;
  createdAt: number;
  expiresAt: number;
  visibility: "room" | "selected";
  recipientIds: string[];
}

export interface PublishFileOfferMessage {
  type: "publish-file-offer";
  roomId: string;
  offer: SharedFileOffer;
}
export interface FileOfferSnapshotMessage {
  type: "file-offer-snapshot";
  offers: SharedFileOffer[];
}
export interface FileOfferAddedMessage {
  type: "file-offer-added";
  offer: SharedFileOffer;
}
export interface RevokeFileOfferMessage {
  type: "revoke-file-offer";
  offerId: string;
}
export interface FileOfferRemovedMessage {
  type: "file-offer-removed";
  offerId: string;
  ownerId: string;
  reason: "revoked" | "expired" | "owner-left";
}
export interface RequestFilePullMessage {
  type: "request-file-pull";
  offerId: string;
  requestId: string;
}
export interface FilePullRequestMessage {
  type: "file-pull-request";
  offerId: string;
  requestId: string;
  requesterId: string;
  requesterName: string;
}
export interface FilePullRejectedMessage {
  type: "file-pull-rejected";
  offerId: string;
  requestId: string;
  reason: string;
}
export interface FilePullDecisionMessage {
  type: "file-pull-decision";
  offerId: string;
  requestId: string;
  requesterId: string;
  accepted: boolean;
  reason?: string;
}
export interface FinishFilePullMessage {
  type: "finish-file-pull";
  offerId: string;
  requestId: string;
  bytes: number;
  chunks: number;
}

export interface IdentityAcceptedMessage {
  type: "identity-accepted";
  userId: string;
  identityToken: string;
}
export interface CancelFilePullMessage {
  type: "cancel-file-pull";
  offerId: string;
  requestId: string;
}
export interface FilePullCancelledMessage {
  type: "file-pull-cancelled";
  offerId: string;
  requestId: string;
  requesterId: string;
}
export interface FilePullFinishedMessage {
  type: "file-pull-finished";
  offerId: string;
  requestId: string;
  requesterId: string;
  bytes: number;
  chunks: number;
}

export interface JoinRoomMessage {
  type: "join-room";
  roomId: string;
  userId: string;
  userName: string;
  identityToken?: string;
}

export interface LeaveRoomMessage {
  type: "leave-room";
  roomId: string;
  userId: string;
}

export interface OfferMessage {
  type: "offer";
  roomId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  offer: RTCSessionDescriptionInit;
}

export interface AnswerMessage {
  type: "answer";
  roomId: string;
  fromUserId: string;
  toUserId: string;
  answer: RTCSessionDescriptionInit;
}

export interface IceCandidateMessage {
  type: "ice-candidate";
  roomId: string;
  fromUserId: string;
  toUserId: string;
  candidate: RTCIceCandidateInit;
}

export interface UserJoinedMessage {
  type: "user-joined";
  roomId: string;
  userId: string;
  userName: string;
}

export interface UserLeftMessage {
  type: "user-left";
  roomId: string;
  userId: string;
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export interface RoomFullMessage {
  type: "room-full";
  roomId: string;
}
