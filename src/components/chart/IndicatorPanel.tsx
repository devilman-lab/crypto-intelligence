import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { SlidersHorizontal } from 'lucide-react'
import { useChartStore } from '@/stores/chartStore'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { cn } from '@/lib/cn'

const MA_PRESETS = [9, 20, 50, 100, 200]

function Row({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span>
        <span className="text-xs">{label}</span>
        {hint && <span className="ml-1.5 text-[10px] text-fg-subtle">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

/** Popover with toggles for every indicator; state lives in chartStore. */
export function IndicatorPanel() {
  const { indicators, setIndicators, toggleMa, reset } = useChartStore()
  const [open, setOpen] = useState(false)
  const count = indicators.sma.length + indicators.ema.length + Number(indicators.bollinger) + Number(indicators.vwap) + Number(indicators.rsi) + Number(indicators.macd) + Number(indicators.stochastic) + Number(indicators.atr)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button size="sm" variant="ghost" aria-label="Indicators">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Indicators {count > 0 && <span className="num rounded-sm bg-accent-soft px-1 text-[10px] text-accent">{count}</span>}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-40 w-72 rounded-lg border border-border bg-surface p-3 shadow-2xl focus:outline-none">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">Overlays</div>
          <div className="py-1">
            <div className="mb-1 text-xs">Simple moving averages</div>
            <div className="flex flex-wrap gap-1">
              {MA_PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => toggleMa('sma', p)} className={cn('num h-6 rounded-sm border px-2 text-[11px]', indicators.sma.includes(p) ? 'border-accent bg-accent-soft text-accent' : 'border-border text-fg-muted hover:text-fg')}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="py-1">
            <div className="mb-1 text-xs">Exponential moving averages</div>
            <div className="flex flex-wrap gap-1">
              {MA_PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => toggleMa('ema', p)} className={cn('num h-6 rounded-sm border px-2 text-[11px]', indicators.ema.includes(p) ? 'border-accent bg-accent-soft text-accent' : 'border-border text-fg-muted hover:text-fg')}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Row label="Bollinger Bands" hint="20, 2σ" checked={indicators.bollinger} onChange={(bollinger) => setIndicators({ bollinger })} />
          <Row label="VWAP" hint="daily reset" checked={indicators.vwap} onChange={(vwap) => setIndicators({ vwap })} />
          <Row label="Volume" checked={indicators.volume} onChange={(volume) => setIndicators({ volume })} />
          <div className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">Oscillators</div>
          <Row label="RSI" hint="14" checked={indicators.rsi} onChange={(rsi) => setIndicators({ rsi })} />
          <Row label="MACD" hint="12, 26, 9" checked={indicators.macd} onChange={(macd) => setIndicators({ macd })} />
          <Row label="Stochastic" hint="14, 3, 3" checked={indicators.stochastic} onChange={(stochastic) => setIndicators({ stochastic })} />
          <Row label="ATR" hint="14" checked={indicators.atr} onChange={(atr) => setIndicators({ atr })} />
          <div className="mt-2 flex justify-end">
            <Button size="xs" variant="ghost" onClick={reset}>
              Reset to defaults
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
