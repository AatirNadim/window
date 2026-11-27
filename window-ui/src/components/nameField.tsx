import { Shuffle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { generateRandomUsername } from "@/store/userStore"

export function NameField({ value, onChange, error, id = "user-name" }: {
  value: string
  onChange: (value: string) => void
  error?: string
  id?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-foreground">Your name</label>
      <div className="flex gap-2">
        <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} maxLength={64}
          placeholder="Enter your name" autoComplete="nickname" aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : `${id}-hint`} className="h-11 bg-background/80" />
        <Button type="button" variant="outline" className="h-11 gap-2" onClick={() => onChange(generateRandomUsername())}>
          <Shuffle size={15} /> Randomize
        </Button>
      </div>
      {error ? <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p> :
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">This is how others in the room will see you.</p>}
    </div>
  )
}
