import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  Lock,
  Share2,
  Users,
  Zap,
} from "lucide-react"

export default function ModesComparison() {
  const reducedMotion = useReducedMotion()
  const [activeTab, setActiveTab] = useState<"push" | "pull">("push")

  return (
    <section id="modes" className="relative w-full scroll-mt-16 sm:scroll-mt-20 border-t border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs font-semibold tracking-widest text-primary shadow-2xs">
            <Layers size={13} className="text-primary" />
            <span>DUAL-MODE ERGONOMICS</span>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Push or Pull: Engineered for two distinct collaboration needs
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Choose between rapid parallel broadcasting for live calls or controlled, memory-retained
            pull offers with timed self-destruction.
          </p>
        </div>

        {/* Asymmetrical Cards Grid */}
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Card 1: Immediate Send (Push) */}
          <div
            className={`group relative flex flex-col justify-between rounded-2xl border p-5 sm:p-8 transition-all ${
              activeTab === "push"
                ? "border-primary/80 bg-card shadow-sm ring-1 ring-primary/20"
                : "border-border bg-card/60 hover:border-border hover:bg-card"
            }`}
          >
            <div>
              {/* Badge & Title */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/70 px-3 py-1 font-mono text-xs font-bold tracking-wide text-accent-foreground">
                  <Zap size={13} className="text-primary" /> PARALLEL BROADCAST
                </span>
                <span className="text-xs font-medium text-muted-foreground">Zero Prompt</span>
              </div>

              <h3 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
                Immediate Send (Push)
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Zero-wait parallel broadcast to every connected room member. Files start slicing and
                streaming across WebRTC DataChannels the instant you drop them.
              </p>

              {/* Technical Limits & Properties */}
              <div className="mt-6 space-y-3 border-t border-border/80 pt-6 font-mono text-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <span className="text-muted-foreground">Max files per batch:</span>
                  <span className="font-bold text-foreground">Up to 5 files</span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <span className="text-muted-foreground">Single file ceiling:</span>
                  <span className="font-bold text-foreground">50 MB max</span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <span className="text-muted-foreground">Batch file limit:</span>
                  <span className="font-bold text-foreground">6 MB each</span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <span className="text-muted-foreground">Sender memory retention:</span>
                  <span className="font-bold text-success">0s (Streamed and discarded)</span>
                </div>
              </div>

              {/* Bullet Features */}
              <ul className="mt-6 space-y-2.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0 text-success" />
                  <span>Streams simultaneously across up to 5 concurrent peer channels.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0 text-success" />
                  <span>Recipient triggers automatic system download on completion.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0 text-success" />
                  <span>Zero approval step required from the receiving peer.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 border-t border-border/80 pt-4">
              <button
                type="button"
                onClick={() => setActiveTab("push")}
                className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
              >
                <span>View Push sequence diagram below</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Card 2: Available Files (Pull Offers) */}
          <div
            className={`group relative flex flex-col justify-between rounded-2xl border p-5 sm:p-8 transition-all ${
              activeTab === "pull"
                ? "border-pink-accent/80 bg-card shadow-sm ring-1 ring-pink-accent/30"
                : "border-border bg-card/60 hover:border-border hover:bg-card"
            }`}
          >
            <div>
              {/* Badge & Title */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-accent/20 px-3 py-1 font-mono text-xs font-bold tracking-wide text-foreground">
                  <Clock size={13} className="text-foreground" /> SELECTIVE DEMAND-PULL
                </span>
                <span className="text-xs font-medium text-muted-foreground">Timed Expiry</span>
              </div>

              <h3 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
                Available Files (Pull Offers)
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Sender browser holds files in memory blobs and registers offer metadata. Recipients
                browse available assets and download on demand before expiration.
              </p>

              {/* Technical Limits & Properties */}
              <div className="mt-6 space-y-3 border-t border-border/80 pt-6 font-mono text-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <span className="text-muted-foreground">File size limit:</span>
                  <span className="font-bold text-foreground">50 MB per file</span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <span className="text-muted-foreground">Aggregate memory ceiling:</span>
                  <span className="font-bold text-foreground">200 MB aggregate RAM</span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <span className="text-muted-foreground">Self-destruct timers:</span>
                  <span className="font-bold text-foreground">5m, 10m, 15m, 60m</span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <span className="text-muted-foreground">Selective authorization:</span>
                  <span className="font-bold text-foreground">Peer-specific access toggle</span>
                </div>
              </div>

              {/* Bullet Features */}
              <ul className="mt-6 space-y-2.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0 text-success" />
                  <span>Recipients can choose which files to pull and when.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0 text-success" />
                  <span>Sender can revoke any offer instantly with one click.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0 text-success" />
                  <span>Payload wipes completely from browser RAM on timer expiry.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 border-t border-border/80 pt-4">
              <button
                type="button"
                onClick={() => setActiveTab("pull")}
                className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
              >
                <span>View Pull sequence diagram below</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Sequence Flow Diagram */}
        <div className="mt-12 rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-xs">
          <div className="flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                Protocol Architecture Diagram
              </span>
              <h4 className="text-xl font-bold tracking-tight text-foreground">
                {activeTab === "push" ? "Push Protocol Sequence" : "Pull Offer Protocol Sequence"}
              </h4>
            </div>

            {/* Toggle Buttons */}
            <div className="flex w-full rounded-xl border border-border bg-secondary/30 p-1 sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab("push")}
                className={`flex-1 rounded-lg px-4 py-1.5 text-xs font-bold transition-all sm:flex-initial ${
                  activeTab === "push"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Push Workflow
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pull")}
                className={`flex-1 rounded-lg px-4 py-1.5 text-xs font-bold transition-all sm:flex-initial ${
                  activeTab === "pull"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pull Workflow
              </button>
            </div>
          </div>

          {/* Workflow Steps Visualizer */}
          <div className="mt-8">
            {activeTab === "push" ? (
              <motion.div
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div className="relative rounded-xl border border-border bg-background/60 p-4">
                  <span className="font-mono text-[10px] font-bold text-primary">STEP 01</span>
                  <div className="mt-2 flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    <h5 className="text-sm font-bold text-foreground">Room Pairing</h5>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sender and receiver connect via STUN/ICE signaling. WebRTC DataChannel opens.
                  </p>
                </div>

                <div className="relative rounded-xl border border-border bg-background/60 p-4">
                  <span className="font-mono text-[10px] font-bold text-primary">STEP 02</span>
                  <div className="mt-2 flex items-center gap-2">
                    <Layers size={16} className="text-primary" />
                    <h5 className="text-sm font-bold text-foreground">Frame Slicing</h5>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sender slices files into 64 KB memory frames and calculates SHA-256 header.
                  </p>
                </div>

                <div className="relative rounded-xl border border-border bg-background/60 p-4">
                  <span className="font-mono text-[10px] font-bold text-primary">STEP 03</span>
                  <div className="mt-2 flex items-center gap-2">
                    <Zap size={16} className="text-primary" />
                    <h5 className="text-sm font-bold text-foreground">Direct Broadcast</h5>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Packets stream concurrently to all room peers at raw socket speed.
                  </p>
                </div>

                <div className="relative rounded-xl border border-border bg-background/60 p-4">
                  <span className="font-mono text-[10px] font-bold text-success">STEP 04</span>
                  <div className="mt-2 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-success" />
                    <h5 className="text-sm font-bold text-foreground">Disk Save</h5>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Receiver verifies SHA-256 integrity, reconstructs Blob, and saves to disk.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div className="relative rounded-xl border border-border bg-background/60 p-4">
                  <span className="font-mono text-[10px] font-bold text-foreground">STEP 01</span>
                  <div className="mt-2 flex items-center gap-2">
                    <Lock size={16} className="text-foreground" />
                    <h5 className="text-sm font-bold text-foreground">Memory Staging</h5>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sender retains Blob in browser RAM and configures auto-expiry timer.
                  </p>
                </div>

                <div className="relative rounded-xl border border-border bg-background/60 p-4">
                  <span className="font-mono text-[10px] font-bold text-foreground">STEP 02</span>
                  <div className="mt-2 flex items-center gap-2">
                    <Share2 size={16} className="text-foreground" />
                    <h5 className="text-sm font-bold text-foreground">Meta Advertising</h5>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Only file name, size, and hash metadata are broadcast to room participants.
                  </p>
                </div>

                <div className="relative rounded-xl border border-border bg-background/60 p-4">
                  <span className="font-mono text-[10px] font-bold text-foreground">STEP 03</span>
                  <div className="mt-2 flex items-center gap-2">
                    <Zap size={16} className="text-foreground" />
                    <h5 className="text-sm font-bold text-foreground">Demand Pull</h5>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Peer clicks "Pull". Sender initiates dedicated point-to-point DataChannel stream.
                  </p>
                </div>

                <div className="relative rounded-xl border border-border bg-background/60 p-4">
                  <span className="font-mono text-[10px] font-bold text-success">STEP 04</span>
                  <div className="mt-2 flex items-center gap-2">
                    <Clock size={16} className="text-success" />
                    <h5 className="text-sm font-bold text-foreground">Self-Destruct</h5>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    On timer expiry or manual revoke, sender wipes memory Blob with zero trace.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
