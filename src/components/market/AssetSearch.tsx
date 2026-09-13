import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import type { Ticker } from '@shared/types'
import { useMarketStore } from '@/stores/marketStore'
import { Input } from '@/components/ui/Input'
import { AssetCell } from './AssetCell'
import { cn } from '@/lib/cn'

interface Props {
  onSelect: (ticker: Ticker) => void
  exclude?: Set<string>
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

/** Type-ahead asset picker over the loaded market universe. */
export function AssetSearch({ onSelect, exclude, placeholder = 'Add asset…', autoFocus, className }: Props) {
  const tickers = useMarketStore((s) => s.tickers)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeState, setActive] = useState<{ index: number; results: Ticker[] } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = tickers.filter((t) => !exclude?.has(t.assetId))
    if (!q) return pool.slice(0, 8)
    return pool
      .filter((t) => t.symbol.toLowerCase().startsWith(q) || t.name.toLowerCase().includes(q))
      .sort((a, b) => Number(b.symbol.toLowerCase().startsWith(q)) - Number(a.symbol.toLowerCase().startsWith(q)))
      .slice(0, 8)
  }, [tickers, query, exclude])

  const active = activeState && activeState.results === results ? activeState.index : 0
  const setActiveIndex = (fn: (a: number) => number) => setActive({ index: fn(active), results })

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const choose = (t: Ticker) => {
    onSelect(t)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
      <Input
        value={query}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="pl-7"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex((a) => Math.min(a + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault()
            choose(results[active])
          } else if (e.key === 'Escape') setOpen(false)
        }}
        aria-label={placeholder}
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 top-full z-30 mt-1 w-full min-w-[260px] overflow-hidden rounded-md border border-border bg-surface-2 shadow-xl" role="listbox">
          {results.map((t, i) => (
            <li
              key={t.assetId}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive({ index: i, results })}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(t)
              }}
              className={cn('cursor-pointer px-2.5 py-1.5 text-xs', i === active && 'bg-accent-soft')}
            >
              <AssetCell ticker={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
