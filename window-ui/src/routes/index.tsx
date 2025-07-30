import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
// import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

// Connect to your signaling server
const socket = io('http://localhost:8080')

export const Route = createFileRoute('/')({
  component: Home,
})

export default function Home() {
  const [roomId, setRoomId] = useState('')
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleCreateRoom = () => {
    socket.emit('create-room', (newRoomId: string) => {
      toast({
        title: 'Room Created!',
        description: `Your room ID is: ${newRoomId}`,
      })
      navigate(`/room/${newRoomId}`)
    })
  }

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      socket.emit(
        'join-room',
        roomId,
        (response: { error?: boolean; message?: string }) => {
          if (response.error) {
            toast({
              variant: 'destructive',
              title: 'Error joining room',
              description: response.message,
            })
          } else {
            navigate(`/room/${roomId}`)
          }
        },
      )
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid Room ID',
        description: 'Please enter a valid room ID to join.',
      })
    }
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>P2P File Share</CardTitle>
          <CardDescription>
            Create a room or join an existing one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleCreateRoom} className="w-full">
            Create a New Room
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or join a room
              </span>
            </div>
          </div>
          <div className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <Button onClick={handleJoinRoom}>Join</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
