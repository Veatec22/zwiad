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

interface AppearanceSectionProps {
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

export function AppearanceSection({
  group,
  options,
  selectedWidget,
  handleStyleChange,
  disabled,
}: AppearanceSectionProps) {
  const { t } = useTranslation()

  const barBorderWidthOpt = options.find((o) => o.id === 'barBorderWidth')
  const barBorderColorOpt = options.find((o) => o.id === 'barBorderColor')
  const boxWidthOpt = options.find((o) => o.id === 'boxWidth')
  const boxColorOpt = options.find((o) => o.id === 'boxColor')
  const boxBorderWidthOpt = options.find((o) => o.id === 'boxBorderWidth')
  const boxBorderColorOpt = options.find((o) => o.id === 'boxBorderColor')
  const borderWidthOpt = options.find((o) => o.id === 'borderWidth')
  const borderColorOpt = options.find((o) => o.id === 'borderColor')
  const cellBorderWidthOpt = options.find((o) => o.id === 'cellBorderWidth')
  const cellBorderColorOpt = options.find((o) => o.id === 'cellBorderColor')
  const showBorderOpt = options.find((o) => o.id === 'showBorder')

  const showBorder = Boolean(
    selectedWidget.styles?.showBorder ?? showBorderOpt?.defaultValue ?? true,
  )
  const barBorderWidth = Number(
    selectedWidget.styles?.barBorderWidth ??
      barBorderWidthOpt?.defaultValue ??
      0,
  )
  const barBorderColor = String(
    selectedWidget.styles?.barBorderColor ??
      barBorderColorOpt?.defaultValue ??
      'hsl(var(--border))',
  )
  const boxWidth = Number(
    selectedWidget.styles?.boxWidth ?? boxWidthOpt?.defaultValue ?? 50,
  )
  const boxColor = String(
    selectedWidget.styles?.boxColor ??
      boxColorOpt?.defaultValue ??
      'hsl(var(--primary))',
  )
  const boxBorderWidth = Number(
    selectedWidget.styles?.boxBorderWidth ??
      boxBorderWidthOpt?.defaultValue ??
      1,
  )
  const boxBorderColor = String(
    selectedWidget.styles?.boxBorderColor ??
      boxBorderColorOpt?.defaultValue ??
      'hsl(var(--foreground))',
  )
  const borderWidth = Number(
    selectedWidget.styles?.borderWidth ?? borderWidthOpt?.defaultValue ?? 1,
  )
  const borderColor = String(
    selectedWidget.styles?.borderColor ??
      borderColorOpt?.defaultValue ??
      'hsl(var(--border))',
  )
  const cellBorderWidth = Number(
    selectedWidget.styles?.cellBorderWidth ??
      cellBorderWidthOpt?.defaultValue ??
      1,
  )
  const cellBorderColor = String(
    selectedWidget.styles?.cellBorderColor ??
      cellBorderColorOpt?.defaultValue ??
      'hsl(var(--border))',
  )

  const handledIds = new Set<string>([
    'showBorder',
    'barBorderWidth',
    'barBorderColor',
    'boxWidth',
    'boxColor',
    'boxBorderWidth',
    'boxBorderColor',
    'borderWidth',
    'borderColor',
    'cellBorderWidth',
    'cellBorderColor',
  ])

  const otherOptions = options.filter((option) => !handledIds.has(option.id))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between py-1">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t(`styleGroups.${group}`, group)}
        </Label>
        {showBorderOpt && (
          <Switch
            checked={showBorder}
            onCheckedChange={(checked) =>
              handleStyleChange('showBorder', checked)
            }
            disabled={disabled}
            className="scale-75 origin-right"
          />
        )}
      </div>

      {barBorderWidthOpt && barBorderColorOpt && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-normal">
              {t('style.borderWidth', 'Border width')}
            </Label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {barBorderWidth}px
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Slider
              value={[barBorderWidth]}
              onValueChange={([value]) =>
                handleStyleChange('barBorderWidth', value)
              }
              min={barBorderWidthOpt.min ?? 0}
              max={barBorderWidthOpt.max ?? 6}
              step={barBorderWidthOpt.step ?? 1}
              disabled={disabled}
              className="flex-1"
            />
            <ColorPicker
              value={barBorderColor}
              onChange={(value) => handleStyleChange('barBorderColor', value)}
              disabled={disabled}
              trigger={
                <PaletteButton color={barBorderColor} disabled={disabled} />
              }
            />
          </div>
        </div>
      )}

      {boxWidthOpt && boxColorOpt && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-normal">
              {t(boxWidthOpt.labelKey, 'Box width')}
            </Label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {boxWidth}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Slider
              value={[boxWidth]}
              onValueChange={([value]) => handleStyleChange('boxWidth', value)}
              min={boxWidthOpt.min ?? 20}
              max={boxWidthOpt.max ?? 80}
              step={boxWidthOpt.step ?? 1}
              disabled={disabled}
              className="flex-1"
            />
            <ColorPicker
              value={boxColor}
              onChange={(value) => handleStyleChange('boxColor', value)}
              disabled={disabled}
              trigger={<PaletteButton color={boxColor} disabled={disabled} />}
            />
          </div>
        </div>
      )}

      {boxBorderWidthOpt && boxBorderColorOpt && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-normal">
              {t('style.borderWidth', 'Border width')}
            </Label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {boxBorderWidth}px
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Slider
              value={[boxBorderWidth]}
              onValueChange={([value]) =>
                handleStyleChange('boxBorderWidth', value)
              }
              min={boxBorderWidthOpt.min ?? 0}
              max={boxBorderWidthOpt.max ?? 6}
              step={boxBorderWidthOpt.step ?? 1}
              disabled={disabled}
              className="flex-1"
            />
            <ColorPicker
              value={boxBorderColor}
              onChange={(value) => handleStyleChange('boxBorderColor', value)}
              disabled={disabled}
              trigger={
                <PaletteButton color={boxBorderColor} disabled={disabled} />
              }
            />
          </div>
        </div>
      )}

      <Collapsible open={!showBorderOpt || showBorder}>
        <CollapsibleContent className="space-y-3 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          {borderWidthOpt && borderColorOpt && (
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
                    handleStyleChange('borderWidth', value)
                  }
                  min={borderWidthOpt.min ?? 0}
                  max={borderWidthOpt.max ?? 6}
                  step={borderWidthOpt.step ?? 1}
                  disabled={disabled}
                  className="flex-1"
                />
                <ColorPicker
                  value={borderColor}
                  onChange={(value) => handleStyleChange('borderColor', value)}
                  disabled={disabled}
                  trigger={
                    <PaletteButton color={borderColor} disabled={disabled} />
                  }
                />
              </div>
            </div>
          )}

          {cellBorderWidthOpt && cellBorderColorOpt && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-normal">
                  {t('style.borderWidth', 'Border width')}
                </Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {cellBorderWidth}px
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Slider
                  value={[cellBorderWidth]}
                  onValueChange={([value]) =>
                    handleStyleChange('cellBorderWidth', value)
                  }
                  min={cellBorderWidthOpt.min ?? 0}
                  max={cellBorderWidthOpt.max ?? 6}
                  step={cellBorderWidthOpt.step ?? 1}
                  disabled={disabled}
                  className="flex-1"
                />
                <ColorPicker
                  value={cellBorderColor}
                  onChange={(value) =>
                    handleStyleChange('cellBorderColor', value)
                  }
                  disabled={disabled}
                  trigger={
                    <PaletteButton
                      color={cellBorderColor}
                      disabled={disabled}
                    />
                  }
                />
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

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
  )
}
