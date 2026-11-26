import { motion, useReducedMotion } from "framer-motion"
import {
  FileCheck2,
  KeyRound,
  Lock,
  Network,
  ServerOff,
  ShieldCheck,
} from "lucide-react"

const ARCHITECTURE_PILLARS = [
  {
    icon: ShieldCheck,
    title: "DTLS 1.2 / 1.3 End-to-End Encryption",
    tagline: "Cryptographically enforced zero server visibility",
    detail:
      "WebRTC DataChannels mandate Datagram Transport Layer Security (DTLS). Byte streams are encrypted peer-to-peer at the socket layer. Intermediary nodes—including the Window signaling server—have mathematically zero visibility into transferred file bytes.",
    specs: [
      { label: "Ciphers", value: "AES-128-GCM / ChaCha20-Poly1305" },
      { label: "Key Exchange", value: "ECDHE with Perfect Forward Secrecy" },
      { label: "Payload Inspection", value: "Zero (Peer-to-peer socket only)" },
    ],
    tone: "mint",
  },
  {
    icon: FileCheck2,
    title: "64 KB Framing & SHA-256 Checksums",
    tagline: "Deterministic packetization and cryptographic integrity",
    detail:
      "Files are fragmented into standardized 65,536-byte chunk frames with binary sequence headers. The sender calculates an asynchronous SHA-256 digest prior to transmission; the receiver re-computes and matches the hash before generating the final memory Blob.",
    specs: [
      { label: "Frame Slicing", value: "Standardized 64 KB binary packets" },
      { label: "Checksum Standard", value: "SHA-256 256-bit cryptographic digest" },
      { label: "Corruption Guarantee", value: "100% Bit-exact byte verification" },
    ],
    tone: "pink",
  },
  {
    icon: KeyRound,
    title: "Ephemeral Identity & Memory Residence",
    tagline: "Scoped strictly to the browser tab lifecycle",
    detail:
      "Peer identities, encryption handles, and file buffers are retained exclusively in active browser memory and transient sessionStorage. Closing the browser tab terminates WebRTC handles and clears all allocated ArrayBuffers immediately.",
    specs: [
      { label: "Session Persistence", value: "sessionStorage proof only" },
      { label: "Tracking Cookies", value: "0 persistent cookies or tokens" },
      { label: "Tab Destruction", value: "Instant RAM garbage collection" },
    ],
    tone: "slate",
  },
  {
    icon: Network,
    title: "STUN Traversal & Zero-Store Relay Fallback",
    tagline: "NAT hole-punching with zero payload retention",
    detail:
      "ICE negotiates host, server-reflexive, and relay candidates via STUN servers. When strict enterprise symmetric NATs prevent direct UDP peer connection, ephemeral TURN relays forward encrypted packets without ever persisting or inspecting payload bytes.",
    specs: [
      { label: "NAT Traversal", value: "ICE (Interactive Connectivity Est.)" },
      { label: "Direct Pathway", value: "Host LAN & STUN srflx priority" },
      { label: "Relay Payload Policy", value: "Zero storage / In-memory transit only" },
    ],
    tone: "teal",
  },
]

export default function SecurityArchitecture() {
  const reducedMotion = useReducedMotion()

  return (
    <section id="architecture" className="relative w-full scroll-mt-16 sm:scroll-mt-20 border-t border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs font-semibold tracking-widest text-primary shadow-2xs">
            <Lock size={13} className="text-primary" />
            <span>SECURITY & NETWORKING FOUNDATION</span>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Zero server footprint by mathematical design
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Every layer of Window is constructed around client-side memory safety, cryptographic
            handshakes, and strict ephemeral boundaries.
          </p>
        </div>

        {/* 2x2 Dense Technical Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:gap-8">
          {ARCHITECTURE_PILLARS.map((pillar, idx) => {
            const Icon = pillar.icon
            return (
              <motion.div
                key={pillar.title}
                initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: reducedMotion ? 0 : 0.3,
                  delay: reducedMotion ? 0 : idx * 0.08,
                }}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs transition-all hover:border-primary/50"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`grid size-10 place-items-center rounded-xl ${
                        pillar.tone === "pink"
                          ? "bg-pink-accent/20 text-foreground"
                          : pillar.tone === "mint"
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <span className="font-mono text-[11px] font-bold text-muted-foreground">
                      0{idx + 1} // ARCH
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground">
                    {pillar.title}
                  </h3>
                  <p className="mt-1 font-mono text-xs font-semibold text-primary">
                    {pillar.tagline}
                  </p>

                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {pillar.detail}
                  </p>
                </div>

                {/* Technical Specs List */}
                <div className="mt-6 border-t border-border/80 pt-5 font-mono text-xs">
                  <div className="space-y-2">
                    {pillar.specs.map((spec) => (
                      <div
                        key={spec.label}
                        className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-1.5"
                      >
                        <span className="text-muted-foreground">{spec.label}</span>
                        <span className="font-bold text-foreground">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Signaling Transparency Callout */}
        <div className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <ServerOff size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Signaling Node Transparency: What passes through the server?
                </h3>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  The WebSocket signaling server exists solely to broker SDP offer/answer exchanges and
                  ICE candidate negotiation so two browsers can find each other. Once the WebRTC peer
                  connection state transitions to <code className="font-mono text-foreground font-bold">connected</code>,
                  signaling is bypassed entirely and file bytes flow directly through DTLS DataChannels.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3.5 py-1.5 font-mono text-xs font-bold text-foreground">
                <span className="size-2 rounded-full bg-success" />
                Signaling Payload: 0 Bytes
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
