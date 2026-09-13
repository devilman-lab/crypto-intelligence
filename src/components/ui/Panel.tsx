import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  actions?: ReactNode
  padded?: boolean
}

/** Standard bordered surface used for every dashboard/detail block. */
export function Panel({ title, actions, padded = true, className, children, ...rest }: PanelProps) {
  return (
    <section className={cn('flex min-h-0 flex-col rounded-lg border border-border bg-surface', className)} {...rest}>
      {(title || actions) && (
        <header className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{title}</h2>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </header>
      )}
      <div className={cn('min-h-0 flex-1', padded && 'p-3')}>{children}</div>
    </section>
  )
}
