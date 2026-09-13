import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectProps<T extends string> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value: T
  options: readonly SelectOption<T>[]
  onValueChange: (v: T) => void
}

/** Native select with app styling — keyboard-friendly and light-weight. */
export function Select<T extends string>({ value, options, onValueChange, className, ...rest }: SelectProps<T>) {
  return (
    <div className={cn('relative inline-flex', className)}>
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value as T)}
        className="h-7 w-full appearance-none rounded-md border border-border bg-surface-2 pl-2.5 pr-7 text-xs text-fg hover:bg-surface-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
    </div>
  )
}
