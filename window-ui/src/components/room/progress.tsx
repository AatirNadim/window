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
          className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {isSending ? "Sending" : "Receiving"}:{" "}
              {file?.name || receivedFileInfo?.name}
            </p>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {Math.round(transferProgress)}%
            </span>
          </div>
          <Progress
            value={transferProgress}
            className="h-3 bg-white dark:bg-slate-800"
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
