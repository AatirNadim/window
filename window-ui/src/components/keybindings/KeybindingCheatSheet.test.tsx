// @vitest-environment jsdom

import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { KeybindingCheatSheet } from "./KeybindingCheatSheet"
import { useKeybindingStore } from "@/store/keybindingStore"

describe("KeybindingCheatSheet component", () => {
  beforeEach(() => {
    useKeybindingStore.getState().setSearchQuery("")
    useKeybindingStore.getState().setSelectedCategory("All")
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ""
    useKeybindingStore.getState().closeCheatSheet()
    useKeybindingStore.getState().setSearchQuery("")
    useKeybindingStore.getState().setSelectedCategory("All")
  })

  it("renders cheat sheet with all records when open", () => {
    useKeybindingStore.getState().openCheatSheet()

    render(<KeybindingCheatSheet />)

    expect(screen.getByText("Keyboard Shortcuts Cheat Sheet")).toBeDefined()
    expect(screen.getByText("Browser Safe")).toBeDefined()

    // Global
    expect(screen.getByText("Keyboard shortcuts cheat sheet")).toBeDefined()
    expect(screen.getByText("Toggle light / dark theme")).toBeDefined()

    // Home
    expect(screen.getByText("Create new room")).toBeDefined()
    expect(screen.getByText("Focus Room ID input")).toBeDefined()

    // Room
    expect(screen.getByText("Choose files to send")).toBeDefined()
    expect(screen.getByText("Send staged files")).toBeDefined()
    expect(screen.getByText("Copy Room ID")).toBeDefined()
    expect(screen.getByText("Copy invite link")).toBeDefined()
  })

  it("filters keybinding records using the search bar", () => {
    useKeybindingStore.getState().openCheatSheet()
    render(<KeybindingCheatSheet />)

    const searchInput = screen.getByPlaceholderText(/Search shortcuts/i)
    fireEvent.change(searchInput, { target: { value: "Copy Room ID" } })

    expect(screen.getByText("Copy Room ID")).toBeDefined()
    expect(screen.queryByText("Create new room")).toBeNull()
  })

  it("filters by category pills", () => {
    useKeybindingStore.getState().openCheatSheet()
    useKeybindingStore.getState().setSelectedCategory("Home Screen")

    render(<KeybindingCheatSheet />)

    expect(screen.getByText("Create new room")).toBeDefined()
    expect(screen.queryByText("Send staged files")).toBeNull()
  })
})
