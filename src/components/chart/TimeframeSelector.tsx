import { TIMEFRAMES, type Timeframe } from '@shared/types'
import { cn } from '@/lib/cn'

export function TimeframeSelector({ value, onChange, available }: { value: Timeframe; onChange: (t: Timeframe) => void; available?: readonly Timeframe[] }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-surface-2 p-0.5" role="tablist" aria-label="Timeframe">
      {TIMEFRAMES.map((tf) => {
        const enabled = !available || available.includes(tf)
        return (
          <button
            key={tf}
            type="button"
            role="tab"
            aria-selected={value === tf}
            disabled={!enabled}
            onClick={() => onChange(tf)}
            className={cn('h-6 rounded-sm px-2 text-[11px] font-medium transition-colors disabled:opacity-30', value === tf ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:text-fg')}
          >
            {tf}
          </button>
        )
      })}
    </div>
  )
}
