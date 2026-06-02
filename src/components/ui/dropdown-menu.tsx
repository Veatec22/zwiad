import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import * as React from 'react'

import { Icons } from '@/config/icons'
import { cn } from '@/lib/utils'

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  )
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  const [pillState, setPillState] = React.useState<{
    top: number
    height: number
    opacity: number
    variant: 'default' | 'destructive' | 'warning'
  }>({ top: 0, height: 0, opacity: 0, variant: 'default' })

  const updatePillFromEl = React.useCallback((el: HTMLElement | null) => {
    if (!el) {
      setPillState((prev) => ({ ...prev, opacity: 0 }))
      return
    }
    if (el.hasAttribute('data-disabled')) {
      setPillState((prev) => ({ ...prev, opacity: 0 }))
      return
    }

    const variant =
      (el.getAttribute('data-variant') as
        | 'default'
        | 'destructive'
        | 'warning'
        | null) ?? 'default'

    setPillState({
      top: el.offsetTop,
      height: el.offsetHeight,
      opacity: 1,
      variant,
    })
  }, [])

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null
      const el = target?.closest<HTMLElement>(
        '[data-slot="dropdown-menu-item"],[data-slot="dropdown-menu-checkbox-item"],[data-slot="dropdown-menu-radio-item"],[data-slot="dropdown-menu-sub-trigger"]',
      )
      updatePillFromEl(el ?? null)
    },
    [updatePillFromEl],
  )

  const handleFocusIn = React.useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null
      const el = target?.closest<HTMLElement>(
        '[data-slot="dropdown-menu-item"],[data-slot="dropdown-menu-checkbox-item"],[data-slot="dropdown-menu-radio-item"],[data-slot="dropdown-menu-sub-trigger"]',
      )
      updatePillFromEl(el ?? null)
    },
    [updatePillFromEl],
  )

  const handleMouseLeave = React.useCallback(() => {
    setPillState((prev) => ({ ...prev, opacity: 0 }))
  }, [])

  const pillClasses =
    pillState.variant === 'destructive'
      ? 'bg-tertiary border-destructive'
      : pillState.variant === 'warning'
        ? 'bg-tertiary border-warning'
        : 'bg-tertiary border-tertiary-foreground'

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'relative z-[160] flex max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) flex-col overflow-x-hidden overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        onPointerMove={handlePointerMove}
        onFocus={handleFocusIn}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <div
          className={cn(
            'pointer-events-none absolute left-0 right-0 -z-10 rounded-md border transition-all duration-150 ease-out',
            pillClasses,
          )}
          style={{
            top: pillState.top,
            height: pillState.height,
            opacity: pillState.opacity,
          }}
        />
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  )
}

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
    variant?: 'default' | 'destructive' | 'warning'
  }
>(({ className, inset, variant = 'default', ...props }, ref) => {
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "relative z-10 flex cursor-default select-none items-center gap-2 rounded-md bg-transparent px-2 py-1.5 text-sm outline-hidden data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-transparent data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive data-[variant=warning]:text-warning data-[variant=warning]:*:[svg]:!text-warning [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
})
DropdownMenuItem.displayName = 'DropdownMenuItem'

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "relative z-10 flex cursor-default select-none items-center gap-2 rounded-md bg-transparent py-1.5 pr-2 pl-8 text-sm outline-hidden data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-transparent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Icons.check className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative z-10 flex cursor-default select-none items-center gap-2 rounded-md bg-transparent py-1.5 pr-2 pl-8 text-sm outline-hidden data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-transparent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Icons.radioIndicator className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        'px-2 py-1.5 text-sm font-medium data-[inset]:pl-8',
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        'text-muted-foreground ml-auto text-xs tracking-widest',
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        'relative z-10 flex cursor-default select-none items-center rounded-md bg-transparent px-2 py-1.5 text-sm outline-hidden data-[highlighted]:bg-transparent data-[inset]:pl-8 data-[state=open]:bg-transparent',
        className,
      )}
      {...props}
    >
      {children}
      <Icons.chevronRight className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  const [pillState, setPillState] = React.useState<{
    top: number
    height: number
    opacity: number
    variant: 'default' | 'destructive'
  }>({ top: 0, height: 0, opacity: 0, variant: 'default' })

  const updatePillFromEl = React.useCallback((el: HTMLElement | null) => {
    if (!el) {
      setPillState((prev) => ({ ...prev, opacity: 0 }))
      return
    }
    if (el.hasAttribute('data-disabled')) {
      setPillState((prev) => ({ ...prev, opacity: 0 }))
      return
    }

    const variant =
      (el.getAttribute('data-variant') as 'default' | 'destructive' | null) ??
      'default'

    setPillState({
      top: el.offsetTop,
      height: el.offsetHeight,
      opacity: 1,
      variant,
    })
  }, [])

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null
      const el = target?.closest<HTMLElement>(
        '[data-slot="dropdown-menu-item"],[data-slot="dropdown-menu-checkbox-item"],[data-slot="dropdown-menu-radio-item"],[data-slot="dropdown-menu-sub-trigger"]',
      )
      updatePillFromEl(el ?? null)
    },
    [updatePillFromEl],
  )

  const handleFocusIn = React.useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null
      const el = target?.closest<HTMLElement>(
        '[data-slot="dropdown-menu-item"],[data-slot="dropdown-menu-checkbox-item"],[data-slot="dropdown-menu-radio-item"],[data-slot="dropdown-menu-sub-trigger"]',
      )
      updatePillFromEl(el ?? null)
    },
    [updatePillFromEl],
  )

  const handleMouseLeave = React.useCallback(() => {
    setPillState((prev) => ({ ...prev, opacity: 0 }))
  }, [])

  const pillClasses =
    pillState.variant === 'destructive'
      ? 'bg-destructive/10 border-destructive/30'
      : 'bg-foreground/5 border-foreground/10'

  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        'relative z-[160] flex min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) flex-col overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      onPointerMove={handlePointerMove}
      onFocus={handleFocusIn}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <div
        className={cn(
          'absolute left-0 right-0 rounded-none border -z-10 transition-all duration-150 ease-out pointer-events-none',
          pillClasses,
        )}
        style={{
          top: pillState.top,
          height: pillState.height,
          opacity: pillState.opacity,
        }}
      />
      {children}
    </DropdownMenuPrimitive.SubContent>
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
