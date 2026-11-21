import { useEffect, useRef } from "react"

type Dot = {
  x: number
  y: number
  radius: number
  offsetX: number
  offsetY: number
  opacity: number
}

const AnimatedDotsBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    const context = canvas?.getContext("2d", { alpha: true })
    if (!canvas || !container || !context) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const finePointer = window.matchMedia("(pointer: fine)")
    const dots: Dot[] = []
    let width = 0
    let height = 0
    let pixelRatio = 1
    let pointerX = -1
    let pointerY = -1
    let pointerActive = false
    let frame: number | null = null

    const draw = () => {
      frame = null
      context.clearRect(0, 0, width, height)

      const canRespond = !reduceMotion.matches && finePointer.matches && pointerActive
      let stillMoving = false

      for (const dot of dots) {
        let targetX = 0
        let targetY = 0
        let targetOpacity = 0.105

        if (canRespond) {
          const dx = dot.x - pointerX
          const dy = dot.y - pointerY
          const distance = Math.hypot(dx, dy)
          const influence = Math.max(0, 1 - distance / 156)

          if (influence > 0) {
            const direction = distance === 0 ? 0 : 1 / distance
            targetX = dx * direction * influence * 3.5
            targetY = dy * direction * influence * 3.5
            targetOpacity += influence * 0.1
          }
        }

        dot.offsetX += (targetX - dot.offsetX) * 0.18
        dot.offsetY += (targetY - dot.offsetY) * 0.18
        dot.opacity += (targetOpacity - dot.opacity) * 0.18

        if (
          Math.abs(targetX - dot.offsetX) > 0.08 ||
          Math.abs(targetY - dot.offsetY) > 0.08 ||
          Math.abs(targetOpacity - dot.opacity) > 0.004
        ) {
          stillMoving = true
        }

        context.globalAlpha = dot.opacity
        context.beginPath()
        context.arc(dot.x + dot.offsetX, dot.y + dot.offsetY, dot.radius, 0, Math.PI * 2)
        context.fill()
      }

      context.globalAlpha = 1
      if (stillMoving) frame = window.requestAnimationFrame(draw)
    }

    const scheduleDraw = () => {
      if (frame === null) frame = window.requestAnimationFrame(draw)
    }

    const resize = () => {
      const rect = container.getBoundingClientRect()
      width = rect.width
      height = rect.height
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#2f4a63"

      const count = Math.max(18, Math.min(48, Math.round((width * height) / 24000)))
      dots.length = 0
      for (let index = 0; index < count; index += 1) {
        dots.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 0.8 + Math.random() * 0.45,
          offsetX: 0,
          offsetY: 0,
          opacity: 0.105,
        })
      }
      scheduleDraw()
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (reduceMotion.matches || !finePointer.matches || event.pointerType === "touch") return
      const rect = container.getBoundingClientRect()
      pointerX = event.clientX - rect.left
      pointerY = event.clientY - rect.top
      pointerActive = pointerX >= 0 && pointerY >= 0 && pointerX <= width && pointerY <= height
      scheduleDraw()
    }

    const handlePointerLeave = () => {
      pointerActive = false
      scheduleDraw()
    }

    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) handlePointerLeave()
    }

    const handlePreferenceChange = () => {
      if (reduceMotion.matches || !finePointer.matches) pointerActive = false
      scheduleDraw()
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerout", handlePointerOut)
    reduceMotion.addEventListener("change", handlePreferenceChange)
    finePointer.addEventListener("change", handlePreferenceChange)

    const themeObserver = new MutationObserver(() => {
      context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#2f4a63"
      scheduleDraw()
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    resize()

    return () => {
      resizeObserver.disconnect()
      themeObserver.disconnect()
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerout", handlePointerOut)
      reduceMotion.removeEventListener("change", handlePreferenceChange)
      finePointer.removeEventListener("change", handlePreferenceChange)
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 h-full w-full" />
}

export default AnimatedDotsBackground
