import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { buttonVariants } from '@/components/ui/button'
import { Icons } from '@/config/icons'
import { cn } from '@/lib/utils'

const dialogOverlayClassName =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[140] bg-black/50 backdrop-blur-sm'

const dialogContentVariants = cva(
  'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-[150] flex w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-xl border p-0 shadow-sm duration-200 sm:max-w-lg',
  {
    variants: {
      variant: {
        default: '',
        destructive: 'border-destructive',
        warning: 'border-warning',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

const dialogTitleVariants = cva('text-lg leading-none font-semibold', {
  variants: {
    variant: {
      default: '',
      destructive: 'text-destructive',
      warning: 'text-warning',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(dialogOverlayClassName, className)}
      {...props}
    />
  )
}

type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof dialogContentVariants> & {
    hideCloseButton?: boolean
    closeLabel?: string
  }

function DialogContent({
  className,
  children,
  variant,
  hideCloseButton = false,
  closeLabel = 'buttons.close',
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-variant={variant}
        className={cn(dialogContentVariants({ variant }), className)}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-foreground/5 data-[state=open]:text-muted-foreground absolute top-4 right-6 rounded-none opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <Icons.close />
            <span className="sr-only">{closeLabel}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        'flex flex-col gap-2 text-center sm:text-left px-6 py-4 border-b',
        className,
      )}
      {...props}
    />
  )
}

function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-body"
      className={cn('flex-1 overflow-y-auto px-6 py-6', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end px-6 py-4 border-t bg-muted/5',
        className,
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title> &
  VariantProps<typeof dialogTitleVariants>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(dialogTitleVariants({ variant }), className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

type DialogActionProps = React.ComponentProps<typeof DialogPrimitive.Close> &
  VariantProps<typeof buttonVariants>

function DialogAction({
  className,
  variant,
  size,
  ...props
}: DialogActionProps) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-action"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

type DialogCancelProps = React.ComponentProps<typeof DialogPrimitive.Close> &
  VariantProps<typeof buttonVariants>

function DialogCancel({
  className,
  variant = 'ghost',
  size,
  ...props
}: DialogCancelProps) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-cancel"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogAction,
  DialogBody,
  DialogCancel,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  dialogContentVariants,
  dialogTitleVariants,
}
