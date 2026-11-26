import { useEffect, useMemo, useState } from "react"
import {
  Download,
  File as FileIcon,
  Plus,
  Timer,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import type { SharedFileOffer } from "@window/shared"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { usePullStore } from "@/store/pullStore"
import { Kbd } from "@/components/keybindings/Kbd"

interface Props {
  roomId: string
  userId: string
  userName: string
  remoteUsers: Record<string, string>
  onPublish: (offer: SharedFileOffer, file: File) => void
  onPull: (offer: SharedFileOffer) => void
  onCancel: (offer: SharedFileOffer) => void
  onRevoke: (offerId: string) => void
}

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`

export function PullSharingPanel({
  roomId,
  userId,
  userName,
  remoteUsers,
  onPublish,
  onPull,
  onCancel,
  onRevoke,
}: Props) {
  const { offers, statuses, progress } = usePullStore()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState("")
  const [visibility, setVisibility] = useState<"room" | "selected">("room")
  const [recipients, setRecipients] = useState<string[]>([])
  const [duration, setDuration] = useState(10)
  const [now, setNow] = useState(Date.now())
  const peers = Object.entries(remoteUsers)
  const connectedPeerIds = new Set(peers.map(([id]) => id))
  const activeRecipients = recipients.filter((id) => connectedPeerIds.has(id))
  const visibleOffers = useMemo(
    () =>
      offers.filter(
        (offer) => offer.ownerId === userId || offer.expiresAt > now,
      ),
    [offers, userId, now],
  )
  const ownOffers = visibleOffers.filter((offer) => offer.ownerId === userId)
  const incomingOffers = visibleOffers.filter(
    (offer) => offer.ownerId !== userId,
  )
  const selectedBytes = selectedFiles.reduce(
    (total, file) => total + file.size,
    0,
  )
  const advertisedBytes = ownOffers.reduce(
    (total, offer) => total + offer.size,
    0,
  )
  const exceedsRoomQuota = selectedBytes + advertisedBytes > 200 * 1024 * 1024
  const activePull = Object.values(statuses).some(
    (status) => status === "requesting" || status === "downloading",
  )

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const publish = () => {
    if (exceedsRoomQuota) {
      setFileError("Your active offers cannot exceed 200 MB total.")
      return
    }
    if (visibility === "selected" && activeRecipients.length === 0) {
      setFileError("Choose at least one connected peer to share with.")
      return
    }
    const createdAt = Date.now()
    for (const file of selectedFiles) {
      const offer: SharedFileOffer = {
        offerId: uuidv4(),
        roomId,
        ownerId: userId,
        ownerName: userName,
        name: file.name,
        type: file.type,
        size: file.size,
        createdAt,
        expiresAt: createdAt + duration * 60 * 1000,
        visibility,
        recipientIds: visibility === "selected" ? activeRecipients : [],
      }
      onPublish(offer, file)
    }
    setSelectedFiles([])
    setFileError("")
    setRecipients([])
  }

  return (
    <Card className="gap-0 py-0 rounded-2xl border-border shadow-sm">
      <CardHeader className="border-b border-border p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Download size={19} />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-lg">Available files</CardTitle>
            <CardDescription className="mt-1">
              Pull a file directly from a peer while they’re online.
            </CardDescription>
          </div>
          <span className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
            {incomingOffers.length} available
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-5 sm:p-6">
        <section aria-label="Files offered by peers" className="space-y-2">
          {incomingOffers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-7 text-center">
              <Users size={20} className="mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No files available yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Offers from peers will appear here.
              </p>
            </div>
          ) : (
            incomingOffers.map((offer) => {
              const remaining = Math.max(
                0,
                Math.ceil((offer.expiresAt - now) / 60000),
              )
              const status = statuses[offer.offerId] ?? "idle"
              return (
                <div
                  key={offer.offerId}
                  className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <FileIcon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      title={offer.name}
                    >
                      {offer.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {offer.ownerName} · {formatSize(offer.size)} ·{" "}
                      {remaining < 1
                        ? "Expires in under a minute"
                        : `${remaining} min left`}
                    </p>
                    {status === "downloading" && (
                      <div
                        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-label={`Downloading ${offer.name}`}
                        aria-valuenow={Math.round(progress[offer.offerId] ?? 0)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-[width]"
                          style={{ width: `${progress[offer.offerId] ?? 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {status === "requesting" || status === "downloading" ? (
                    <Button
                      className="min-h-11 shrink-0"
                      variant="ghost"
                      onClick={() => onCancel(offer)}
                    >
                      <X size={15} />
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      className="min-h-11 shrink-0"
                      variant="outline"
                      disabled={activePull || remaining <= 0}
                      onClick={() => onPull(offer)}
                    >
                      <Download size={15} />
                      {status === "unavailable" ? "Retry" : "Download"}
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </section>

        <section
          className="space-y-3 border-t border-border pt-5"
          aria-labelledby="offer-files-heading"
        >
          <div>
            <h3 id="offer-files-heading" className="text-sm font-semibold">
              Offer files
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Files stay available in this tab until expiry or until you leave
              the room. Contents are not uploaded to the server.
            </p>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/20 px-3 text-sm hover:border-primary/70 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <Plus size={16} />
            <span>Choose up to 5 files (50 MB each, 200 MB active total)</span>
            <Kbd size="sm">O</Kbd>
            <input
              id="offer-file-input"
              type="file"
              multiple
              className="sr-only"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                if (files.length > 5) {
                  setFileError("You can offer up to 5 files at a time.")
                  setSelectedFiles([])
                } else if (files.some((file) => file.size > 50 * 1024 * 1024)) {
                  setFileError("Each offered file must be 50 MB or smaller.")
                  setSelectedFiles([])
                } else {
                  setFileError("")
                  setSelectedFiles(files)
                }
                event.target.value = ""
              }}
            />
          </label>
          {selectedFiles.length > 0 && (
            <ul className="space-y-1" aria-label="Files to offer">
              {selectedFiles.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <FileIcon size={14} className="text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="text-muted-foreground">
                    {formatSize(file.size)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium">
              Audience
              <select
                value={visibility}
                onChange={(event) =>
                  setVisibility(event.target.value as "room" | "selected")
                }
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="room">Everyone in this room</option>
                <option value="selected">Selected peers</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium">
              Available for
              <select
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes (default)</option>
                <option value={15}>15 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </label>
          </div>
          {visibility === "selected" && (
            <fieldset className="space-y-2 rounded-lg border border-border p-3">
              <legend className="px-1 text-xs font-medium">
                Choose recipients
              </legend>
              {peers.length ? (
                peers.map(([id, name]) => (
                  <label
                    key={id}
                    className="flex min-h-9 cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 cursor-pointer rounded accent-primary"
                      checked={recipients.includes(id)}
                      onChange={(event) =>
                        setRecipients((current) =>
                          event.target.checked
                            ? [...current, id]
                            : current.filter((item) => item !== id),
                        )
                      }
                    />
                    {name}
                  </label>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  No other peers are connected.
                </p>
              )}
            </fieldset>
          )}
          {fileError && (
            <p role="alert" className="text-xs text-destructive">
              {fileError}
            </p>
          )}
          {exceedsRoomQuota && !fileError && (
            <p role="alert" className="text-xs text-destructive">
              Active offers cannot exceed 200 MB total. Remove an offer or
              choose fewer files.
            </p>
          )}
          <Button
            onClick={publish}
            disabled={
              !selectedFiles.length ||
              exceedsRoomQuota ||
              (visibility === "selected" && activeRecipients.length === 0)
            }
            className="min-h-11 w-full"
          >
            <Timer size={16} />
            Make available for{" "}
            {duration === 60 ? "1 hour" : `${duration} minutes`}
          </Button>
        </section>

        {ownOffers.length > 0 && (
          <section
            className="space-y-2 border-t border-border pt-5"
            aria-labelledby="your-offers-heading"
          >
            <h3 id="your-offers-heading" className="text-sm font-semibold">
              Your active offers
            </h3>
            {ownOffers.map((offer) => (
              <div
                key={offer.offerId}
                className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm">
                  {offer.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.max(0, Math.ceil((offer.expiresAt - now) / 60000))}m
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-11 text-destructive hover:text-destructive"
                  onClick={() => onRevoke(offer.offerId)}
                  aria-label={`Stop sharing ${offer.name}`}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            ))}
          </section>
        )}
      </CardContent>
    </Card>
  )
}
