import { create } from "zustand"

export interface KeybindingState {
  isCheatSheetOpen: boolean
  searchQuery: string
  selectedCategory: string
  openCheatSheet: () => void
  closeCheatSheet: () => void
  toggleCheatSheet: () => void
  setSearchQuery: (query: string) => void
  setSelectedCategory: (category: string) => void
}

export const useKeybindingStore = create<KeybindingState>((set) => ({
  isCheatSheetOpen: false,
  searchQuery: "",
  selectedCategory: "All",
  openCheatSheet: () => set({ isCheatSheetOpen: true }),
  closeCheatSheet: () => set({ isCheatSheetOpen: false }),
  toggleCheatSheet: () =>
    set((state) => ({ isCheatSheetOpen: !state.isCheatSheetOpen })),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSelectedCategory: (category: string) => set({ selectedCategory: category }),
}))
