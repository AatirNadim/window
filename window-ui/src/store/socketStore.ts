import { create } from "zustand"

interface SocketState {
  socketConn: WebSocket | null
  peerConnections: Record<string, RTCPeerConnection>

  setSocketConn: (socket: WebSocket | null) => void
  setPeerConnections: (connections: Record<string, RTCPeerConnection>) => void
}

export type { SocketState }

export const useSocketStore = create<SocketState>()((set) => ({
  socketConn: null,
  peerConnections: {},

  setSocketConn: (socket) => set({ socketConn: socket }),
  setPeerConnections: (connections) => set({ peerConnections: connections }),
}))
