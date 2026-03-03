import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface SparklineProps {
  data: number[]
  className?: string
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
  animate?: boolean
  showArea?: boolean
  areaColor?: string
}

export function Sparkline({
  data,
  className,
  width = 80,
  height = 28,
  color = '#6366f1',
  strokeWidth = 1.5,
  animate = true,
  showArea = true,
  areaColor,
}: SparklineProps) {
  const pathRef = useRef<SVGPathElement>(null)
  const areaRef = useRef<SVGPathElement>(null)

  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const padding = strokeWidth + 1

  const points = data.map((val, i) => ({
    x: padding + (i / (data.length - 1)) * (width - padding * 2),
    y: padding + ((max - val) / range) * (height - padding * 2),
  }))

  // Smooth curve using cubic bezier
  const linePath = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x},${pt.y}`
    const prev = points[i - 1]
    const cpx1 = prev.x + (pt.x - prev.x) / 3
    const cpx2 = pt.x - (pt.x - prev.x) / 3
    return `${acc} C ${cpx1},${prev.y} ${cpx2},${pt.y} ${pt.x},${pt.y}`
  }, '')

  const areaPath = `${linePath} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`

  const resolvedAreaColor = areaColor ?? `${color}20`

  useEffect(() => {
    if (!animate || !pathRef.current) return
    const length = pathRef.current.getTotalLength()
    pathRef.current.style.strokeDasharray = `${length}`
    pathRef.current.style.strokeDashoffset = `${length}`
    const timer = setTimeout(() => {
      if (pathRef.current) {
        pathRef.current.style.transition = 'stroke-dashoffset 0.8s ease-out'
        pathRef.current.style.strokeDashoffset = '0'
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [animate, data])

  const lastPt = points[points.length - 1]
  const trend = data[data.length - 1] > data[0]

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
    >
      <defs>
        <linearGradient id={`spark-area-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {showArea && (
        <path
          ref={areaRef}
          d={areaPath}
          fill={`url(#spark-area-${color.replace('#', '')})`}
          stroke="none"
        />
      )}

      <path
        ref={pathRef}
        d={linePath}
        fill="none"
        stroke={trend ? color : '#ef4444'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Endpoint dot */}
      <circle
        cx={lastPt.x}
        cy={lastPt.y}
        r={2.5}
        fill={trend ? color : '#ef4444'}
        className="animate-pulse"
      />
    </svg>
  )
}

// Generate synthetic sparkline data from player trend data
export function generateSparkData(recentVal: number, avgVal: number, points = 6): number[] {
  const data: number[] = []
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1)
    const val = avgVal + (recentVal - avgVal) * t
    // Add small noise
    const noise = (Math.random() - 0.5) * avgVal * 0.05
    data.push(Math.max(0, val + noise))
  }
  // Deterministic: use fixed pseudo-random based on avgVal
  return data
}

export function generateDeterministicSparkData(
  startVal: number,
  endVal: number,
  points = 8,
  seed = 1,
): number[] {
  const data: number[] = []
  let s = seed
  const rand = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1)
    const val = startVal + (endVal - startVal) * t
    const noise = (rand() - 0.5) * Math.abs(endVal - startVal) * 0.3
    data.push(Math.max(0, val + noise))
  }
  return data
}
