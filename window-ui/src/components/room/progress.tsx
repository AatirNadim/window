import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Progress } from "../ui/progress"
import { CheckCircle2, ArrowDownToLine } from "lucide-react"

type ProgressSectionProps = {
  isSending: boolean
  transferProgress: number
  file: File | null
  receivedFileInfo: { name: string } | null
}

export default function ProgressSection({ isSending, transferProgress, file, receivedFileInfo }: ProgressSectionProps) {
  const reducedMotion = useReducedMotion()
  const isVisible = isSending || transferProgress > 0 || Boolean(receivedFileInfo)
  const name = file?.name || receivedFileInfo?.name || "File transfer"
  const progress = Math.max(0, Math.min(100, Math.round(transferProgress)))
  const complete = !isSending && progress === 100

  return (
    <AnimatePresence initial={false}>
      {isVisible && (
        <motion.section initial={reducedMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3 rounded-xl border border-border bg-muted/40 p-4" aria-label="File transfer status">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              {receivedFileInfo && !isSending ? <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-pink-accent text-pink-accent-foreground"><ArrowDownToLine size={15} /></span> : <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
              <div className="min-w-0">
                <p className="text-sm font-medium">{isSending ? "Sending" : receivedFileInfo ? "Received" : complete ? "Transfer complete" : "Receiving"}</p>
                <p className="truncate text-sm text-muted-foreground" title={name}>{name}</p>
              </div>
            </div>
            <span className="shrink-0 text-sm font-medium tabular-nums">{progress}%</span>
          </div>
          <Progress value={progress} aria-label={`${isSending ? "Sending" : "Receiving"} ${name}`} aria-valuetext={`${progress}% complete`} className="h-2" />
          {complete && <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 size={16} />Transfer complete</p>}
          {receivedFileInfo && <p className="text-xs text-muted-foreground">The received file is ready in your browser’s download.</p>}
        </motion.section>
      )}
    </AnimatePresence>
  )
}
