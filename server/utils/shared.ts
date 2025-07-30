// Shared types between client and server

// WebRTC type definitions
interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
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
  name?: string;
}

export interface Room {
  id: string;
  users: User[];
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
  | ErrorMessage;

export interface JoinRoomMessage {
  type: "join-room";
  roomId: string;
  userId: string;
  userName?: string;
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
