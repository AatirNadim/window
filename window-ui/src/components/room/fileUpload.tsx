import {
  MAX_FILE_SIZE_MB_MULTIPLE_SEND,
  MAX_FILE_SIZE_SINGLE_SEND,
  MAX_FILES_TO_SEND_TOGETHER,
} from "@/lib/constants"
import { validateImmediateFileSelection } from "@/lib/fileValidation"
import { useFileStore } from "@/store/fileStore"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { File as FileIcon, FileUp, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

type FileUploadProps = { isConnected: boolean }

const FileUpload = ({ isConnected }: FileUploadProps) => {
  const [dragOver, setDragOver] = useState(false)
  const { addFiles, removeFile, clearFilesToBeSent, filesToBeSent, isSending } =
    useFileStore()
  const reducedMotion = useReducedMotion()

  const validateAndAddFiles = (files: FileList | File[]) => {
    const result = validateImmediateFileSelection(
      Array.from(files),
      filesToBeSent.length,
    )
    result.errors.forEach((error) => toast.error(error))
    if (result.files.length > 0) addFiles(result.files)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) validateAndAddFiles(event.target.files)
    event.target.value = ""
  }
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    if (!disabled && event.dataTransfer.files.length > 0)
      validateAndAddFiles(event.dataTransfer.files)
  }
  const disabled = isSending || !isConnected

  return (
    <section className="space-y-4" aria-label="Choose files to send">
      <div
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        aria-disabled={disabled}
        className={`relative rounded-xl border border-dashed px-4 py-7 text-center transition-colors sm:px-6 ${dragOver ? "border-primary bg-accent" : "border-input bg-muted/30 hover:border-primary/70"} ${disabled ? "cursor-not-allowed opacity-65" : ""}`}
      >
        <input
          type="file"
          id="file-input"
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          onChange={handleFileChange}
          disabled={disabled}
          multiple
          aria-label="Choose files to send"
        />
        <div className="pointer-events-none">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-background text-primary">
            <FileUp size={22} />
          </span>
          <p className="mt-3 text-sm font-semibold">
            Drop files here or browse
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Up to {MAX_FILES_TO_SEND_TOGETHER} files ·{" "}
            {MAX_FILE_SIZE_SINGLE_SEND} MB for one file ·{" "}
            {MAX_FILE_SIZE_MB_MULTIPLE_SEND} MB each in a batch
          </p>
          {!isConnected && (
            <p className="mt-2 text-xs text-muted-foreground">
              Connect to a peer before choosing files.
            </p>
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 rounded-xl peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring" />
      </div>

      <AnimatePresence initial={false}>
        {filesToBeSent.length > 0 && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">
                Selected files{" "}
                <span className="text-muted-foreground">
                  ({filesToBeSent.length}/{MAX_FILES_TO_SEND_TOGETHER})
                </span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11 text-destructive hover:text-destructive"
                onClick={clearFilesToBeSent}
                disabled={isSending}
              >
                <Trash2 size={15} />
                Clear all
              </Button>
            </div>
            <ul
              className="max-h-52 space-y-2 overflow-y-auto"
              aria-label="Selected files"
            >
              {filesToBeSent.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                >
                  <FileIcon size={17} className="shrink-0 text-primary" />
                  <span
                    className="min-w-0 flex-1 truncate text-sm"
                    title={file.name}
                  >
                    {file.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0"
                    onClick={() => removeFile(file.name)}
                    disabled={isSending}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export default FileUpload
