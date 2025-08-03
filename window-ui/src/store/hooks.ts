import { useUserStore } from "./userStore"

// Convenience hooks for common user store operations
export const useUser = () => {
  const { userId, userName } = useUserStore()
  return { userId, userName }
}

export const useUserActions = () => {
  const { initializeUser, joinRoom, leaveRoom, clearUser, addRemoteUser } = useUserStore()
  return { initializeUser, joinRoom, leaveRoom, clearUser, addRemoteUser }
}

// Combined hook for when you need both state and actions
export const useUserManager = () => {
  const state = useUser()
  const actions = useUserActions()
  return { ...state, ...actions }
}
