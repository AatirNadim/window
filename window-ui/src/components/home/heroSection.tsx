import { motion } from "framer-motion"
import { ArrowRight, Plus, Share2, Shield, Zap, Globe } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"

type HeroSectionProps = {
  roomId: string | null
  setRoomId: (id: string) => void
  handleCreateRoom: () => void
  handleJoinRoom: () => void
}

interface Feature {
  icon: LucideIcon
  title: string
  description: string
  shortDescription: string
}

const features: Feature[] = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Direct peer-to-peer transfers with no server bottlenecks",
    shortDescription: "Direct P2P transfers",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "End-to-end encrypted transfers, no data stored on servers",
    shortDescription: "End-to-end encrypted",
  },
  {
    icon: Globe,
    title: "No Limits",
    description: "Share files of any size without restrictions",
    shortDescription: "Any file size",
  },
]

const HeroSection = ({
  roomId,
  setRoomId,
  handleCreateRoom,
  handleJoinRoom,
}: HeroSectionProps) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-16 md:grid md:grid-cols-2 md:gap-16 lg:gap-24 md:space-y-0 md:items-center md:min-h-[80vh]">
      {/* Left side - Logo and metadata */}
      <motion.div
        className="text-center md:text-left space-y-8 md:space-y-10"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo and title */}
        <div className="space-y-4 md:space-y-8">
          <motion.div
            className="flex items-center justify-center md:justify-start gap-2 md:gap-4 lg:gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="relative">
              <div className="bg-blue-600 dark:bg-blue-500 p-4 rounded-2xl shadow-lg shadow-blue-600/20 dark:shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-600/30 dark:hover:shadow-blue-500/30 transition-shadow duration-300">
                <Share2 className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
              Window
            </h1>
          </motion.div>

          <motion.p
            className="text-lg md:text-xl lg:text-2xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto md:mx-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            Share files instantly with peer-to-peer connections. No uploads, no
            limits, just direct transfers.
          </motion.p>
        </div>

        {/* Features */}
        <motion.div
          className="grid grid-cols-1 gap-3 md:gap-4 max-w-sm md:max-w-none mx-auto md:mx-0"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex items-center space-x-3 md:space-x-5 p-3 md:p-5 rounded-lg md:rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <feature.icon
                  className="w-4 h-4 md:w-6 md:h-6 text-blue-600 dark:text-blue-400"
                  strokeWidth={2}
                />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm md:text-lg md:mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                  <span className="md:hidden">{feature.shortDescription}</span>
                  <span className="hidden md:inline">
                    {feature.description}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Footer text - Desktop only */}
        <motion.div
          className="hidden md:block"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Built with modern web technologies for seamless file sharing
          </p>
        </motion.div>
      </motion.div>

      {/* Right side - Input card */}
      <motion.div
        className="flex justify-center lg:justify-end"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card className="w-[360px] md:w-[440px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardHeader className="text-center pb-6 md:pb-8">
            <CardTitle className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Start Sharing
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed">
              Create a room or join an existing one to begin file sharing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 md:space-y-8">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                className="w-full h-12 md:h-14 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20 dark:shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-600/30 dark:hover:shadow-blue-500/30 transition-all duration-300 text-base md:text-lg"
                onClick={handleCreateRoom}
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" />
                Create a New Room
              </Button>
            </motion.div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-800 px-4 text-slate-500 dark:text-slate-400 font-medium">
                  Or join a room
                </span>
              </div>
            </div>

            <div className="flex w-full items-center space-x-2 md:space-x-3">
              <Input
                type="text"
                placeholder="Enter Room ID"
                value={roomId || ""}
                onChange={(e) => setRoomId(e.target.value)}
                className="flex-1 h-12 md:h-14 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-base"
                onKeyPress={(e) => e.key === "Enter" && handleJoinRoom()}
              />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleJoinRoom}
                  className="h-12 md:h-14 px-5 md:px-6 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default HeroSection
