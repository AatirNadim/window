import { v4 as uuidv4 } from 'uuid'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Share2, Plus, ArrowRight, Sparkles, Shield, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/theme-toggle'
import { useUserStore } from '@/store'

export const Route = createFileRoute('/')({
  component: Home,
})

export default function Home() {
  const [roomId, setRoomId] = useState('')

  const navigate = useNavigate()
  const { initializeUser } = useUserStore()

  const handleCreateRoom = () => {
    // Initialize user before creating room
    initializeUser()

    const newRoomId = uuidv4()
    setRoomId(newRoomId)

    // navigate to the new room
    navigate({ to: `/room/${newRoomId}` })

    toast.success('Room Created!', {
      description: `Your room ID is: ${newRoomId}`,
    })
  }

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      // TODO: Implement WebSocket room joining
      toast.success('Joining room...', {
        description: `Connecting to room: ${roomId}`,
      })
    } else {
      toast.error('Invalid Room ID', {
        description: 'Please enter a valid room ID to join.',
      })
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20" />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear',
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear',
          }}
        />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      {/* Main content */}
      <div className="relative z-5 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Header section */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="flex items-center justify-center mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-75" />
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl">
                <Share2 className="w-8 h-8 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Window
          </motion.h1>

          <motion.p
            className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Share files instantly with peer-to-peer connections. No uploads, no
            limits, just direct transfers.
          </motion.p>
        </motion.div>

        {/* Features */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="text-center p-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Lightning Fast
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Direct peer-to-peer transfers with no server bottlenecks
            </p>
          </div>

          <div className="text-center p-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Secure & Private
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              End-to-end encrypted transfers, no data stored on servers
            </p>
          </div>

          <div className="text-center p-6">
            <div className="bg-gradient-to-br from-pink-500 to-pink-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              No Limits
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Share files of any size without restrictions
            </p>
          </div>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="w-[400px] backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-white/20 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                Start Sharing
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Create a room or join an existing one to begin file sharing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={handleCreateRoom}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create a New Room
                </Button>
              </motion.div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-900 px-3 text-gray-500 dark:text-gray-400 font-medium">
                    Or join a room
                  </span>
                </div>
              </div>

              <div className="flex w-full items-center space-x-3">
                <Input
                  type="text"
                  placeholder="Enter Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="flex-1 h-12 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                />
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleJoinRoom}
                    className="h-12 px-6 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 hover:from-gray-900 hover:to-black dark:hover:from-gray-600 dark:hover:to-gray-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Built with modern web technologies for seamless file sharing
          </p>
        </motion.div>
      </div>
    </div>
  )
}
