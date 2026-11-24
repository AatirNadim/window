import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  Check,
  ClipboardPaste,
  FileUp,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

type HeroSectionProps = {
  roomId: string | null
  setRoomId: (id: string) => void
  handleCreateRoom: () => void
  handleJoinRoom: () => void
}

const proofPoints = [
  {
    icon: Radio,
    title: "Direct WebRTC DataChannel",
    detail: "Byte streams flow directly between browser RAM buffers. No intermediary cloud buckets.",
    tone: "mint",
  },
  {
    icon: ShieldCheck,
    title: "Private & Ephemeral by Design",
    detail: "DTLS 1.2/1.3 encrypted. The signaling server sees only connection handshakes, never payloads.",
    tone: "pink",
  },
  {
    icon: FileUp,
    title: "Clear Architectural Limits",
    detail: "Up to 5 files; 50 MB single file or 6 MB per file in batch. Assembled entirely in memory.",
    tone: "mint",
  },
]

// Known sample UUID format for fast test drive
const SAMPLE_ROOM_ID = "e87b2190-3b4c-4e89-a9a2-9f37c56df920"

export default function HeroSection({
  roomId,
  setRoomId,
  handleCreateRoom,
  handleJoinRoom,
}: HeroSectionProps) {
  const reducedMotion = useReducedMotion()
  const [isPasting, setIsPasting] = useState(false)

  const handlePasteClipboard = async () => {
    setIsPasting(true)
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText()
        if (text?.trim()) {
          setRoomId(text.trim())
          toast.success("Pasted from clipboard")
          return
        }
      }
      setRoomId(SAMPLE_ROOM_ID)
      toast.info("Filled sample Room ID for testing")
    } catch {
      setRoomId(SAMPLE_ROOM_ID)
      toast.info("Filled sample Room ID")
    } finally {
      setIsPasting(false)
    }
  }

  return (
    <section className="relative mx-auto grid w-full max-w-6xl items-center gap-12 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:gap-16 lg:py-20">
      {/* Left Column: Vision & Value Proposition */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.25 }}
        className="min-w-0"
      >
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 font-mono text-xs font-semibold tracking-wider text-primary shadow-2xs">
          <span className="size-1.5 rounded-full bg-primary" />
          <span>DIRECT P2P FILE TRANSFER</span>
        </div>

        {/* Wordmark Display */}
        <div className="mt-6 inline-flex items-center gap-3 text-foreground">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Radio size={24} strokeWidth={2} />
          </span>
          <span className="relative inline-block pb-2 text-[clamp(2.75rem,5.5vw,4.25rem)] font-bold leading-none tracking-[-0.045em]">
            win<span className="text-primary">dow</span>
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-1.5 w-12 rounded-full bg-pink-accent"
            />
          </span>
        </div>

        {/* Headline */}
        <h1 className="mt-6 max-w-[14ch] text-[clamp(2.5rem,5.5vw,3.75rem)] font-bold leading-[1.05] tracking-[-0.045em] text-foreground">
          Send files directly, without the upload step.
        </h1>

        {/* Crisp Editorial Lede */}
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Skip the slow cloud upload-and-share cycle. Window establishes an encrypted WebRTC
          DataChannel directly between sender and recipient browsers. Payloads stream in 64 KB
          memory frames without ever touching a server disk.
        </p>

        {/* Proof Points */}
        <ul className="mt-8 grid gap-4 sm:grid-cols-1" aria-label="Key features of Window">
          {proofPoints.map(({ icon: Icon, title, detail, tone }) => (
            <li
              key={title}
              className="flex items-start gap-3.5 rounded-xl border border-border/60 bg-card/40 p-3.5 transition-colors hover:border-border hover:bg-card/70"
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
      </motion.div>

      {/* Right Column: Tactile Room Console Card */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.25, delay: reducedMotion ? 0 : 0.08 }}
        className="w-full min-w-0 lg:justify-self-end"
      >
        <Card className="w-full rounded-2xl border-border bg-card shadow-sm transition-all lg:max-w-[28rem]">
          {/* Card Console Header */}
          <CardHeader className="space-y-1.5 border-b border-border/80 p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                Quick Connect
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                <Wifi size={12} className="text-success" /> Signaling Ready
              </span>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Create or join a room
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Rooms connect peers directly for private, zero-upload file exchange.
            </CardDescription>
          </CardHeader>

          {/* Card Body */}
          <CardContent className="space-y-5 p-5 sm:p-7">
            {/* Primary Action: Create Room */}
            <div className="space-y-2">
              <Button
                onClick={handleCreateRoom}
                className="group h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-xs transition-all hover:opacity-95 active:scale-[0.99]"
              >
                <Plus size={18} className="transition-transform group-hover:rotate-90" />
                <span>Create instant room</span>
                <Sparkles size={16} className="ml-auto opacity-70" />
              </Button>
              <p className="px-1 text-[11px] text-muted-foreground">
                Generates a temporary UUID. Share the link with your peer to connect.
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
                <div className="flex items-center justify-between">
                  <label htmlFor="room-id" className="text-xs font-semibold text-foreground">
                    Room ID (UUID)
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    disabled={isPasting}
                    className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    <ClipboardPaste size={12} />
                    <span>Paste or Sample ID</span>
                  </button>
                </div>
                <Input
                  id="room-id"
                  type="text"
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={roomId || ""}
                  onChange={(event) => setRoomId(event.target.value)}
                  autoComplete="off"
                  spellCheck="false"
                  className="h-11 rounded-xl border-border bg-background/80 font-mono text-sm tracking-tight placeholder:font-sans placeholder:tracking-normal focus-visible:ring-primary"
                />
              </div>

              <Button
                type="submit"
                variant="secondary"
                className="group h-11 w-full rounded-xl border border-border/80 bg-secondary text-sm font-semibold text-secondary-foreground shadow-2xs hover:bg-secondary/80"
              >
                <span>Join room</span>
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Button>
            </form>

            {/* Safety Notice / Peer note */}
            <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">WebRTC Topology:</span> Both sender
              and receiver must have Window open simultaneously. Files transfer directly between
              browsers and disappear when closed.
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  )
}
