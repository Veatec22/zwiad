import { Search, X } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  search?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, search, ...props }, ref) => {
    // Focus handlers removed as they are no longer needed for search icon logic.
    // If needed for other purposes, they can be re-added.

    const hasContent = props.value !== undefined && props.value !== ''
    const showSlash = hasContent

    const inputElement = (
      <input
        type={type}
        className={cn(
          'flex w-full text-xs font-medium transition-colors',
          'h-8 rounded-[7px] border border-border bg-secondary px-3 py-1.5',
          'hover:bg-tertiary hover:border-foreground hover:text-tertiary-foreground-hover',
          'focus-visible:outline-none focus-visible:bg-tertiary focus-visible:border-foreground focus-visible:text-tertiary-foreground-hover',
          '[&:not(:placeholder-shown)]:border-foreground',
          '[&:not(:placeholder-shown)]:bg-tertiary',
          '[&:not(:placeholder-shown)]:text-tertiary-foreground-hover',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-tertiary-foreground',
          'disabled:cursor-not-allowed disabled:opacity-50',
          search && 'pr-9',
          className,
        )}
        ref={ref}
        {...props}
      />
    )

    if (search) {
      return (
        <div className="relative">
          {inputElement}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-4 h-4">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (props.onChange) {
                  const event = {
                    ...e,
                    target: { ...e.target, value: '' },
                    currentTarget: { ...e.currentTarget, value: '' },
                  } as unknown as React.ChangeEvent<HTMLInputElement>
                  props.onChange(event)
                }
                if (ref && typeof ref !== 'function' && ref.current) {
                  ref.current.value = ''
                }
              }}
              className={cn(
                'h-4 w-4 text-muted-foreground hover:text-foreground focus:outline-none absolute transition-opacity duration-300 ease-in-out',
                showSlash ? 'opacity-100' : 'opacity-0 pointer-events-none',
              )}
            >
              <X className="h-4 w-4" />
            </button>
            <Search
              className={cn(
                'h-4 w-4 text-muted-foreground pointer-events-none absolute transition-opacity duration-300 ease-in-out',
                showSlash ? 'opacity-0' : 'opacity-100',
              )}
            />
          </div>
        </div>
      )
    }

    return inputElement
  },
)
Input.displayName = 'Input'

export { Input }
