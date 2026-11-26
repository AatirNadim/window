import { useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { ChevronDown, HelpCircle } from "lucide-react"

interface FAQItem {
  id: string
  question: string
  answer: string
}

const FAQS: FAQItem[] = [
  {
    id: "storage",
    question: "Where are my files stored during and after a transfer?",
    answer:
      "Your files are never stored on any Window server, cloud bucket, or external database. When transferring, the sender's browser slices the file into 64 KB memory frames and streams them directly into the receiver's WebRTC DataChannel. Once received, the recipient's browser reconstructs the file in local RAM and triggers a native system download. The server sees exactly 0 bytes of your file payload.",
  },
  {
    id: "push-vs-pull",
    question: "What is the difference between Immediate Send (Push) and Available Files (Pull)?",
    answer:
      "Immediate Send is a live push broadcast: when you drop files, they begin streaming instantly across direct WebRTC channels to all connected room peers with no prompt required. Available Files lets you register assets in your browser memory with an expiration timer (5m, 10m, 15m, 60m). Room members see your available list and choose when to pull them, while you maintain full control to revoke access or restrict files to specific peers.",
  },
  {
    id: "tab-close",
    question: "What happens if I close my browser tab or lose internet connection?",
    answer:
      "Because Window is purely ephemeral and memory-resident, closing your browser tab terminates all active WebRTC DataChannels and purges any files held in RAM. Active transfers in progress will immediately halt, and pending pull offers vanish from the room. Any files already completed and saved to the recipient's machine remain completely intact on their local disk.",
  },
  {
    id: "networks",
    question: "Does this work across different Wi-Fi networks, cellular, and mobile phones?",
    answer:
      "Yes. Window uses standard WebRTC Interactive Connectivity Establishment (ICE). If both peers are on the same local Wi-Fi, WebRTC automatically discovers local IP candidates for high-speed LAN transfer (often 30–100+ MB/s). If peers are on different networks or mobile cellular connections, STUN servers perform NAT hole-punching to bridge the connection securely across the internet.",
  },
  {
    id: "signaling-data",
    question: "What data does the Window signaling server actually see?",
    answer:
      "The signaling server only receives standard WebRTC session metadata needed to pair two browsers: the random room UUID, ephemeral peer IDs, and SDP offer/answer/ICE candidate IP socket descriptors. The signaling server never receives filenames, file byte counts, cryptographic checksums, or file payloads.",
  },
  {
    id: "limits",
    question: "Why is there a 50 MB single-file limit?",
    answer:
      "WebRTC DataChannels store buffers in browser memory rather than streaming directly to the filesystem (due to standard web platform sandbox limitations). Restricting transfers to 50 MB prevents browser tab crashes and memory thrashing, especially on mobile devices (iOS Safari and Android Chrome), guaranteeing instant, zero-failure transfers.",
  },
  {
    id: "encryption",
    question: "Can someone on my Wi-Fi network or ISP intercept my file?",
    answer:
      "No. All WebRTC DataChannels are cryptographically mandated to use Datagram Transport Layer Security (DTLS 1.2 or 1.3) with AES-128-GCM or ChaCha20-Poly1305 ciphers and ephemeral ECDHE key exchanges. Even if an attacker captures the raw network packets, they cannot decrypt the payload without the ephemeral browser session keys.",
  },
  {
    id: "install",
    question: "Do I or my recipient need to install an app or browser extension?",
    answer:
      "No. Window runs 100% natively in any modern web browser that supports WebRTC (Chrome, Firefox, Safari, Edge, Brave, Opera, Arc, etc.) on desktop, tablet, and mobile. No account, no browser extensions, and no app store downloads are ever required.",
  },
]

export default function FAQSection() {
  const reducedMotion = useReducedMotion()
  const [openItem, setOpenItem] = useState<string | null>("storage")

  const toggleItem = (id: string) => {
    setOpenItem((prev) => (prev === id ? null : id))
  }

  return (
    <section id="faq" className="relative w-full scroll-mt-16 sm:scroll-mt-20 border-t border-border py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs font-semibold tracking-widest text-primary shadow-2xs">
            <HelpCircle size={13} className="text-primary" />
            <span>COMMON QUESTIONS</span>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Clear, technical explanations about how Window operates, stores data, and enforces privacy.
          </p>
        </div>

        {/* Accordion List */}
        <div className="mt-12 space-y-3">
          {FAQS.map((faq) => {
            const isOpen = openItem === faq.id
            return (
              <div
                key={faq.id}
                className="overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-border/90"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="text-sm font-semibold text-foreground sm:text-base">
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`ml-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.2 }}
                    >
                      <div className="border-t border-border/60 bg-secondary/15 px-5 py-4 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
