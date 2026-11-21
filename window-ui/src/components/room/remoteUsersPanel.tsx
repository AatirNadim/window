import { Users, Wifi } from "lucide-react"

interface RemoteUsersPanelProps { remoteUsers: Record<string, string | undefined> | undefined }

export function RemoteUsersPanel({ remoteUsers }: RemoteUsersPanelProps) {
  const peers = Object.entries(remoteUsers || {})
  return (
    <section className="flex h-full min-h-0 flex-col gap-3 p-3" aria-labelledby="connected-peers-heading">
      <div className="flex items-center justify-between px-1">
        <h2 id="connected-peers-heading" className="flex items-center gap-2 text-sm font-semibold"><Users size={16} className="text-muted-foreground" />Connected peers</h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground" aria-label={`${peers.length} connected peers`}>{peers.length}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-border bg-muted/40 p-2">
        {peers.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Users size={20} className="mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">No one here yet</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Copy the invite link to bring someone into this room.</p>
          </div>
        ) : peers.map(([id, name]) => (
          <div key={id} className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">{String(name || id).trim().charAt(0).toUpperCase() || "?"}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{name || "Unknown peer"}</span>
              <span className="block truncate text-xs text-muted-foreground" title={id}>{id}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs text-success"><Wifi size={14} />Online</span>
          </div>
        ))}
      </div>
    </section>
  )
}
