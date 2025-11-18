import { motion, AnimatePresence } from "framer-motion"
import React from "react"
import { Progress } from "../ui/progress"
import { CheckCircle } from "lucide-react"

type ProgressSectionProps = {
  isSending: boolean
  transferProgress: number
  file: File | null
  receivedFileInfo: { name: string } | null
}

const ProgressSection = ({
  isSending,
  transferProgress,
  file,
  receivedFileInfo,
}: ProgressSectionProps) => {
  return (
    <AnimatePresence>
      {(isSending || transferProgress > 0) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isSending ? "Sending" : "Receiving"}:{" "}
              {file?.name || receivedFileInfo?.name}
            </p>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(transferProgress)}%
            </span>
          </div>
          <Progress
            value={transferProgress}
            className="h-3 bg-white/50 dark:bg-gray-800/50"
          />
          {transferProgress === 100 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center text-green-600 dark:text-green-400"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Transfer Complete!</span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ProgressSection
