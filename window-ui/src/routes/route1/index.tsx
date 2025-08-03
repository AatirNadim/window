import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/route1/")({
  component: Route1Component,
})

function Route1Component() {
  return "this is the route1 component"
}
