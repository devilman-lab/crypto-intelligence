import { useMemo, useState } from 'react'
import { formatCompactCurrency } from '@/lib/format'

export interface Slice {
  key: string
  label: string
  value: number
}

/** Categorical palette (colour-blind-safe, distinct on dark and light surfaces). */
const PALETTE = ['#4f8cff', '#16c784', '#f5a524', '#a78bfa', '#2dd4bf', '#f472b6', '#facc15', '#fb7185', '#60a5fa', '#34d399']

interface Props {
  slices: Slice[]
  size?: number
  maxSlices?: number
  className?: string
}

/** SVG donut with legend; small slices are grouped into "Other". */
export function AllocationDonut({ slices, size = 160, maxSlices = 8, className }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const { arcs, total } = useMemo(() => {
    const sorted = [...slices].filter((s) => s.value > 0).sort((a, b) => b.value - a.value)
    const head = sorted.slice(0, maxSlices)
    const rest = sorted.slice(maxSlices)
    const list = rest.length ? [...head, { key: '__other', label: `Other (${rest.length})`, value: rest.reduce((s, x) => s + x.value, 0) }] : head
    const total = list.reduce((s, x) => s + x.value, 0)
    const arcs: (Slice & { start: number; end: number; color: string; pct: number })[] = []
    for (let i = 0, acc = 0; i < list.length; i++) {
      const s = list[i]!
      const start = acc / total
      acc += s.value
      arcs.push({ ...s, start, end: acc / total, color: PALETTE[i % PALETTE.length]!, pct: (s.value / total) * 100 })
    }
    return { arcs, total }
  }, [slices, maxSlices])

  if (total <= 0) return <div className="text-xs text-fg-muted">No priced holdings.</div>
  const r = size / 2
  const stroke = size * 0.22
  const ri = r - stroke / 2
  const circumference = 2 * Math.PI * ri
  const active = arcs.find((a) => a.key === hover) ?? null

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Portfolio allocation">
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx={r}
              cy={r}
              r={ri}
              fill="none"
              stroke={a.color}
              strokeWidth={hover === a.key ? stroke + 4 : stroke}
              strokeDasharray={`${(a.end - a.start) * circumference} ${circumference}`}
              strokeDashoffset={-a.start * circumference}
              transform={`rotate(-90 ${r} ${r})`}
              opacity={hover && hover !== a.key ? 0.4 : 1}
              onMouseEnter={() => setHover(a.key)}
              onMouseLeave={() => setHover(null)}
              style={{ transition: 'stroke-width 120ms, opacity 120ms' }}
            />
          ))}
          <text x={r} y={r - 4} textAnchor="middle" className="fill-fg" style={{ fontSize: 13, fontWeight: 600 }}>
            {active ? `${active.pct.toFixed(1)}%` : formatCompactCurrency(total)}
          </text>
          <text x={r} y={r + 12} textAnchor="middle" className="fill-fg-muted" style={{ fontSize: 10 }}>
            {active ? active.label : 'total'}
          </text>
        </svg>
        <ul className="min-w-0 flex-1 space-y-1 text-xs">
          {arcs.map((a) => (
            <li key={a.key} className="flex items-center gap-2" onMouseEnter={() => setHover(a.key)} onMouseLeave={() => setHover(null)}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: a.color }} />
              <span className="min-w-0 flex-1 truncate">{a.label}</span>
              <span className="num text-fg-muted">{a.pct.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
