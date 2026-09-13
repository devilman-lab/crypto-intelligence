import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AssetMetrics, Ticker } from '@shared/types'
import { squarify } from '@/lib/treemap'
import { useUiStore } from '@/stores/uiStore'
import { Tooltip } from '@/components/ui/Tooltip'
import { formatCompactCurrency, formatPercent } from '@/lib/format'

export type VolPeriod = 'vol24h' | 'vol7d' | 'vol30d'

interface Props {
  rows: { ticker: Ticker; metrics: AssetMetrics }[]
  period: VolPeriod
  max?: number
  className?: string
}

/** Maps annualised volatility (fraction) to a colour: calm blue → hot orange/red. */
export function volColor(vol: number | null): string {
  if (vol == null) return 'var(--surface-3)'
  const stops: [number, [number, number, number]][] = [
    [0.2, [37, 99, 235]], // blue
    [0.5, [22, 163, 74]], // green
    [0.8, [234, 179, 8]], // yellow
    [1.2, [249, 115, 22]], // orange
    [2.0, [220, 38, 38]] // red
  ]
  const v = Math.min(Math.max(vol, stops[0]![0]), stops[stops.length - 1]![0])
  for (let i = 1; i < stops.length; i++) {
    const [v0, c0] = stops[i - 1]!
    const [v1, c1] = stops[i]!
    if (v <= v1) {
      const t = (v - v0) / (v1 - v0)
      const c = c0.map((a, k) => Math.round(a + (c1[k]! - a) * t))
      return `rgb(${c[0]} ${c[1]} ${c[2]} / 0.85)`
    }
  }
  return 'rgb(220 38 38 / 0.85)'
}

/** Treemap: tile area = market cap, colour = realised volatility. */
export function VolatilityHeatmap({ rows, period, max = 60, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const navigate = useUiStore((s) => s.navigate)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      if (e) setSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const rects = useMemo(() => {
    const items = rows
      .filter((r) => (r.ticker.marketCap ?? 0) > 0)
      .sort((a, b) => (b.ticker.marketCap ?? 0) - (a.ticker.marketCap ?? 0))
      .slice(0, max)
      .map((r) => ({ weight: Math.sqrt(r.ticker.marketCap ?? 0), data: r }))
    return squarify(items, size.w, size.h)
  }, [rows, size, max])

  return (
    <div ref={ref} className={className} style={{ position: 'relative' }}>
      {rects.map((r) => {
        const vol = r.data.metrics[period]
        const showText = r.w > 44 && r.h > 28
        return (
          <Tooltip
            key={r.data.ticker.assetId}
            content={
              <div className="space-y-0.5">
                <div className="font-semibold">
                  {r.data.ticker.symbol} · {r.data.ticker.name}
                </div>
                <div>Volatility ({period.slice(3)}): {vol != null ? `${(vol * 100).toFixed(1)}%` : '—'}</div>
                <div>Vol change: {formatPercent(r.data.metrics.volChange != null ? r.data.metrics.volChange * 100 : null, 1)}</div>
                <div>Market cap: {formatCompactCurrency(r.data.ticker.marketCap)}</div>
                <div>24h: {formatPercent(r.data.ticker.change24hPct)}</div>
              </div>
            }
          >
            <button
              type="button"
              onClick={() => navigate({ page: 'asset', assetId: r.data.ticker.assetId })}
              className="absolute overflow-hidden border border-bg text-left text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ left: r.x, top: r.y, width: r.w, height: r.h, background: volColor(vol) }}
            >
              {showText && (
                <div className="p-1 leading-tight">
                  <div className="truncate text-[11px] font-semibold drop-shadow">{r.data.ticker.symbol}</div>
                  {r.h > 40 && <div className="num truncate text-[10px] opacity-90">{vol != null ? `${(vol * 100).toFixed(0)}%` : '—'}</div>}
                </div>
              )}
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
