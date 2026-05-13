'use client'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  fill?: string
  strokeWidth?: number
}

export function Sparkline({
  data,
  width = 120,
  height = 40,
  color = '#29ABE2',
  fill,
  strokeWidth = 2,
}: SparklineProps) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 2

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2)
    const y = pad + ((max - v) / range) * (height - pad * 2)
    return `${x},${y}`
  })

  const pathD = `M ${points.join(' L ')}`

  // Fill area
  const fillPath = `M ${points[0]} L ${points.join(' L ')} L ${width - pad},${height - pad} L ${pad},${height - pad} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {fill && (
        <path d={fillPath} fill={fill} />
      )}
      <path d={pathD} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      {(() => {
        const last = points[points.length - 1].split(',')
        return (
          <circle cx={last[0]} cy={last[1]} r={3} fill={color} />
        )
      })()}
    </svg>
  )
}

// ── Mini bar chart ────────────────────────────────────────────────────────────
interface MiniBarProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  highlightLast?: boolean
}

export function MiniBar({
  data,
  width = 120,
  height = 40,
  color = '#29ABE2',
  highlightLast = true,
}: MiniBarProps) {
  if (data.length === 0) return null

  const max = Math.max(...data) || 1
  const barW = (width / data.length) * 0.65
  const gap = (width / data.length) * 0.35

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((v, i) => {
        const barH = (v / max) * (height - 4)
        const x = i * (barW + gap) + gap / 2
        const y = height - barH - 2
        const isLast = i === data.length - 1
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={barH}
            rx={2}
            fill={highlightLast && isLast ? color : `${color}55`}
          />
        )
      })}
    </svg>
  )
}

// ── Donut / ring chart ────────────────────────────────────────────────────────
interface RingProps {
  pct: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  label?: string
  sublabel?: string
}

export function Ring({
  pct,
  size = 80,
  strokeWidth = 8,
  color = '#29ABE2',
  trackColor = '#E2ECF4',
  label,
  sublabel,
}: RingProps) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label && <span className="text-[13px] font-black text-[#0C1F2C] leading-none">{label}</span>}
          {sublabel && <span className="text-[9px] text-[#8BA5BE] font-medium mt-0.5">{sublabel}</span>}
        </div>
      )}
    </div>
  )
}
