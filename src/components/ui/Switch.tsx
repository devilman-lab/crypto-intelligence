import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/cn'

export function Switch({ checked, onCheckedChange, disabled, className }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean; className?: string }) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full border border-border-strong bg-surface-3 transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent disabled:opacity-50',
        className
      )}
    >
      <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-fg transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-accent-fg" />
    </SwitchPrimitive.Root>
  )
}
