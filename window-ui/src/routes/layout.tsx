import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ThemeProvider } from '@/components/theme-provider'

export const Route = createFileRoute('/layout')({
  component: RootLayout,
})

function RootLayout() {
  return (
    <ThemeProvider>
      <header className="bg-white dark:bg-gray-900 shadow">
        this is the header
      </header>
      <Outlet />
    </ThemeProvider>
  )
}
