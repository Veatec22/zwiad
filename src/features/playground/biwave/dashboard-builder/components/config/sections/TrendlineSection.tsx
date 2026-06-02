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

interface TrendlineSectionProps {
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

export function TrendlineSection({
  group,
  options,
  selectedWidget,
  handleStyleChange,
  disabled,
}: TrendlineSectionProps) {
  const { t } = useTranslation()
  const showTrendlineOpt = options.find((o) => o.id === 'showTrendline')
  const widthOpt = options.find((o) => o.id === 'trendlineWidth')
  const colorOpt = options.find((o) => o.id === 'trendlineColor')

  if (!showTrendlineOpt || !widthOpt || !colorOpt) {
    return (
      <div className="space-y-1">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t(`styleGroups.${group}`, group)}
        </Label>
        {options.map((option) => (
          <StyleOption
            key={option.id}
            option={option}
            value={selectedWidget.styles?.[option.id]}
            onChange={(value) => handleStyleChange(option.id, value)}
            disabled={disabled}
          />
        ))}
      </div>
    )
  }

  const showTrendline = Boolean(
    selectedWidget.styles?.showTrendline ??
      showTrendlineOpt.defaultValue ??
      false,
  )
  const trendlineWidth = Number(
    selectedWidget.styles?.trendlineWidth ?? widthOpt.defaultValue ?? 2,
  )
  const trendlineColor = String(
    selectedWidget.styles?.trendlineColor ??
      colorOpt.defaultValue ??
      'hsl(var(--foreground))',
  )

  const otherOptions = options.filter(
    (option) =>
      !['showTrendline', 'trendlineWidth', 'trendlineColor'].includes(
        option.id,
      ),
  )

  return (
    <div>
      <div className="flex items-center justify-between py-1">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t(`styleGroups.${group}`, group)}
        </Label>
        <Switch
          checked={showTrendline}
          onCheckedChange={(checked) =>
            handleStyleChange('showTrendline', checked)
          }
          disabled={disabled}
          className="scale-75 origin-right"
        />
      </div>

      <Collapsible open={showTrendline}>
        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <div className="space-y-2 pt-1 pb-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-normal">
                  {t('style.lineWidth', 'Line width')}
                </Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {trendlineWidth}px
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Slider
                  value={[trendlineWidth]}
                  onValueChange={([value]) =>
                    handleStyleChange('trendlineWidth', value)
                  }
                  min={widthOpt.min ?? 1}
                  max={widthOpt.max ?? 8}
                  step={widthOpt.step ?? 0.5}
                  disabled={disabled}
                  className="flex-1"
                />
                <ColorPicker
                  value={trendlineColor}
                  onChange={(value) =>
                    handleStyleChange('trendlineColor', value)
                  }
                  disabled={disabled}
                  trigger={
                    <PaletteButton color={trendlineColor} disabled={disabled} />
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
