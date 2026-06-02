import * as React from 'react'

import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('grid gap-1.5 p-5', className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      className={cn(
        'text-base font-semibold tracking-normal text-zinc-950 dark:text-zinc-50',
        className,
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'text-sm leading-6 text-zinc-600 dark:text-zinc-400',
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}

export { Card, CardContent, CardDescription, CardHeader, CardTitle }
