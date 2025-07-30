import { createFileRoute } from '@tanstack/react-router'

const Aatir = () => {
  const { aatir } = Route.useParams()

  return <div>Aatir Component {aatir}</div>
}

export const Route = createFileRoute('/test/$aatir')({
  component: Aatir,
})
