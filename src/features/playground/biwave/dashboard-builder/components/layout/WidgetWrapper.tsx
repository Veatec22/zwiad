import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Icons } from '@/config/icons'
import { cn } from '@/lib/utils'
import { useDashboardStore, type Widget } from '../../chart-engine/store'

interface WidgetWrapperProps {
  widget: Widget
  isSelected: boolean
  children: React.ReactNode
  onSelect: () => void
  className?: string
  disabled?: boolean
}

export function WidgetWrapper({
  widget,
  isSelected,
  children,
  onSelect,
  className,
  disabled = false,
}: WidgetWrapperProps) {
  const { t } = useTranslation()
  const { removeWidget, duplicateWidget } = useDashboardStore()

  const {
    titleFontSize,
    titleBold,
    titleItalic,
    titleUnderline,
    titleColor,
    titleAlign,
    titleHidden,
    titleBackground,
    widgetBackground,
  } = widget.styles || {}

  const showTitle = widget.type !== 'text' && !titleHidden

  return (
    <Card
      className={cn(
        'h-full flex flex-col overflow-hidden transition-shadow',
        isSelected && 'ring-2 ring-primary shadow-lg',
        className,
      )}
      style={
        widgetBackground
          ? {
              backgroundColor: String(widgetBackground),
            }
          : undefined
      }
      onClick={(e) => {
        if (
          (e.target as HTMLElement).closest("button, input, [role='menuitem']")
        ) {
          return
        }
        onSelect()
      }}
    >
      <CardHeader className="p-1 pb-0 flex-shrink-0">
        <div className="flex items-center gap-1">
          <div className="flex-1 min-w-0">
            {showTitle && (
              <span
                className={cn(
                  'block w-full truncate px-1 text-xs transition-all',
                  !titleBold && 'font-medium',
                )}
                style={{
                  fontSize: titleFontSize ? `${titleFontSize}px` : undefined,
                  fontWeight: titleBold ? 'bold' : undefined,
                  fontStyle: titleItalic ? 'italic' : undefined,
                  textDecoration: titleUnderline ? 'underline' : undefined,
                  color: (titleColor as string) ?? undefined,
                  textAlign:
                    (titleAlign as 'left' | 'center' | 'right' | undefined) ??
                    'left',
                  backgroundColor: titleBackground
                    ? String(titleBackground)
                    : undefined,
                }}
              >
                {widget.title}
              </span>
            )}
          </div>

          {!disabled && (
            <div className="drag-handle cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
              <Icons.dragHandle className="h-3 w-3 text-muted-foreground" />
            </div>
          )}

          {!disabled && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                >
                  <Icons.menu className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => duplicateWidget(widget.id)}>
                  <Icons.copy className="mr-2 h-3.5 w-3.5" />
                  <span className="text-xs">
                    {t('widget.duplicate', 'Duplicate')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => removeWidget(widget.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Icons.delete className="mr-2 h-3.5 w-3.5" />
                  <span className="text-xs">
                    {t('widget.delete', 'Delete')}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-1 pt-0.5 flex-1 min-h-0">
        <div className="h-full w-full">{children}</div>
      </CardContent>
    </Card>
  )
}
