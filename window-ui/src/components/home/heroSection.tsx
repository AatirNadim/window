import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Check, FileUp, Plus, Radio, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"

type HeroSectionProps = {
  roomId: string | null
  setRoomId: (id: string) => void
  handleCreateRoom: () => void
  handleJoinRoom: () => void
}

const proofPoints = [
  { icon: Radio, title: "Direct transfer", detail: "Files move between browsers over WebRTC." },
  { icon: ShieldCheck, title: "Private by design", detail: "The signaling server does not store file contents." },
  { icon: FileUp, title: "Clear file limits", detail: "Up to 5 files; 50 MB for one file or 6 MB each in a batch." },
]

export default function HeroSection({ roomId, setRoomId, handleCreateRoom, handleJoinRoom }: HeroSectionProps) {
  const reducedMotion = useReducedMotion()
  return (
    <main className="mx-auto grid w-full max-w-6xl items-center gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,.9fr)] lg:gap-16 lg:py-20">
      <motion.section
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.2 }}
        className="min-w-0"
      >
        <div className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold tracking-tight text-foreground">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Radio size={18} /></span>
          Window
        </div>
        <p className="mt-10 text-sm font-semibold text-primary">A room for the files you want to share</p>
        <h1 className="mt-3 max-w-[12ch] text-[clamp(2.5rem,6vw,3.75rem)] font-semibold leading-[1.04] tracking-[-0.045em] text-foreground">
          Send files directly, without the upload step.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
          Create a room, invite someone, and transfer files between browsers. Room setup and connection signaling pass through Window’s server; file contents travel peer to peer when a direct connection is available.
        </p>

        <ul className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-1" aria-label="How Window works">
          {proofPoints.map(({ icon: Icon, title, detail }) => (
            <li key={title} className="flex gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"><Icon size={17} /></span>
              <span><strong className="block text-sm font-semibold">{title}</strong><span className="mt-0.5 block max-w-md text-sm leading-5 text-muted-foreground">{detail}</span></span>
            </li>
          ))}
        </ul>
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><Check size={16} className="text-success" /> No account needed. Share the room link to invite a peer.</p>
      </motion.section>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.2, delay: reducedMotion ? 0 : 0.05 }}
        className="w-full min-w-0 lg:justify-self-end"
      >
        <Card className="w-full rounded-2xl border-border shadow-sm lg:max-w-[28rem]">
          <CardHeader className="space-y-2 p-6 sm:p-8">
            <p className="text-sm font-medium text-primary">Get started</p>
            <CardTitle className="text-2xl font-semibold tracking-tight">Create or join a room</CardTitle>
            <CardDescription className="text-sm leading-6">A room connects up to two people for a private file exchange.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-6 sm:px-8 sm:pb-8">
            <Button onClick={handleCreateRoom} className="h-12 w-full rounded-lg text-base font-semibold">
              <Plus size={18} /> Create room
            </Button>
            <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground" aria-hidden="true">
              <span className="h-px flex-1 bg-border" /> OR JOIN AN EXISTING ROOM <span className="h-px flex-1 bg-border" />
            </div>
            <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); handleJoinRoom() }}>
              <label htmlFor="room-id" className="text-sm font-medium">Room ID</label>
              <Input
                id="room-id"
                type="text"
                placeholder="Paste a room ID"
                value={roomId || ""}
                onChange={(event) => setRoomId(event.target.value)}
                autoComplete="off"
                className="h-11 rounded-lg bg-background text-base"
              />
              <Button type="submit" variant="secondary" className="h-11 w-full rounded-lg">
                Join room <ArrowRight size={16} />
              </Button>
            </form>
            <p className="text-xs leading-5 text-muted-foreground">Your recipient must join the same room. Connection availability can depend on both networks.</p>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  )
}
