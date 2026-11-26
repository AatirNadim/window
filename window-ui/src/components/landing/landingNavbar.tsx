import { useEffect, useState } from "react"
import { Github, Menu, X, ArrowUpRight } from "lucide-react"
import { LogoMark } from "./LogoMark"
import { ThemeToggle } from "@/components/theme-toggle"
import { KeyboardShortcutsButton } from "@/components/keybindings/KeyboardShortcutsButton"

const NAV_LINKS = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "Push vs Pull", href: "#modes" },
  { label: "Architecture", href: "#architecture" },
  { label: "Specs", href: "#specs" },
  { label: "FAQ", href: "#faq" },
]

export default function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!mobileMenuOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mobileMenuOpen])

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    const target = document.querySelector(href)
    if (target) {
      target.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        {/* Brand Mark */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: "smooth" })
          }}
          className="group flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-90"
          aria-label="Window - Back to top"
        >
          <LogoMark className="size-9 shadow-xs transition-transform group-hover:scale-105" />
          <span className="relative inline-block pb-1 text-2xl font-bold tracking-[-0.04em]">
            win<span className="text-primary">dow</span>
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-1 w-7 rounded-full bg-pink-accent transition-all duration-300 group-hover:w-full"
            />
          </span>
        </a>

        {/* Live Protocol Status Badge (Tablet) */}
        <div className="hidden items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-2xs md:flex lg:hidden">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          <span className="text-foreground">WebRTC Direct Transfer</span>
          <span className="text-border">•</span>
          <span>Zero Cloud Storage</span>
        </div>

        {/* Desktop Navigation Links & Actions */}
        <div className="hidden items-center gap-5 xl:gap-6 lg:flex">
          <nav className="flex items-center gap-4 xl:gap-5 text-sm font-medium" aria-label="Main Navigation">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="h-4 w-px bg-border" aria-hidden="true" />

          <div className="flex items-center gap-2">
            <KeyboardShortcutsButton />
            <a
              href="https://github.com/AatirNadim/window"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="GitHub Repository"
              className="grid size-11 place-items-center rounded-lg border border-border bg-card text-foreground transition-all hover:bg-secondary hover:text-foreground"
              title="View source on GitHub"
            >
              <Github size={18} />
            </a>
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Actions & Menu Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <KeyboardShortcutsButton />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="grid size-11 place-items-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-card px-4 py-4 shadow-lg sm:px-6 lg:hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span>WebRTC Direct • Zero Cloud Storage</span>
          </div>

          <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                {link.label}
              </a>
            ))}
            <div className="my-2 h-px bg-border" />
            <a
              href="https://github.com/AatirNadim/window"
              target="_blank"
              rel="noreferrer noopener"
              className="flex min-h-11 items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
            >
              <span className="flex items-center gap-2">
                <Github size={16} /> GitHub Repository
              </span>
              <ArrowUpRight size={14} className="text-muted-foreground" />
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
