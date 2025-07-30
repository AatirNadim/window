import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/route1/anotherRoute')({
  component: RouteComponent,
})

function RouteComponent() {
  return 'this is the route1 anotherRoute component'
}
