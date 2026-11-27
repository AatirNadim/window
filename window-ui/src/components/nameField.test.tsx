// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { NameField } from "./nameField"
import { useUserStore } from "@/store/userStore"

afterEach(() => { cleanup(); useUserStore.getState().clearUser() })

describe("room identity", () => {
  it("lets a user enter a name or generate one within the server limit", () => {
    const onChange = vi.fn()
    render(<NameField value="" onChange={onChange} error="Enter your name" />)
    const input = screen.getByLabelText("Your name") as HTMLInputElement
    expect(input.maxLength).toBe(64)
    expect(input.getAttribute("aria-invalid")).toBe("true")
    fireEvent.change(input, { target: { value: "Alex" } })
    expect(onChange).toHaveBeenCalledWith("Alex")
    fireEvent.click(screen.getByRole("button", { name: /randomize/i }))
    expect(onChange.mock.lastCall?.[0]).toMatch(/^[A-Za-z]+\d+$/)
  })

  it("confirms a name for one room and retains proof only for the same identity", () => {
    useUserStore.setState({ userId: "old", userName: "Alex", identityToken: "proof", confirmedRoomId: null })
    useUserStore.getState().initializeUser(" Alex ", "room-a")
    expect(useUserStore.getState()).toMatchObject({ userId: "old", userName: "Alex", identityToken: "proof", confirmedRoomId: "room-a" })
    useUserStore.getState().initializeUser("Sam", "room-b")
    expect(useUserStore.getState()).toMatchObject({ userName: "Sam", identityToken: null, confirmedRoomId: "room-b" })
    expect(useUserStore.getState().userId).not.toBe("old")
    useUserStore.getState().leaveRoom()
    expect(useUserStore.getState().confirmedRoomId).toBeNull()
  })
})
