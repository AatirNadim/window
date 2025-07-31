import { useUserStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function UserStoreDemo() {
  const { userId, userName, currentRoomId, initializeUser, joinRoom, leaveRoom, clearUser } = useUserStore()

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>User Store Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p><strong>User ID:</strong> {userId || 'None'}</p>
          <p><strong>Username:</strong> {userName || 'None'}</p>
          <p><strong>Current Room:</strong> {currentRoomId || 'None'}</p>
        </div>
        
        <div className="space-y-2">
          <Button onClick={initializeUser} className="w-full">
            Initialize User
          </Button>
          <Button onClick={() => joinRoom('test-room-123')} className="w-full">
            Join Test Room
          </Button>
          <Button onClick={leaveRoom} variant="outline" className="w-full">
            Leave Room
          </Button>
          <Button onClick={clearUser} variant="destructive" className="w-full">
            Clear User
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
