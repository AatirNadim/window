import { LogoMark } from "./LogoMark"
import { ArrowRight, Github, Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LandingFooterProps {
  handleCreateRoom: () => void
}

const TECH_PILLS = [
  "React 19",
  "WebRTC DataChannel",
  "TanStack Router",
  "Vite",
  "Tailwind CSS v4",
  "Figtree Variable",
]

export default function LandingFooter({ handleCreateRoom }: LandingFooterProps) {
  return (
    <footer className="relative z-10 w-full border-t border-border">
      {/* Bottom CTA Card Container */}
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-8 lg:p-12 shadow-sm">
          {/* Architectural blueprint coordinate & concentric ring accent */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -bottom-16 size-80 select-none opacity-40 dark:opacity-20"
          >
            <svg viewBox="0 0 320 320" className="size-full fill-none stroke-primary" strokeWidth="1">
              <circle cx="160" cy="160" r="140" strokeDasharray="4 8" />
              <circle cx="160" cy="160" r="90" />
              <circle cx="160" cy="160" r="40" />
              <line x1="160" y1="0" x2="160" y2="320" strokeDasharray="2 6" />
              <line x1="0" y1="160" x2="320" y2="160" strokeDasharray="2 6" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 font-mono text-xs font-semibold tracking-widest text-primary">
                <Sparkles size={12} className="text-primary" />
                <span>START TRANSFERRING IN SECONDS</span>
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                Ready to send files directly?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Create a private room in one click. Share the room link with your peer. No signup, no
                cloud upload, and zero traces left behind.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                onClick={handleCreateRoom}
                className="group h-12 w-full justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-95 sm:w-auto"
              >
                <Plus size={18} className="transition-transform group-hover:rotate-90" />
                <span>Create instant room</span>
                <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-0.5" />
              </Button>

              <a
                href="https://github.com/AatirNadim/window"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary sm:w-auto"
              >
                <Github size={18} />
                <span>GitHub Source</span>
              </a>
            </div>
          </div>

          {/* Operational Status Pill */}
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/80 pt-6 font-mono text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success" />
              <span>Signaling Server: Online</span>
            </div>
            <span className="hidden text-border sm:inline">•</span>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success" />
              <span>STUN ICE Node: Active</span>
            </div>
            <span className="hidden text-border sm:inline">•</span>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success" />
              <span>Payload Durability: 0 Bytes</span>
            </div>
          </div>
        </div>

        {/* Detailed Footer Links & Credits */}
        <div className="mt-16 border-t border-border/80 pt-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            {/* Brand Mark and Mission */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2.5 text-foreground">
                <LogoMark className="size-9" />
                <span className="relative inline-block pb-1 text-xl font-bold tracking-[-0.04em]">
                  win<span className="text-primary">dow</span>
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 h-1 w-6 rounded-full bg-pink-accent"
                  />
                </span>
              </div>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                Direct browser-to-browser P2P file transfers over WebRTC DataChannels. Designed with
                restraint, privacy, and zero server storage.
              </p>
            </div>

            {/* Architecture Tech Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {TECH_PILLS.map((tech) => (
                <span
                  key={tech}
                  className="rounded-md border border-border/80 bg-card px-2.5 py-1 font-mono text-[11px] font-medium text-muted-foreground shadow-2xs"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Legal / Copyright Bar */}
          <div className="mt-8 flex flex-col gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Window. Released under MIT License.</p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/AatirNadim/window"
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-foreground hover:underline"
              >
                Source Code
              </a>
              <span>•</span>
              <a
                href="https://github.com/AatirNadim/window/issues"
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-foreground hover:underline"
              >
                Issue Tracker
              </a>
              <span>•</span>
              <span className="font-mono">v1.2.0</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
