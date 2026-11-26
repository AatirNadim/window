// @vitest-environment jsdom

import { describe, expect, it } from "vitest"
import {
  isBrowserReservedShortcut,
  isEditableElement,
  KEYBINDING_RECORDS,
} from "./keybindings"
import { matchesShortcut } from "@/hooks/useKeybindings"

describe("Keybinding registry and safety guarantees", () => {
  it("contains complete keybinding records for every screen in the app", () => {
    expect(KEYBINDING_RECORDS.length).toBeGreaterThan(10)

    const scopes = new Set(KEYBINDING_RECORDS.map((r) => r.scope))
    expect(scopes.has("global")).toBe(true)
    expect(scopes.has("home")).toBe(true)
    expect(scopes.has("room")).toBe(true)

    // Ensure every single record guarantees browser safety and has rationales
    for (const record of KEYBINDING_RECORDS) {
      expect(record.browserConflictSafe).toBe(true)
      expect(record.safetyRationale).toBeTruthy()
      expect(record.title).toBeTruthy()
      expect(record.description).toBeTruthy()
      expect(record.combos.length).toBeGreaterThan(0)
    }
  })

  describe("Browser Conflict Prevention (isBrowserReservedShortcut)", () => {
    const makeKeyEvent = (key: string, options: Partial<KeyboardEvent> = {}) => {
      return {
        key,
        ctrlKey: options.ctrlKey ?? false,
        metaKey: options.metaKey ?? false,
        altKey: options.altKey ?? false,
        shiftKey: options.shiftKey ?? false,
      } as KeyboardEvent
    }

    it("identifies Ctrl/Cmd tab management and window shortcuts as reserved", () => {
      expect(isBrowserReservedShortcut(makeKeyEvent("t", { ctrlKey: true }))).toBe(true) // New tab
      expect(isBrowserReservedShortcut(makeKeyEvent("w", { ctrlKey: true }))).toBe(true) // Close tab
      expect(isBrowserReservedShortcut(makeKeyEvent("n", { ctrlKey: true }))).toBe(true) // New window
      expect(isBrowserReservedShortcut(makeKeyEvent("w", { metaKey: true }))).toBe(true) // Cmd+W on Mac
    })

    it("identifies browser page reload, find, print, and save as reserved", () => {
      expect(isBrowserReservedShortcut(makeKeyEvent("r", { ctrlKey: true }))).toBe(true) // Reload
      expect(isBrowserReservedShortcut(makeKeyEvent("f", { ctrlKey: true }))).toBe(true) // Find
      expect(isBrowserReservedShortcut(makeKeyEvent("p", { ctrlKey: true }))).toBe(true) // Print
      expect(isBrowserReservedShortcut(makeKeyEvent("s", { ctrlKey: true }))).toBe(true) // Save
    })

    it("identifies function keys like F5 and F12 as reserved", () => {
      expect(isBrowserReservedShortcut(makeKeyEvent("F5"))).toBe(true)
      expect(isBrowserReservedShortcut(makeKeyEvent("F12"))).toBe(true)
      expect(isBrowserReservedShortcut(makeKeyEvent("F11"))).toBe(true)
    })

    it("identifies Alt + Arrow navigation keys as reserved", () => {
      expect(isBrowserReservedShortcut(makeKeyEvent("ArrowLeft", { altKey: true }))).toBe(true)
      expect(isBrowserReservedShortcut(makeKeyEvent("ArrowRight", { altKey: true }))).toBe(true)
    })

    it("allows our custom non-conflicting Alt shortcuts and single keys", () => {
      // Window app shortcuts should not be marked as browser reserved
      expect(isBrowserReservedShortcut(makeKeyEvent("c", { altKey: true }))).toBe(false)
      expect(isBrowserReservedShortcut(makeKeyEvent("s", { altKey: true }))).toBe(false)
      expect(isBrowserReservedShortcut(makeKeyEvent("u", { altKey: true }))).toBe(false)
      expect(isBrowserReservedShortcut(makeKeyEvent("r", { altKey: true }))).toBe(false)
      expect(isBrowserReservedShortcut(makeKeyEvent("i", { altKey: true }))).toBe(false)
      expect(isBrowserReservedShortcut(makeKeyEvent("p", { altKey: true }))).toBe(false)
      expect(isBrowserReservedShortcut(makeKeyEvent("o", { altKey: true }))).toBe(false)
      expect(isBrowserReservedShortcut(makeKeyEvent("h", { altKey: true }))).toBe(false)
      expect(isBrowserReservedShortcut(makeKeyEvent("t", { altKey: true }))).toBe(false)
      expect(isBrowserReservedShortcut(makeKeyEvent("?"))).toBe(false)
      expect(isBrowserReservedShortcut(makeKeyEvent("c"))).toBe(false)
      expect(isBrowserReservedShortcut(makeKeyEvent("s"))).toBe(false)
    })
  })

  describe("Input Isolation (isEditableElement)", () => {
    it("recognizes HTMLInputElement (text) as editable", () => {
      const input = document.createElement("input")
      input.type = "text"
      expect(isEditableElement(input)).toBe(true)
    })

    it("recognizes HTMLTextAreaElement and HTMLSelectElement as editable", () => {
      const textarea = document.createElement("textarea")
      expect(isEditableElement(textarea)).toBe(true)

      const select = document.createElement("select")
      expect(isEditableElement(select)).toBe(true)
    })

    it("does not treat buttons or divs as editable unless contentEditable", () => {
      const button = document.createElement("button")
      expect(isEditableElement(button)).toBe(false)

      const div = document.createElement("div")
      expect(isEditableElement(div)).toBe(false)

      div.contentEditable = "true"
      expect(isEditableElement(div)).toBe(true)
    })
  })

  describe("Shortcut pattern matching (matchesShortcut)", () => {
    it("matches single letter keys", () => {
      const event = new KeyboardEvent("keydown", { key: "c" })
      expect(matchesShortcut(event, "c")).toBe(true)
      expect(matchesShortcut(event, "s")).toBe(false)
    })

    it("matches Alt combinations", () => {
      const event = new KeyboardEvent("keydown", { key: "c", altKey: true })
      expect(matchesShortcut(event, "Alt+C")).toBe(true)
      expect(matchesShortcut(event, "c")).toBe(false)
    })

    it("matches question mark (?) for cheat sheet", () => {
      const event = new KeyboardEvent("keydown", { key: "?" })
      expect(matchesShortcut(event, "?")).toBe(true)
    })

    it("matches Escape and Enter", () => {
      const escEvent = new KeyboardEvent("keydown", { key: "Escape" })
      expect(matchesShortcut(escEvent, "Escape")).toBe(true)

      const enterEvent = new KeyboardEvent("keydown", { key: "Enter" })
      expect(matchesShortcut(enterEvent, "Enter")).toBe(true)
    })
  })
})
