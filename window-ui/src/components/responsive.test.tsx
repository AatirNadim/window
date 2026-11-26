// @vitest-environment jsdom

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar"
import LimitsMatrix from "@/components/landing/limitsMatrix"
import LandingNavbar from "@/components/landing/landingNavbar"
import { ThemeProvider } from "@/components/theme-provider"

function mockMatchMedia(matches = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe("Responsive layout behavior", () => {
  beforeEach(() => {
    mockMatchMedia(false)
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ""
  })

  it("applies wrapperClassName to Sidebar outer wrapper to prevent phantom tablet gap", () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar
          side="left"
          wrapperClassName="hidden lg:block"
          className="hidden lg:flex"
        >
          <div>Peers</div>
        </Sidebar>
      </SidebarProvider>,
    )

    const outerSidebar = container.querySelector('[data-slot="sidebar"]')
    expect(outerSidebar).not.toBeNull()
    expect(outerSidebar?.className).toContain("lg:block")
  })

  it("renders both mobile comparison cards and desktop comparison table in LimitsMatrix", () => {
    const { container } = render(<LimitsMatrix />)

    const mobileCards = container.querySelector(".md\\:hidden")
    const desktopTableWrapper = container.querySelector(".md\\:block")
    expect(mobileCards).not.toBeNull()
    expect(desktopTableWrapper).not.toBeNull()
    expect(desktopTableWrapper?.querySelector("table")).not.toBeNull()
  })

  it("prevents lg navbar crowding and provides scrollable mobile menu", () => {
    render(
      <ThemeProvider>
        <LandingNavbar />
      </ThemeProvider>,
    )

    const statusBadge = screen.getByText("WebRTC Direct Transfer").closest("div")
    expect(statusBadge?.className).toContain("md:flex")
    expect(statusBadge?.className).toContain("lg:hidden")
    expect(statusBadge?.className).toContain("xl:flex")

    const menuButton = screen.getByRole("button", {
      name: "Toggle Navigation Menu",
    })
    fireEvent.click(menuButton)

    const mobileNav = screen.getByRole("navigation", {
      name: "Mobile Navigation",
    })
    const dropdown = mobileNav.parentElement
    expect(dropdown?.className).toContain("max-h-[calc(100dvh-4rem)]")
    expect(dropdown?.className).toContain("overflow-y-auto")
  })
})
