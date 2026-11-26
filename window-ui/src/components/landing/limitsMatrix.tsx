import { Check, X, HardDrive, Cpu } from "lucide-react"

interface MatrixRow {
  attribute: string
  window: string
  windowStatus: boolean
  cloud: string
  cloudStatus: boolean
  wetransfer: string
  wetransferStatus: boolean
  airdrop: string
  airdropStatus: boolean
}

const COMPARISON_ROWS: MatrixRow[] = [
  {
    attribute: "Server Payload Storage",
    window: "0 Bytes (Never stored)",
    windowStatus: true,
    cloud: "Full copy stored indefinitely",
    cloudStatus: false,
    wetransfer: "Stored in cloud (7-30 days)",
    wetransferStatus: false,
    airdrop: "0 Bytes (Local only)",
    airdropStatus: true,
  },
  {
    attribute: "Encryption Standard",
    window: "DTLS 1.2/1.3 End-to-End",
    windowStatus: true,
    cloud: "At-rest (Provider holds keys)",
    cloudStatus: false,
    wetransfer: "In-transit TLS only",
    wetransferStatus: false,
    airdrop: "Apple P2P TLS",
    airdropStatus: true,
  },
  {
    attribute: "Transfer Pathway",
    window: "Direct Browser-to-Browser",
    windowStatus: true,
    cloud: "Upload → S3 → Download (2x data)",
    cloudStatus: false,
    wetransfer: "Upload → Cloud → Download",
    wetransferStatus: false,
    airdrop: "Local Wi-Fi Direct / BLE",
    airdropStatus: true,
  },
  {
    attribute: "Account & Tracking",
    window: "None (Zero telemetry)",
    windowStatus: true,
    cloud: "Mandatory account + cookies",
    cloudStatus: false,
    wetransfer: "Email or account prompt",
    wetransferStatus: false,
    airdrop: "Apple ID & hardware link",
    airdropStatus: false,
  },
  {
    attribute: "Cross-Platform Interop",
    window: "Universal (Any modern browser)",
    windowStatus: true,
    cloud: "Universal (Via web/app)",
    cloudStatus: true,
    wetransfer: "Universal (Via web)",
    wetransferStatus: true,
    airdrop: "Apple ecosystem only",
    airdropStatus: false,
  },
  {
    attribute: "Max File Size Ceiling",
    window: "50 MB (RAM buffer cap)",
    windowStatus: true,
    cloud: "Up to 5 TB",
    cloudStatus: true,
    wetransfer: "2 GB (Free tiers)",
    wetransferStatus: true,
    airdrop: "No hard limit (Disk)",
    airdropStatus: true,
  },
  {
    attribute: "Session Lifetime",
    window: "Tab session (Vanishes on close)",
    windowStatus: true,
    cloud: "Permanent cloud storage",
    cloudStatus: false,
    wetransfer: "7 days public link",
    wetransferStatus: false,
    airdrop: "Instant transfer only",
    airdropStatus: true,
  },
]

export default function LimitsMatrix() {
  return (
    <section id="specs" className="relative w-full scroll-mt-16 sm:scroll-mt-20 border-t border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs font-semibold tracking-widest text-primary shadow-2xs">
            <Cpu size={13} className="text-primary" />
            <span>TRANSPARENT BOUNDARIES</span>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Honest engineering limits. Clear comparisons.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Window is purpose-built for zero-upload browser transfers. Here is how our architecture
            compares to traditional cloud storage, upload droppers, and local device tools.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mt-12">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Feature & Boundary Matrix
          </p>
          <span className="sm:hidden self-start rounded-full bg-secondary px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
            Scroll table horizontally →
          </span>
        </div>

        {/* Dense Comparison Table */}
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="p-4 font-mono font-bold uppercase tracking-wider text-muted-foreground sm:px-6 sm:py-5">
                  Specification
                </th>
                <th className="bg-primary/10 p-4 font-mono font-bold uppercase tracking-wider text-primary sm:px-6 sm:py-5">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary" />
                    <span>Window (WebRTC)</span>
                  </div>
                </th>
                <th className="p-4 font-mono font-bold uppercase tracking-wider text-muted-foreground sm:px-6 sm:py-5">
                  Cloud Drives (Google/Dropbox)
                </th>
                <th className="p-4 font-mono font-bold uppercase tracking-wider text-muted-foreground sm:px-6 sm:py-5">
                  Droppers (WeTransfer)
                </th>
                <th className="p-4 font-mono font-bold uppercase tracking-wider text-muted-foreground sm:px-6 sm:py-5">
                  Local (AirDrop)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.attribute} className="transition-colors hover:bg-secondary/15">
                  <td className="p-4 font-semibold text-foreground sm:px-6 sm:py-4">
                    {row.attribute}
                  </td>
                  {/* Window Column (Highlighted) */}
                  <td className="bg-primary/5 p-4 font-mono font-bold text-foreground sm:px-6 sm:py-4">
                    <div className="flex items-center gap-1.5 text-primary">
                      {row.windowStatus ? (
                        <Check size={14} className="shrink-0 text-success" />
                      ) : (
                        <span className="shrink-0 text-muted-foreground">•</span>
                      )}
                      <span>{row.window}</span>
                    </div>
                  </td>
                  {/* Cloud Column */}
                  <td className="p-4 text-muted-foreground sm:px-6 sm:py-4">
                    <div className="flex items-center gap-1.5">
                      {row.cloudStatus ? (
                        <Check size={14} className="shrink-0 text-muted-foreground" />
                      ) : (
                        <X size={14} className="shrink-0 text-destructive/70" />
                      )}
                      <span>{row.cloud}</span>
                    </div>
                  </td>
                  {/* WeTransfer Column */}
                  <td className="p-4 text-muted-foreground sm:px-6 sm:py-4">
                    <div className="flex items-center gap-1.5">
                      {row.wetransferStatus ? (
                        <Check size={14} className="shrink-0 text-muted-foreground" />
                      ) : (
                        <X size={14} className="shrink-0 text-destructive/70" />
                      )}
                      <span>{row.wetransfer}</span>
                    </div>
                  </td>
                  {/* AirDrop Column */}
                  <td className="p-4 text-muted-foreground sm:px-6 sm:py-4">
                    <div className="flex items-center gap-1.5">
                      {row.airdropStatus ? (
                        <Check size={14} className="shrink-0 text-muted-foreground" />
                      ) : (
                        <X size={14} className="shrink-0 text-destructive/70" />
                      )}
                      <span>{row.airdrop}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Why 50 MB Architectural Callout Card */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <HardDrive size={20} />
            </span>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-foreground sm:text-lg">
                Why is Window capped at 50 MB per file?
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                WebRTC DataChannels operate with non-streamable memory buffers in many mobile and
                desktop browsers. Slicing files larger than 50 MB into RAM-allocated ArrayBuffers
                can trigger severe garbage collection spikes and cause mobile browsers (such as iOS Safari
                or Android Chrome) to force-reload tabs. By constraining single files to 50 MB,
                Window guarantees instantaneous checksum calculation, 100% memory safety, and zero
                crashes across any device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
