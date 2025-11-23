import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { v4 as uuidv4 } from "uuid"

interface UserState {
  userId: string | null
  userName: string | null

  roomId: string | null

  remoteUsers: Record<string, string>
}

interface UserAction {
  setUserId: () => void
  initializeUser: () => void
  joinRoom: (roomId: string) => void
  leaveRoom: () => void
  clearUser: () => void
  addRemoteUser: (userId: string, userName: string) => void
  removeRemoteUser: (userId: string) => void
  clearRemoteUsers: () => void
  setRoomId: (roomId: string | null) => void
}

export type { UserState }

const generateRandomUsername = (): string => {
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
      userName: null,
      currentRoomId: null,
      remoteUsers: {},
      roomId: null,

      setUserId: () => {
        set({ userId: uuidv4() })
      },

      initializeUser: () => {
        const state = get()

        // Only generate new user if doesn't exist
        if (!state.userId || !state.userName) {
          console.log("user details not found, generating new user...")

          set({
            userId: uuidv4(),
            userName: generateRandomUsername(),
          })
        }
      },

      joinRoom: () => {
        const state = get()

        // Initialize user if not already done
        if (!state.userId || !state.userName) {
          set({
            userId: uuidv4(),
            userName: generateRandomUsername(),
          })
        }
      },

      leaveRoom: () => {
        set({
          userId: null,
          roomId: null,
          remoteUsers: {},
        })
      },

      clearUser: () => {
        set({
          userId: null,
          userName: null,
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
      // persist the username, userId and roomId only
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        userName: state.userName,
      }),
    },
  ),
)
