import {
  MAX_FILE_SIZE_MB_MULTIPLE_SEND,
  MAX_FILE_SIZE_SINGLE_SEND,
  MAX_FILES_TO_SEND_TOGETHER,
} from "@/lib/constants"
import { useFileStore } from "@/store/fileStore"
import { motion, AnimatePresence } from "framer-motion"
import { FileUp, XCircle, File as FileIcon, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

type FileUploadProps = {
  isConnected: boolean
}

const FileUpload = ({ isConnected }: FileUploadProps) => {
  const [dragOver, setDragOver] = useState(false)

  const { addFiles, removeFile, clearFilesToBeSent, filesToBeSent, isSending } =
    useFileStore()

  const validateAndAddFiles = (files: FileList | File[]) => {
    const validFiles: File[] = []
    const currentCount = filesToBeSent.length

    if (currentCount >= MAX_FILES_TO_SEND_TOGETHER) {
      toast.error(`Maximum ${MAX_FILES_TO_SEND_TOGETHER} files allowed.`)
      return
    }
    if (currentCount + files.length > MAX_FILES_TO_SEND_TOGETHER) {
      toast.error(
        `You can only add ${MAX_FILES_TO_SEND_TOGETHER - currentCount} more file(s).`,
      )
      return
    }

    if (currentCount + files.length === 1) {
      // there is only one file to be sent overall
      const file = files[0]

      if (file.size > MAX_FILE_SIZE_SINGLE_SEND * 1024 * 1024) {
        toast.error(
          `File ${file.name} exceeds ${MAX_FILE_SIZE_SINGLE_SEND}MB limit.`,
        )
        return
      }
      validFiles.push(file)
    } else {
      Array.from(files).forEach((file) => {
        if (file.size > MAX_FILE_SIZE_MB_MULTIPLE_SEND * 1024 * 1024) {
          toast.error(
            `File ${file.name} exceeds ${MAX_FILE_SIZE_MB_MULTIPLE_SEND}MB limit and was skipped.`,
          )
        }
        validFiles.push(file)
      })
    }

    if (validFiles.length > 0) {
      addFiles(validFiles)
    }
  }

  // --- File Sending Logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateAndAddFiles(e.target.files)
    }
    // Reset input value to allow selecting the same file again if needed
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    if (e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files)
    }
  }

  return (
    <div className="space-y-4">
      <motion.div
        className={`relative p-8 border-2 border-dashed rounded-xl text-center transition-all duration-300 ${
          dragOver
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        } ${!isConnected ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        whileHover={isConnected ? { scale: 1.02 } : {}}
        whileTap={isConnected ? { scale: 0.98 } : {}}
      >
        <input
          type="file"
          id="file-input"
          className="hidden"
          onChange={handleFileChange}
          disabled={isSending || !isConnected}
          multiple
        />
        <label
          htmlFor="file-input"
          className={`cursor-pointer ${isSending || !isConnected ? "cursor-not-allowed" : ""}`}
        >
          <motion.div
            animate={dragOver ? { scale: 1.1 } : { scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <FileUp className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
          </motion.div>
          <span className="block text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Drop files here or click to select
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Max {MAX_FILES_TO_SEND_TOGETHER} files,{" "}
            {MAX_FILE_SIZE_MB_MULTIPLE_SEND}MB each
          </span>
        </label>
      </motion.div>

      <AnimatePresence>
        {filesToBeSent.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Selected Files ({filesToBeSent.length}/
                {MAX_FILES_TO_SEND_TOGETHER})
              </span>
              <button
                onClick={clearFilesToBeSent}
                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                disabled={isSending}
              >
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            </div>
            <div className="grid gap-2 max-h-40 overflow-y-auto pr-2">
              {filesToBeSent.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-sm truncate max-w-[200px]">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(file.name)}
                    disabled={isSending}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <XCircle className="w-4 h-4 text-gray-500 hover:text-red-500" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default FileUpload
