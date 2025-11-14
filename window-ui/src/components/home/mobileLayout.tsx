import { motion } from "framer-motion"
import { ArrowRight, Plus, Share2, Shield, Sparkles, Zap } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"

type MobileLayoutProps = {
  roomId: string | null
  setRoomId: (id: string) => void
  handleCreateRoom: () => void
  handleJoinRoom: () => void
}

const MobileLayout = ({
  roomId,
  setRoomId,
  handleCreateRoom,
  handleJoinRoom,
}: MobileLayoutProps) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-16 md:hidden">
      {/* Header section */}
      <motion.div
        className="text-center space-y-8"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="flex items-center justify-center flex-row"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-30" />
            <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg">
              <Share2 className="w-8 h-8 text-white" />
            </div>
          </div>
        </motion.div>

        <div className="space-y-4">
          <motion.h1
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            Window
          </motion.h1>
          <motion.p
            className="text-lg text-gray-600 dark:text-gray-300 max-w-lg mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            Share files instantly with peer-to-peer connections. No uploads, no
            limits, just direct transfers.
          </motion.p>
        </div>

        {/* Features */}
        <motion.div
          className="grid grid-cols-1 gap-4 max-w-sm mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
            <div className="w-8 h-8 rounded-lg border-2 border-blue-500/60 flex items-center justify-center bg-blue-50/50 dark:bg-blue-900/20">
              <Zap
                className="w-4 h-4 text-blue-600 dark:text-blue-400"
                strokeWidth={2}
              />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Lightning Fast
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Direct P2P transfers
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
            <div className="w-8 h-8 rounded-lg border-2 border-purple-500/60 flex items-center justify-center bg-purple-50/50 dark:bg-purple-900/20">
              <Shield
                className="w-4 h-4 text-purple-600 dark:text-purple-400"
                strokeWidth={2}
              />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Secure & Private
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                End-to-end encrypted
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
            <div className="w-8 h-8 rounded-lg border-2 border-pink-500/60 flex items-center justify-center bg-pink-50/50 dark:bg-pink-900/20">
              <Sparkles
                className="w-4 h-4 text-pink-600 dark:text-pink-400"
                strokeWidth={2}
              />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                No Limits
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Any file size
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <Card className="w-[360px] backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border border-white/30 dark:border-gray-700/30 shadow-2xl shadow-black/5 dark:shadow-black/20">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
              Start Sharing
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Create a room or join an existing one to begin file sharing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                onClick={handleCreateRoom}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create a New Room
              </Button>
            </motion.div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-900 px-4 text-gray-500 dark:text-gray-400 font-medium">
                  Or join a room
                </span>
              </div>
            </div>

            <div className="flex w-full items-center space-x-2">
              <Input
                type="text"
                placeholder="Enter Room ID"
                value={roomId || ""}
                onChange={(e) => setRoomId(e.target.value)}
                className="flex-1 h-12 bg-white/70 dark:bg-gray-800/70 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                onKeyPress={(e) => e.key === "Enter" && handleJoinRoom()}
              />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleJoinRoom}
                  className="h-12 px-5 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 hover:from-gray-900 hover:to-black dark:hover:from-gray-600 dark:hover:to-gray-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 focus:ring-2 focus:ring-gray-500/20 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default MobileLayout
