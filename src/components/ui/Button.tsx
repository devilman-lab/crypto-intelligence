import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg hover:brightness-110',
        secondary: 'bg-surface-2 text-fg border border-border hover:bg-surface-3',
        ghost: 'text-fg-muted hover:text-fg hover:bg-surface-2',
        outline: 'border border-border-strong text-fg hover:bg-surface-2',
        danger: 'bg-negative-soft text-negative border border-negative/30 hover:bg-negative/20',
        positive: 'bg-positive-soft text-positive border border-positive/30 hover:bg-positive/20'
      },
      size: {
        xs: 'h-6 px-2 text-[11px]',
        sm: 'h-7 px-2.5 text-xs',
        md: 'h-8 px-3 text-[13px]',
        icon: 'h-7 w-7'
      }
    },
    defaultVariants: { variant: 'secondary', size: 'sm' }
  }
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, type = 'button', ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
))
Button.displayName = 'Button'
