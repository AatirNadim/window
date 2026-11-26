import React, { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  Check,
  ClipboardPaste,
  FileUp,
  Plus,
  Radio,
  ShieldCheck,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Kbd } from "@/components/keybindings/Kbd"

type HeroSectionProps = {
  roomId: string | null
  roomIdError: string
  setRoomId: (id: string) => void
  handleCreateRoom: () => void
  handleJoinRoom: () => void
  inputRef?: React.RefObject<HTMLInputElement | null>
  onPasteRoomId?: () => Promise<void> | void
}

const proofPoints = [
  {
    icon: Radio,
    title: "Direct browser transfer",
    detail: "Files travel between browsers without being stored in the cloud.",
    tone: "mint",
  },
  {
    icon: ShieldCheck,
    title: "Private and temporary",
    detail: "Transfers are encrypted, and rooms are temporary.",
    tone: "pink",
  },
  {
    icon: FileUp,
    title: "Clear file limits",
    detail: "Send up to 5 files: 50 MB for one file, or 6 MB per file in a batch.",
    tone: "mint",
  },
]

export default function HeroSection({
  roomId,
  roomIdError,
  setRoomId,
  handleCreateRoom,
  handleJoinRoom,
  inputRef,
  onPasteRoomId,
}: HeroSectionProps) {
  const reducedMotion = useReducedMotion()
  const [isPasting, setIsPasting] = useState(false)

  const handlePasteClick = async () => {
    if (!onPasteRoomId) {
      inputRef?.current?.focus()
      return
    }
    setIsPasting(true)
    try {
      await onPasteRoomId()
    } finally {
      setIsPasting(false)
    }
  }

  return (
    <section className="relative mx-auto grid w-full max-w-6xl gap-x-16 gap-y-8 py-8 sm:py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:py-20">
      {/* Left Column: Vision & Value Proposition */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.25 }}
        className="min-w-0 lg:col-start-1 lg:row-start-1"
      >
        {/* Headline */}
        <h1 className="max-w-[16ch] text-balance text-[clamp(2.125rem,5.5vw,3.75rem)] font-bold leading-[1.05] tracking-[-0.03em] text-foreground">
          Send files directly, without the upload step.
        </h1>

        {/* Crisp Editorial Lede */}
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Share files directly between browsers. Create a room, invite someone, and transfer files
          without uploading them to cloud storage.
        </p>
      </motion.div>

      {/* Right Column: Tactile Room Console Card */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.25, delay: reducedMotion ? 0 : 0.08 }}
        className="w-full min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center lg:justify-self-end"
      >
        <Card className="w-full gap-0 py-0 rounded-2xl border-border bg-card shadow-sm transition-all lg:max-w-[28rem]">
          {/* Card Console Header */}
          <CardHeader className="flex flex-col items-stretch gap-1.5 border-b border-border/80 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
                Quick Connect
              </span>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Create or join a room
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed text-muted-foreground">
              Create a room to share files, or join one using its room ID.
            </CardDescription>
          </CardHeader>

          {/* Card Body */}
          <CardContent className="space-y-5 p-5 sm:p-6">
            {/* Primary Action: Create Room */}
            <div className="space-y-2">
              <Button
                onClick={handleCreateRoom}
                className="group h-12 w-full justify-between rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground shadow-xs transition-all hover:opacity-95 active:scale-[0.99]"
              >
                <span className="flex items-center gap-2">
                  <Plus size={18} className="transition-transform group-hover:rotate-90" />
                  <span>Create instant room</span>
                </span>
                <Kbd variant="primary" size="sm">
                  C
                </Kbd>
              </Button>
              <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                Share the room link with the people you want to connect with.
              </p>
            </div>

            {/* Divider */}
            <div
              className="flex items-center gap-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
              aria-hidden="true"
            >
              <span className="h-px flex-1 bg-border" />
              <span>OR JOIN EXISTING ROOM</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            {/* Join Room Form */}
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                handleJoinRoom()
              }}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="room-id" className="text-xs font-semibold text-foreground">
                    Room ID
                  </label>
                  <div className="flex items-center gap-2.5">
                    <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:inline-flex">
                      Focus <Kbd size="sm">/</Kbd>
                    </span>
                    <button
                      type="button"
                      onClick={handlePasteClick}
                      disabled={isPasting}
                      className="-mr-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <ClipboardPaste size={12} />
                      <span>Paste</span>
                      <Kbd size="sm" className="hidden sm:inline-flex">
                        V
                      </Kbd>
                    </button>
                  </div>
                </div>
                <Input
                  ref={inputRef}
                  id="room-id"
                  type="text"
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={roomId || ""}
                  onChange={(event) => setRoomId(event.target.value)}
                  aria-invalid={!!roomIdError}
                  aria-describedby={roomIdError ? "room-id-error" : undefined}
                  autoComplete="off"
                  spellCheck="false"
                  className="h-11 rounded-lg border-border bg-background/80 font-mono text-base tracking-tight placeholder:font-sans placeholder:tracking-normal focus-visible:ring-primary sm:text-sm"
                />
                {roomIdError && (
                  <p id="room-id-error" role="alert" className="text-sm text-destructive">{roomIdError}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="secondary"
                className="group h-11 w-full justify-between rounded-lg border border-border/80 bg-secondary px-4 text-sm font-semibold text-secondary-foreground shadow-2xs hover:bg-secondary/80"
              >
                <span className="flex items-center gap-2">
                  <span>Join room</span>
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
                <Kbd size="sm">Enter</Kbd>
              </Button>
            </form>

            {/* Safety Notice / Peer note */}
            <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground">
              Both people need to keep Window open during the transfer. Files move directly between
              their browsers.
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
        {/* Proof Points */}
        <ul className="grid gap-4" aria-label="Key features of Window">
          {proofPoints.map(({ icon: Icon, title, detail, tone }) => (
            <li
              key={title}
              className="flex items-start gap-3.5"
            >
              <span
                className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${
                  tone === "pink"
                    ? "bg-pink-accent/20 text-foreground"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                <Icon size={17} strokeWidth={2} />
              </span>
              <div>
                <strong className="block text-sm font-semibold tracking-tight text-foreground">
                  {title}
                </strong>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {detail}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* Trust Badges */}
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Check size={15} className="text-success" /> No registration required
          </span>
          <span className="hidden text-border sm:inline">•</span>
          <span className="flex items-center gap-1.5">
            <Check size={15} className="text-success" /> Ephemeral tab session
          </span>
          <span className="hidden text-border sm:inline">•</span>
          <span className="flex items-center gap-1.5">
            <Check size={15} className="text-success" /> DTLS 1.2/1.3 encrypted
          </span>
        </div>
      </div>
    </section>
  )
}
