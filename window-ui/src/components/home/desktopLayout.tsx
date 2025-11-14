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

type DesktopLayoutProps = {
  roomId: string | null
  setRoomId: (id: string) => void
  handleCreateRoom: () => void
  handleJoinRoom: () => void
}

const DesktopLayout = ({
  roomId,
  setRoomId,
  handleCreateRoom,
  handleJoinRoom,
}: DesktopLayoutProps) => {
  return (
    <div className="hidden md:grid md:grid-cols-2 md:gap-16 lg:gap-24 items-center min-h-[80vh]">
            {/* Left side - Logo and metadata */}
            <motion.div
              className="space-y-10"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Logo and title */}
              <div className="space-y-8">
                <motion.div
                  className="flex items-center gap-2 md:gap-4 lg:gap-6"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-30" />
                    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg">
                      <Share2 className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <h1 className="text-6xl lg:text-7xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent leading-tight tracking-tight">
                    Window
                  </h1>
                </motion.div>

                <motion.p
                  className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  Share files instantly with peer-to-peer connections. No
                  uploads, no limits, just direct transfers.
                </motion.p>
              </div>

              {/* Features */}
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <div className="flex items-center space-x-5 p-5 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl border-2 border-blue-500/60 flex items-center justify-center bg-blue-50/50 dark:bg-blue-900/20">
                    <Zap
                      className="w-6 h-6 text-blue-600 dark:text-blue-400"
                      strokeWidth={2}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                      Lightning Fast
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      Direct peer-to-peer transfers with no server bottlenecks
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-5 p-5 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl border-2 border-purple-500/60 flex items-center justify-center bg-purple-50/50 dark:bg-purple-900/20">
                    <Shield
                      className="w-6 h-6 text-purple-600 dark:text-purple-400"
                      strokeWidth={2}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                      Secure & Private
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      End-to-end encrypted transfers, no data stored on servers
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-5 p-5 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl border-2 border-pink-500/60 flex items-center justify-center bg-pink-50/50 dark:bg-pink-900/20">
                    <Sparkles
                      className="w-6 h-6 text-pink-600 dark:text-pink-400"
                      strokeWidth={2}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                      No Limits
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      Share files of any size without restrictions
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Footer text */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Built with modern web technologies for seamless file sharing
                </p>
              </motion.div>
            </motion.div>

            {/* Right side - Input card */}
            <motion.div
              className="flex justify-center lg:justify-end"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="w-[440px] backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border border-white/30 dark:border-gray-700/30 shadow-2xl shadow-black/5 dark:shadow-black/20">
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                    Start Sharing
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Create a room or join an existing one to begin file sharing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-lg focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                      onClick={handleCreateRoom}
                    >
                      <Plus className="w-5 h-5 mr-3" />
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

                  <div className="flex w-full items-center space-x-3">
                    <Input
                      type="text"
                      placeholder="Enter Room ID"
                      value={roomId || ""}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="flex-1 h-14 bg-white/70 dark:bg-gray-800/70 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-base"
                      onKeyPress={(e) => e.key === "Enter" && handleJoinRoom()}
                    />
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={handleJoinRoom}
                        className="h-14 px-6 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 hover:from-gray-900 hover:to-black dark:hover:from-gray-600 dark:hover:to-gray-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 focus:ring-2 focus:ring-gray-500/20 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
  )
}

export default DesktopLayout