import { describe, expect, it } from "vitest"
import { useKeybindingStore } from "./keybindingStore"

describe("Keybinding Zustand Store", () => {
  it("toggles, opens, and closes cheat sheet dialog", () => {
    const { openCheatSheet, closeCheatSheet, toggleCheatSheet } =
      useKeybindingStore.getState()

    openCheatSheet()
    expect(useKeybindingStore.getState().isCheatSheetOpen).toBe(true)

    closeCheatSheet()
    expect(useKeybindingStore.getState().isCheatSheetOpen).toBe(false)

    toggleCheatSheet()
    expect(useKeybindingStore.getState().isCheatSheetOpen).toBe(true)

    toggleCheatSheet()
    expect(useKeybindingStore.getState().isCheatSheetOpen).toBe(false)
  })

  it("updates search query and category filters", () => {
    const { setSearchQuery, setSelectedCategory } =
      useKeybindingStore.getState()

    setSearchQuery("send files")
    expect(useKeybindingStore.getState().searchQuery).toBe("send files")

    setSelectedCategory("Room Screen")
    expect(useKeybindingStore.getState().selectedCategory).toBe("Room Screen")

    // Reset
    setSearchQuery("")
    setSelectedCategory("All")
    expect(useKeybindingStore.getState().searchQuery).toBe("")
    expect(useKeybindingStore.getState().selectedCategory).toBe("All")
  })
})
