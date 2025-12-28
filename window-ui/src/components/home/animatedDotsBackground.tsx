import { useEffect, useRef, useCallback } from "react"
import { useTheme } from "../theme-provider"

interface Dot {
  x: number
  y: number
  baseX: number
  baseY: number
  vx: number
  vy: number
  radius: number
  opacity: number
}

const AnimatedDotsBackground = () => {
  const { theme } = useTheme()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dotsRef = useRef<Dot[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const animationFrameRef = useRef<number | null>(null)

  const DOT_COUNT = 80
  const DOT_RADIUS = 2
  const MOUSE_RADIUS = 120
  const RETURN_SPEED = 0.008
  const RANDOM_MOVEMENT = 0.15
  const dotColor = theme === "dark" ? "59, 130, 246" : "37, 99, 235" // blue-500 for dark, blue-600 for light

  const initDots = useCallback((width: number, height: number) => {
    const dots: Dot[] = []
    for (let i = 0; i < DOT_COUNT; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      dots.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * RANDOM_MOVEMENT,
        vy: (Math.random() - 0.5) * RANDOM_MOVEMENT,
        radius: DOT_RADIUS + Math.random() * 1.5,
        opacity: 0.3 + Math.random() * 0.4,
      })
    }
    return dots
  }, [])

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    dotsRef.current.forEach((dot) => {
      dot.vx += (Math.random() - 0.5) * 0.02
      dot.vy += (Math.random() - 0.5) * 0.02
      dot.vx *= 0.96
      dot.vy *= 0.96

      const dx = mouseRef.current.x - dot.x
      const dy = mouseRef.current.y - dot.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < MOUSE_RADIUS && distance > 0) {
        const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS
        dot.vx += (dx / distance) * force * 0.15
        dot.vy += (dy / distance) * force * 0.15
      }

      if (distance >= MOUSE_RADIUS) {
        dot.vx += (dot.baseX - dot.x) * RETURN_SPEED
        dot.vy += (dot.baseY - dot.y) * RETURN_SPEED
      }

      dot.x += dot.vx
      dot.y += dot.vy

      if (dot.x < 0) dot.x = width
      if (dot.x > width) dot.x = 0
      if (dot.y < 0) dot.y = height
      if (dot.y > height) dot.y = 0

      ctx.beginPath()
      ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${dotColor}, ${dot.opacity})`
      ctx.fill()
    })

    dotsRef.current.forEach((dot, i) => {
      dotsRef.current.slice(i + 1).forEach((otherDot) => {
        const dx = dot.x - otherDot.x
        const dy = dot.y - otherDot.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 100) {
          ctx.beginPath()
          ctx.moveTo(dot.x, dot.y)
          ctx.lineTo(otherDot.x, otherDot.y)
          ctx.strokeStyle = `rgba(${dotColor}, ${0.1 * (1 - distance / 100)})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      })
    })

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [theme])

  const resizeCanvas = useCallback(
    (canvas: HTMLCanvasElement) => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      dotsRef.current = initDots(canvas.width, canvas.height)
    },
    [initDots],
  )

  const handleMouseMove = (e: MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseLeave = () => {
    mouseRef.current = { x: -1000, y: -1000 }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    resizeCanvas(canvas)
    window.addEventListener("resize", () => resizeCanvas(canvas))
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseleave", handleMouseLeave)

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("resize", () => resizeCanvas(canvas))
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseleave", handleMouseLeave)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [initDots, animate, resizeCanvas])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ background: "transparent" }}
    />
  )
}

export default AnimatedDotsBackground
