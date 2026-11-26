import { useState, useEffect, useRef } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { toast } from "sonner"
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  FileCode2,
  FileSpreadsheet,
  FileVideo,
  HardDrive,
  Laptop,
  Play,
  RotateCcw,
  ShieldCheck,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SampleFile {
  id: string
  name: string
  sizeMb: number
  type: string
  chunks: number
  icon: typeof FileVideo
  checksum: string
}

const SAMPLE_FILES: SampleFile[] = [
  {
    id: "footage",
    name: "raw-footage.mp4",
    sizeMb: 48,
    type: "video/mp4",
    chunks: 768, // 48 MB / 64 KB = 768 chunks
    icon: FileVideo,
    checksum: "8f7e2c91a0b3d4e5f60123456789abcdef0123456789abcdef0123456789abcd",
  },
  {
    id: "figma",
    name: "figma-backup.fig",
    sizeMb: 24,
    type: "application/x-figma",
    chunks: 384, // 24 MB / 64 KB = 384 chunks
    icon: FileSpreadsheet,
    checksum: "4b21d79e8a1c3f56e0987654321fedcba0987654321fedcba0987654321fedcb",
  },
  {
    id: "dataset",
    name: "dataset.json",
    sizeMb: 4.2,
    type: "application/json",
    chunks: 68, // 4.2 MB / 64 KB ~= 68 chunks
    icon: FileCode2,
    checksum: "a310c9e782b54d6f80fedcba9876543210fedcba9876543210fedcba98765432",
  },
]

type TransferMode = "push" | "pull"
type SimulationStatus = "idle" | "connecting" | "streaming" | "verifying" | "completed"

export default function InteractiveDemo() {
  const reducedMotion = useReducedMotion()
  const [selectedFile, setSelectedFile] = useState<SampleFile>(SAMPLE_FILES[0])
  const [mode, setMode] = useState<TransferMode>("push")
  const [status, setStatus] = useState<SimulationStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [currentChunk, setCurrentChunk] = useState(0)
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const [checksumVerified, setChecksumVerified] = useState(false)
  const [copiedHash, setCopiedHash] = useState(false)

  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  const startSimulation = () => {
    setStatus("connecting")
    setProgress(0)
    setCurrentChunk(0)
    setChecksumVerified(false)
    setCurrentSpeed(0)

    // Simulate ICE handshake
    setTimeout(() => {
      setStatus("streaming")
      startTimeRef.current = performance.now()
      const totalDuration = reducedMotion ? 400 : 2800 // 2.8s simulation
      const totalChunks = selectedFile.chunks

      const tick = (now: number) => {
        const elapsed = now - startTimeRef.current
        const rawProgress = Math.min(elapsed / totalDuration, 1)
        const progressPercent = Math.floor(rawProgress * 100)
        const chunkIndex = Math.min(Math.floor(rawProgress * totalChunks), totalChunks)

        // Dynamic simulated speed between 17 MB/s and 26 MB/s
        const speed = rawProgress < 1 ? 18.4 + Math.sin(rawProgress * 12) * 4.2 : 0

        setProgress(progressPercent)
        setCurrentChunk(chunkIndex)
        setCurrentSpeed(Number(speed.toFixed(1)))

        if (rawProgress < 1) {
          animationFrameRef.current = requestAnimationFrame(tick)
        } else {
          // Streaming finished, move to SHA-256 verification
          setStatus("verifying")
          setTimeout(() => {
            setChecksumVerified(true)
            setStatus("completed")
          }, reducedMotion ? 100 : 600)
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick)
    }, reducedMotion ? 50 : 400)
  }

  const resetSimulation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    setStatus("idle")
    setProgress(0)
    setCurrentChunk(0)
    setChecksumVerified(false)
    setCurrentSpeed(0)
  }

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const FileIcon = selectedFile.icon

  return (
    <section id="how-it-works" className="relative w-full scroll-mt-16 sm:scroll-mt-20 border-t border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs font-semibold tracking-widest text-primary shadow-2xs">
            <Zap size={13} className="text-primary" />
            <span>INTERACTIVE SIMULATOR</span>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Test-drive direct WebRTC transfer
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            See how Window slices files into 64 KB frames, streams them peer-to-peer via DTLS sockets,
            and validates SHA-256 hashes without ever writing a byte to a cloud server.
          </p>
        </div>

        {/* Sandbox Console Container */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Top Config Controls */}
          <div className="grid border-b border-border bg-secondary/20 p-4 sm:p-6 lg:grid-cols-2 lg:gap-8">
            {/* File Selector */}
            <div className="space-y-2">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                1. Choose sample file payload
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {SAMPLE_FILES.map((file) => {
                  const Icon = file.icon
                  const isSelected = selectedFile.id === file.id
                  return (
                    <button
                      key={file.id}
                      type="button"
                      disabled={status === "streaming" || status === "verifying"}
                      onClick={() => {
                        setSelectedFile(file)
                        resetSimulation()
                      }}
                      className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-2xs"
                          : "border-border bg-card/60 hover:border-border hover:bg-card"
                      } disabled:opacity-50`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <Icon size={16} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                        <span className="font-mono text-[11px] font-semibold text-foreground">
                          {file.sizeMb} MB
                        </span>
                      </div>
                      <span className="mt-2 truncate text-xs font-semibold text-foreground">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {file.chunks} chunks (64KB)
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Transfer Mode Toggle */}
            <div className="mt-4 space-y-2 lg:mt-0">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                2. Select Transfer Mode
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={status === "streaming" || status === "verifying"}
                  onClick={() => {
                    setMode("push")
                    resetSimulation()
                  }}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    mode === "push"
                      ? "border-primary bg-primary/10 shadow-2xs"
                      : "border-border bg-card/60 hover:bg-card"
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-primary" />
                    <span className="text-xs font-bold text-foreground">Immediate Push</span>
                  </div>
                  <span className="mt-1 text-[11px] leading-tight text-muted-foreground">
                    Instant zero-prompt broadcast to all peers in room.
                  </span>
                </button>

                <button
                  type="button"
                  disabled={status === "streaming" || status === "verifying"}
                  onClick={() => {
                    setMode("pull")
                    resetSimulation()
                  }}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    mode === "pull"
                      ? "border-primary bg-primary/10 shadow-2xs"
                      : "border-border bg-card/60 hover:bg-card"
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-pink-accent" />
                    <span className="text-xs font-bold text-foreground">Pull Offer</span>
                  </div>
                  <span className="mt-1 text-[11px] leading-tight text-muted-foreground">
                    Held in RAM with 15m auto-expiry timer.
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Topology Display */}
          <div className="p-6 sm:p-8">
            <div className="relative rounded-2xl border border-border/80 bg-background/70 p-6 sm:p-8">
              {/* Peer A <----> Peer B Network Pipe */}
              <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
                {/* Peer A (Sender) */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-primary">
                      <Laptop size={14} /> PEER A (SENDER)
                    </span>
                    <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[10px] text-secondary-foreground">
                      192.168.1.14
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <FileIcon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {selectedFile.name}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {selectedFile.sizeMb} MB • RAM ArrayBuffer
                      </p>
                    </div>
                  </div>
                </div>

                {/* Connection Conduit / Packet Stream */}
                <div className="flex flex-col items-center justify-center px-2 py-2">
                  <div className="font-mono text-[10px] font-semibold text-muted-foreground uppercase">
                    DTLS 1.3 / SCTP DataChannel
                  </div>

                  <div className="relative my-2 flex h-8 w-44 items-center justify-center rounded-full border border-border bg-secondary/40 px-3">
                    {status === "streaming" && !reducedMotion ? (
                      <div className="flex w-full justify-between overflow-hidden">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <motion.span
                            key={i}
                            animate={{ x: [0, 120] }}
                            transition={{
                              duration: 0.9,
                              repeat: Infinity,
                              ease: "linear",
                              delay: i * 0.16,
                            }}
                            className="size-2 rounded-full bg-primary"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <span>P2P Direct Pipe</span>
                        <ArrowRight size={13} />
                      </div>
                    )}
                  </div>

                  <span className="font-mono text-[11px] font-bold text-foreground">
                    {status === "streaming" ? `${currentSpeed} MB/s` : "Zero Server Storage"}
                  </span>
                </div>

                {/* Peer B (Receiver) */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-foreground">
                      <Laptop size={14} /> PEER B (RECIPIENT)
                    </span>
                    <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[10px] text-secondary-foreground">
                      192.168.1.82
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                      <HardDrive size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {status === "completed"
                          ? "Blob reconstructed"
                          : status === "streaming"
                          ? "Receiving chunks..."
                          : "Awaiting DataChannel"}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {status === "completed"
                          ? `${selectedFile.sizeMb} MB verified`
                          : `${(progress * selectedFile.sizeMb * 0.01).toFixed(1)} / ${selectedFile.sizeMb} MB`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Progress Bar & Framing Details */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    {status === "idle" && "Ready to simulate"}
                    {status === "connecting" && "Establishing WebRTC ICE handshake..."}
                    {status === "streaming" && "Streaming 64 KB memory frames..."}
                    {status === "verifying" && "Computing SHA-256 integrity hash..."}
                    {status === "completed" && "Direct transfer verified & complete!"}
                  </span>
                  <span className="font-mono font-bold text-primary">{progress}%</span>
                </div>

                {/* Custom Progress Bar */}
                <div
                  role="progressbar"
                  aria-label="Simulated transfer progress"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="relative h-3 w-full overflow-hidden rounded-full border border-border bg-secondary/50"
                >
                  <motion.div
                    className="h-full bg-primary"
                    style={{ width: `${progress}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                </div>

                {/* Technical Framing Telemetry */}
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-muted-foreground sm:grid-cols-4">
                  <div className="rounded-lg border border-border/60 bg-card/60 p-2">
                    <span className="block text-[10px] uppercase text-muted-foreground">Chunks</span>
                    <span className="font-bold text-foreground">
                      {currentChunk} / {selectedFile.chunks}
                    </span>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/60 p-2">
                    <span className="block text-[10px] uppercase text-muted-foreground">Frame Size</span>
                    <span className="font-bold text-foreground">65,536 Bytes</span>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/60 p-2">
                    <span className="block text-[10px] uppercase text-muted-foreground">Server Footprint</span>
                    <span className="font-bold text-success">0 Bytes</span>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/60 p-2">
                    <span className="block text-[10px] uppercase text-muted-foreground">Integrity</span>
                    <span className="font-bold text-foreground">
                      {checksumVerified ? "SHA-256 Verified" : "Pending assembly"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Success Confirmation Card */}
              {status === "completed" && (
                <div className="mt-6 rounded-xl border border-success/30 bg-success/10 p-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-success text-primary-foreground">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          Direct P2P Transfer Complete
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <p className="font-mono text-xs text-muted-foreground">
                            SHA-256: {selectedFile.checksum.slice(0, 20)}... (Match) • 0 bytes touched server
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedFile.checksum)
                              setCopiedHash(true)
                              toast.success("SHA-256 hash copied to clipboard")
                              setTimeout(() => setCopiedHash(false), 2000)
                            }}
                            className="inline-flex items-center gap-1 rounded bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-secondary-foreground hover:bg-secondary transition-colors"
                            title="Copy full cryptographic SHA-256 checksum"
                          >
                            {copiedHash ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                            <span>{copiedHash ? "Copied" : "Copy hash"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-card px-3 py-1 font-mono text-xs font-semibold text-foreground shadow-2xs">
                        {mode === "push" ? "Parallel Push Stream" : "Pull Offer Handshake"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Simulator Action Trigger Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck size={16} className="text-success" />
                <span>Simulates genuine WebRTC DataChannel packet fragmentation lifecycle.</span>
              </div>

              <div className="flex items-center gap-3">
                {status !== "idle" && (
                  <Button
                    variant="outline"
                    onClick={resetSimulation}
                    className="h-10 rounded-lg border-border bg-card text-xs font-semibold"
                  >
                    <RotateCcw size={14} /> Reset
                  </Button>
                )}

                <Button
                  onClick={startSimulation}
                  disabled={status === "streaming" || status === "verifying"}
                  className="h-10 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-95"
                >
                  <Play size={14} />
                  {status === "completed" ? "Simulate Again" : "Simulate Direct P2P Transfer"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
