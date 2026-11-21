import { useEffect, useState } from "react"
import { useReducedMotion } from "framer-motion"

const WINDOW_SIZE = 1200
const CELL_SIZE = 20
const ANIMATION_CYCLE = 96
const FILL_CYCLE = 24
const GROUP_INTERVAL = 1.5
const gridLines = Array.from({ length: WINDOW_SIZE / CELL_SIZE }, (_, index) => {
  const position = index * CELL_SIZE
  return `M ${position} 0 V ${WINDOW_SIZE} M 0 ${position} H ${WINDOW_SIZE}`
}).join(" ")

const paletteColors = [
  "var(--window-cell-ink)",
  "var(--window-cell-blue)",
  "var(--window-cell-teal)",
  "var(--window-cell-mint)",
  "var(--window-cell-pink)",
]

const createHighlightCells = () => {
  let seed = 20261121
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const occupied = new Set<number>()
  const cells: { x: number; y: number; color: number; group: number }[] = []

  for (let group = 0; group < FILL_CYCLE / GROUP_INTERVAL; group += 1) {
    const colors = [0, 1, 2, 3, 4]
    for (let index = colors.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1))
      const currentColor = colors[index]
      colors[index] = colors[swapIndex]
      colors[swapIndex] = currentColor
    }

    for (const color of colors) {
      let position = Math.floor(random() * (WINDOW_SIZE / CELL_SIZE) ** 2)
      while (occupied.has(position)) {
        position = (position + 1) % (WINDOW_SIZE / CELL_SIZE) ** 2
      }
      occupied.add(position)
      const cellsPerRow = WINDOW_SIZE / CELL_SIZE
      cells.push({
        x: (position % cellsPerRow) * CELL_SIZE,
        y: Math.floor(position / cellsPerRow) * CELL_SIZE,
        color,
        group,
      })
    }

  }

  return cells
}

const highlightCells = createHighlightCells()

export default function InfiniteWindowBackground() {
  const prefersReducedMotion = useReducedMotion()
  const isStatic = prefersReducedMotion !== false
  const [fillsStarted, setFillsStarted] = useState(false)

  useEffect(() => {
    if (isStatic) return
    const timer = window.setTimeout(() => setFillsStarted(true), 2000)
    return () => window.clearTimeout(timer)
  }, [isStatic])

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern
          id="infinite-window-grid"
          width={WINDOW_SIZE}
          height={WINDOW_SIZE}
          patternUnits="userSpaceOnUse"
        >
          {!isStatic && (
            <animateTransform
              attributeName="patternTransform"
              type="translate"
              from="0 0"
              to={`${CELL_SIZE} ${CELL_SIZE}`}
              dur={`${ANIMATION_CYCLE}s`}
              repeatCount="indefinite"
            />
          )}
          <path d={gridLines} fill="none" stroke="var(--window-grid-line)" strokeWidth="1" />
          {highlightCells.map(({ x, y, color, group }, index) => (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill={paletteColors[color]}
              opacity={0}
            >
              {!isStatic && fillsStarted && (
                <animate
                  attributeName="opacity"
                  values="0.18;0.18;0;0;0.18"
                  keyTimes="0;0.01;0.08;0.95;1"
                  dur={`${FILL_CYCLE}s`}
                  repeatCount="indefinite"
                  begin={`${group * GROUP_INTERVAL}s`}
                  calcMode="linear"
                  id={`window-cell-fill-${index}`}
                />
              )}
            </rect>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#infinite-window-grid)" />
    </svg>
  )
}
