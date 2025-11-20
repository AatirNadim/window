import { useFileStore } from "@/store/fileStore"
import { useSocket } from "@/store/hooks/socketHook"
import { motion, AnimatePresence } from "framer-motion"
import { FileUp, XCircle } from "lucide-react"
import { useState } from "react"

type FileUploadProps = {
  isConnected: boolean
}

const FileUpload = ({ isConnected }: FileUploadProps) => {
  const [dragOver, setDragOver] = useState(false)

  const { resetFileStore, setFileToBeSent, fileToBeSent, isSending } =
    useFileStore()

  // --- File Sending Logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetFileStore()

    if (e.target.files?.[0]) {
      setFileToBeSent(e.target.files[0])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      setFileToBeSent(files[0])
    }
  }

  return (
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
          {fileToBeSent
            ? fileToBeSent.name
            : "Drop files here or click to select"}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {fileToBeSent
            ? `${(fileToBeSent.size / 1024 / 1024).toFixed(2)} MB`
            : "Any file type, any size"}
        </span>
      </label>

      <AnimatePresence>
        {fileToBeSent && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute top-3 right-3 p-1 rounded-full bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            onClick={(e) => {
              e.preventDefault()
              resetFileStore()
            }}
          >
            <XCircle className="h-5 w-5 text-red-500" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default FileUpload
