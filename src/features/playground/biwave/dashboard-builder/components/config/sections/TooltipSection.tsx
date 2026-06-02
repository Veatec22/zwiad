import { type ComponentProps, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Icons } from '@/config/icons'
import type { StyleOptionDefinition } from '../../../chart-engine/configs/types'
import type { Widget } from '../../../chart-engine/store'
import { ColorPicker } from '../../ColorPicker'
import { StyleOption } from '../common/StyleOption'

interface TooltipSectionProps {
  group: string
  options: StyleOptionDefinition[]
  selectedWidget: Widget
  handleStyleChange: (id: string, value: unknown) => void
  disabled: boolean
}

interface PaletteButtonProps extends ComponentProps<typeof Button> {
  color: string
}

const PaletteButton = forwardRef<HTMLButtonElement, PaletteButtonProps>(
  ({ color, className, ...props }, ref) => (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={`h-7 w-7 p-0 rounded-md border-2 ${className ?? ''}`}
      style={{ borderColor: color }}
      {...props}
    >
      <Icons.reportstyles className="h-3.5 w-3.5" />
    </Button>
  ),
)
PaletteButton.displayName = 'PaletteButton'

export function TooltipSection({
  group,
  options,
  selectedWidget,
  handleStyleChange,
  disabled,
}: TooltipSectionProps) {
  const { t } = useTranslation()

  const showTooltipOpt = options.find((o) => o.id === 'showTooltip')
  const fontSizeOpt = options.find((o) => o.id === 'tooltipFontSize')
  const borderWidthOpt = options.find((o) => o.id === 'tooltipBorderWidth')
  const borderColorOpt = options.find((o) => o.id === 'tooltipBorderColor')
  const bgColorOpt = options.find((o) => o.id === 'tooltipBackgroundColor')
  const bgOpacityOpt = options.find((o) => o.id === 'tooltipBackgroundOpacity')
  const textColorOpt = options.find((o) => o.id === 'tooltipTextColor')

  const showTooltip = Boolean(
    selectedWidget.styles?.showTooltip ?? showTooltipOpt?.defaultValue ?? true,
  )
  const fontSize = Number(
    selectedWidget.styles?.tooltipFontSize ?? fontSizeOpt?.defaultValue ?? 12,
  )
  const borderWidth = Number(
    selectedWidget.styles?.tooltipBorderWidth ??
      borderWidthOpt?.defaultValue ??
      1,
  )
  const borderColor = String(
    selectedWidget.styles?.tooltipBorderColor ??
      borderColorOpt?.defaultValue ??
      'hsl(var(--border))',
  )
  const backgroundColor = String(
    selectedWidget.styles?.tooltipBackgroundColor ??
      bgColorOpt?.defaultValue ??
      'hsl(var(--popover))',
  )
  const backgroundOpacity = Number(
    selectedWidget.styles?.tooltipBackgroundOpacity ??
      bgOpacityOpt?.defaultValue ??
      1,
  )
  const textColor = String(
    selectedWidget.styles?.tooltipTextColor ??
      textColorOpt?.defaultValue ??
      'hsl(var(--secondary-foreground))',
  )

  const otherOptions = options.filter(
    (option) =>
      ![
        'showTooltip',
        'tooltipFontSize',
        'tooltipBorderWidth',
        'tooltipBorderColor',
        'tooltipBackgroundColor',
        'tooltipBackgroundOpacity',
        'tooltipTextColor',
      ].includes(option.id),
  )

  return (
    <div>
      <div className="flex items-center justify-between py-1">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t(`styleGroups.${group}`, group)}
        </Label>
        <Switch
          checked={showTooltip}
          onCheckedChange={(checked) =>
            handleStyleChange('showTooltip', checked)
          }
          disabled={disabled}
          className="scale-75 origin-right"
        />
      </div>

      <Collapsible open={showTooltip}>
        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <div className="space-y-3 pt-1 pb-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-normal">
                  {t('style.fontSize', 'Font size')}
                </Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {fontSize}px
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Slider
                  value={[fontSize]}
                  onValueChange={([value]) =>
                    handleStyleChange('tooltipFontSize', value)
                  }
                  min={fontSizeOpt?.min ?? 8}
                  max={fontSizeOpt?.max ?? 24}
                  step={fontSizeOpt?.step ?? 1}
                  disabled={disabled}
                  className="flex-1"
                />
                <ColorPicker
                  value={textColor}
                  onChange={(value) =>
                    handleStyleChange('tooltipTextColor', value)
                  }
                  disabled={disabled}
                  trigger={
                    <PaletteButton color={textColor} disabled={disabled} />
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-normal">
                  {t('style.borderWidth', 'Border width')}
                </Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {borderWidth}px
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Slider
                  value={[borderWidth]}
                  onValueChange={([value]) =>
                    handleStyleChange('tooltipBorderWidth', value)
                  }
                  min={borderWidthOpt?.min ?? 0}
                  max={borderWidthOpt?.max ?? 5}
                  step={borderWidthOpt?.step ?? 1}
                  disabled={disabled}
                  className="flex-1"
                />
                <ColorPicker
                  value={borderColor}
                  onChange={(value) =>
                    handleStyleChange('tooltipBorderColor', value)
                  }
                  disabled={disabled}
                  trigger={
                    <PaletteButton color={borderColor} disabled={disabled} />
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-normal">
                  {t('style.opacity', 'Opacity')}
                </Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {Math.round(backgroundOpacity * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Slider
                  value={[backgroundOpacity]}
                  onValueChange={([value]) =>
                    handleStyleChange('tooltipBackgroundOpacity', value)
                  }
                  min={bgOpacityOpt?.min ?? 0.1}
                  max={bgOpacityOpt?.max ?? 1}
                  step={bgOpacityOpt?.step ?? 0.05}
                  disabled={disabled}
                  className="flex-1"
                />
                <ColorPicker
                  value={backgroundColor}
                  onChange={(value) =>
                    handleStyleChange('tooltipBackgroundColor', value)
                  }
                  disabled={disabled}
                  trigger={
                    <PaletteButton
                      color={backgroundColor}
                      disabled={disabled}
                    />
                  }
                />
              </div>
            </div>

            {otherOptions.map((option) => (
              <StyleOption
                key={option.id}
                option={option}
                value={selectedWidget.styles?.[option.id]}
                onChange={(value) => handleStyleChange(option.id, value)}
                disabled={disabled}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
