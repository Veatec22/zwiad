'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        'group flex w-full items-center justify-between gap-2 transition-colors',

        'text-xs font-medium whitespace-nowrap outline-none',

        'rounded-[7px] border border-border bg-secondary',

        'h-8 px-3 py-1.5',

        'hover:bg-tertiary hover:border-foreground hover:text-tertiary-foreground-hover',

        'focus-visible:outline-none focus-visible:bg-tertiary focus-visible:border-foreground focus-visible:text-tertiary-foreground-hover',

        'data-[state=open]:bg-tertiary data-[state=open]:border-foreground data-[state=open]:text-tertiary-foreground-hover',

        '[&:not([data-placeholder])]:border-foreground',
        '[&:not([data-placeholder])]:bg-tertiary',
        '[&:not([data-placeholder])]:text-tertiary-foreground-hover',

        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",

        'data-[placeholder]:text-tertiary-foreground [&_svg]:opacity-100',

        'data-[state=open]_[&_svg]:opacity-100 data-[state=open]_[&_svg]:text-tertiary-foreground-hover',
        '[&:not([data-placeholder])_svg]:opacity-100 [&:not([data-placeholder])_svg]:text-tertiary-foreground-hover',

        'disabled:cursor-not-allowed disabled:opacity-50',

        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const [pillState, setPillState] = React.useState<{
    top: number
    height: number
    opacity: number
  }>({ top: 0, height: 0, opacity: 0 })

  const updatePillFromEl = React.useCallback((el: HTMLElement | null) => {
    if (!el) {
      setPillState((prev) => ({ ...prev, opacity: 0 }))
      return
    }
    if (el.hasAttribute('data-disabled')) {
      setPillState((prev) => ({ ...prev, opacity: 0 }))
      return
    }

    setPillState({
      top: el.offsetTop,
      height: el.offsetHeight,
      opacity: 1,
    })
  }, [])

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null
      const el = target?.closest<HTMLElement>('[data-slot="select-item"]')
      updatePillFromEl(el ?? null)
    },
    [updatePillFromEl],
  )

  const handleFocusIn = React.useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null
      const el = target?.closest<HTMLElement>('[data-slot="select-item"]')
      updatePillFromEl(el ?? null)
    },
    [updatePillFromEl],
  )

  const handleMouseLeave = React.useCallback(() => {
    setPillState((prev) => ({ ...prev, opacity: 0 }))
  }, [])

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          'relative z-[160] max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1 relative z-0',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1',
          )}
          onPointerMove={handlePointerMove}
          onFocus={handleFocusIn}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="pointer-events-none absolute left-0 right-0 -z-10 mx-1 rounded-md border border-foreground/10 bg-foreground/5 transition-all duration-150 ease-out"
            style={{
              top: pillState.top,
              height: pillState.height,
              opacity: pillState.opacity,
            }}
          />
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('text-muted-foreground px-2 py-1.5 text-xs', className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        // ZMIANA:
        // 1. "text-sm" -> "text-xs" (zmniejszenie czcionki)
        // 2. Dodano "font-medium" (pogrubienie)
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-xs font-medium outline-hidden focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        'bg-transparent focus:bg-transparent',
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('bg-border pointer-events-none -mx-1 my-1 h-px', className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
