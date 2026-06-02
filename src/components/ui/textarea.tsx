import type * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-[color:var(--border-input)] placeholder:text-muted-foreground',
        'flex field-sizing-content min-h-16 w-full rounded-[8px] border bg-[color:var(--background-card)] px-3 py-2 text-[13px] transition-colors',
        'focus-visible:border-[color:var(--border-focus)] focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--background-card)]',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
