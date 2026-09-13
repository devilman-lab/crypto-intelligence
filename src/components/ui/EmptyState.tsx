import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function EmptyState({ icon: Icon, title, description, action }: { icon?: LucideIcon; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 p-8 text-center">
      {Icon && <Icon className="h-8 w-8 text-fg-subtle" />}
      <div className="text-sm font-medium">{title}</div>
      {description && <div className="max-w-md text-xs text-fg-muted">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
