import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { v4 as uuidv4 } from "uuid"

interface UserState {
  userId: string | null
  identityToken: string | null
  userName: string | null

  roomId: string | null
  confirmedRoomId: string | null

  remoteUsers: Record<string, string>
}

interface UserAction {
  setIdentityToken: (token: string) => void
  initializeUser: (name: string, roomId: string) => void
  leaveRoom: () => void
  clearUser: () => void
  addRemoteUser: (userId: string, userName: string) => void
  removeRemoteUser: (userId: string) => void
  clearRemoteUsers: () => void
  setRoomId: (roomId: string | null) => void
}

export type { UserState }

export const generateRandomUsername = (): string => {
  const adjectives = [
    "Swift",
    "Bright",
    "Cool",
    "Fast",
    "Smart",
    "Bold",
    "Calm",
    "Keen",
    "Quick",
    "Sharp",
    "Wise",
    "Brave",
    "Clear",
    "Fresh",
  ]
  const nouns = [
    "Fox",
    "Eagle",
    "Wolf",
    "Tiger",
    "Lion",
    "Bear",
    "Hawk",
    "Owl",
    "Shark",
    "Falcon",
    "Raven",
    "Phoenix",
    "Dragon",
    "Panther",
  ]

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const number = Math.floor(Math.random() * 1000)

  return `${adjective}${noun}${number}`
}

export const useUserStore = create<UserState & UserAction>()(
  persist(
    (set, get) => ({
      userId: null,
      identityToken: null,
      userName: null,
      currentRoomId: null,
      remoteUsers: {},
      roomId: null,
      confirmedRoomId: null,

      setIdentityToken: (identityToken) => set({ identityToken }),

      initializeUser: (name, roomId) => {
        const state = get()
        const userName = name.trim()
        const sameIdentity = state.userId && state.userName === userName
        set({ userId: sameIdentity ? state.userId : uuidv4(),
          identityToken: sameIdentity ? state.identityToken : null,
          userName, roomId, confirmedRoomId: roomId })
      },

      leaveRoom: () => {
        set({
          userId: null,
          identityToken: null,
          roomId: null,
          confirmedRoomId: null,
          remoteUsers: {},
        })
      },

      clearUser: () => {
        set({
          userId: null,
          identityToken: null,
          userName: null,
          confirmedRoomId: null,
        })
      },

      addRemoteUser: (userId: string, userName: string) => {
        console.debug("Adding remote user to the room:", userId, userName)
        set((state) => ({
          remoteUsers: {
            ...state.remoteUsers,
            [userId]: userName,
          },
        }))
      },

      removeRemoteUser: (userId: string) => {
        set((state) => {
          const next = { ...state.remoteUsers }
          delete next[userId]
          return { remoteUsers: next }
        })
      },

      clearRemoteUsers: () => {
        set({ remoteUsers: {} })
      },

      setRoomId: (roomId: string | null) => {
        set({ roomId })
      },
    }),
    {
      name: "window-user-storage",
      // Persist the anonymous identity proof only within this browser tab session.
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        userId: state.userId,
        userName: state.userName,
        identityToken: state.identityToken,
      }),
    },
  ),
)
