import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface Column<T> {
  key: string
  header: ReactNode
  /** CSS width (e.g. '120px', '1fr', 'minmax(160px,2fr)'). */
  width: string
  align?: 'left' | 'right' | 'center'
  render: (row: T) => ReactNode
  /** Value used for sorting; omit to make the column unsortable. */
  sortValue?: (row: T) => number | string | null
  title?: string
}

export interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  rowHeight?: number
  sort?: SortState | null
  onSortChange?: (s: SortState | null) => void
  defaultSort?: SortState
  onRowClick?: (row: T) => void
  emptyMessage?: ReactNode
  className?: string
}

/**
 * Dense, virtualized, sortable table. Rows are rendered with CSS grid so
 * header and body columns stay aligned; only visible rows exist in the DOM.
 */
export function VirtualTable<T>({ columns, rows, rowKey, rowHeight = 36, sort, onSortChange, defaultSort, onRowClick, emptyMessage = 'No rows.', className }: Props<T>) {
  const [internalSort, setInternalSort] = useState<SortState | null>(defaultSort ?? null)
  const activeSort = sort === undefined ? internalSort : sort
  const setSort = onSortChange ?? setInternalSort

  const sorted = useMemo(() => {
    if (!activeSort) return rows
    const col = columns.find((c) => c.key === activeSort.key)
    if (!col?.sortValue) return rows
    const sv = col.sortValue
    const dir = activeSort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = sv(a)
      const vb = sv(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'string' || typeof vb === 'string') return String(va).localeCompare(String(vb)) * dir
      return (va - vb) * dir
    })
  }, [rows, columns, activeSort])

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10
  })

  const template = columns.map((c) => c.width).join(' ')

  const toggleSort = (col: Column<T>) => {
    if (!col.sortValue) return
    if (activeSort?.key !== col.key) setSort({ key: col.key, dir: 'desc' })
    else if (activeSort.dir === 'desc') setSort({ key: col.key, dir: 'asc' })
    else setSort(null)
  }

  return (
    <div className={cn('flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface', className)}>
      <div className="grid shrink-0 border-b border-border bg-surface-2 text-[11px] font-medium uppercase tracking-wide text-fg-muted" style={{ gridTemplateColumns: template }}>
        {columns.map((c) => {
          const active = activeSort?.key === c.key
          return (
            <button
              key={c.key}
              type="button"
              title={c.title}
              onClick={() => toggleSort(c)}
              disabled={!c.sortValue}
              className={cn(
                'flex h-8 items-center gap-1 px-2 disabled:cursor-default',
                c.align === 'right' ? 'justify-end text-right' : c.align === 'center' ? 'justify-center' : 'justify-start',
                c.sortValue && 'hover:text-fg',
                active && 'text-fg'
              )}
            >
              <span className="truncate">{c.header}</span>
              {active && (activeSort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
            </button>
          )
        })}
      </div>
      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-xs text-fg-muted">{emptyMessage}</div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((v) => {
              const row = sorted[v.index]!
              return (
                <div
                  key={rowKey(row)}
                  role={onRowClick ? 'button' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      onRowClick(row)
                    }
                  }}
                  className={cn('absolute left-0 grid w-full items-center border-b border-border/60 text-[12.5px]', onRowClick && 'cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-2')}
                  style={{ gridTemplateColumns: template, height: v.size, transform: `translateY(${v.start}px)` }}
                >
                  {columns.map((c) => (
                    <div key={c.key} className={cn('min-w-0 truncate px-2', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center')}>
                      {c.render(row)}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
