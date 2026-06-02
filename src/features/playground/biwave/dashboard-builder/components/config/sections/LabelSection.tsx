/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ComponentProps, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Icons } from '@/config/icons'
import type { StyleOptionDefinition } from '../../../chart-engine/configs/types'
import type { Widget } from '../../../chart-engine/store'
import { ColorPicker } from '../../ColorPicker'
import { StyleOption } from '../common/StyleOption'

interface LabelSectionProps {
  group: string
  options: StyleOptionDefinition[]
  selectedWidget: Widget
  handleStyleChange: (id: string, value: any) => void
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

export function LabelSection({
  group,
  options,
  selectedWidget,
  handleStyleChange,
  disabled,
}: LabelSectionProps) {
  const { t } = useTranslation()

  const showLabelsOpt = options.find((o) => o.id === 'showLabels')
  const fontSizeOpt = options.find((o) => o.id === 'labelFontSize')
  const colorOpt = options.find((o) => o.id === 'labelColor')
  const matchColorOpt = options.find((o) => o.id === 'labelMatchSeriesColor')
  const positionOpt = options.find((o) => o.id === 'labelPosition')

  const otherOptions = options.filter(
    (option) =>
      ![
        'showLabels',
        'labelFontSize',
        'labelColor',
        'labelMatchSeriesColor',
        'labelBold',
        'labelItalic',
        'labelUnderline',
        'labelPosition',
      ].includes(option.id),
  )
  const persistentOptions = otherOptions.filter(
    (option) => option.id === 'showPoints',
  )
  const collapsibleOptions = otherOptions.filter(
    (option) => option.id !== 'showPoints',
  )

  const showLabels = Boolean(
    selectedWidget.styles?.showLabels ?? showLabelsOpt?.defaultValue ?? false,
  )
  const labelFontSize = Number(
    selectedWidget.styles?.labelFontSize ?? fontSizeOpt?.defaultValue ?? 12,
  )
  const labelColor = String(
    selectedWidget.styles?.labelColor ??
      colorOpt?.defaultValue ??
      'hsl(var(--foreground))',
  )
  const matchColor = Boolean(
    selectedWidget.styles?.labelMatchSeriesColor ??
      matchColorOpt?.defaultValue ??
      false,
  )
  const labelPosition = String(
    selectedWidget.styles?.labelPosition ?? positionOpt?.defaultValue ?? 'top',
  )
  const positionOptions = positionOpt?.options ?? [
    { value: 'top', labelKey: 'style.positionTop' },
    { value: 'inside', labelKey: 'style.positionInside' },
    { value: 'insideBottom', labelKey: 'style.positionBottom' },
  ]

  const labelStyleValues = [
    selectedWidget.styles?.labelBold ? 'bold' : '',
    selectedWidget.styles?.labelItalic ? 'italic' : '',
    selectedWidget.styles?.labelUnderline ? 'underline' : '',
  ].filter(Boolean)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between py-1">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t(`styleGroups.${group}`, group)}
        </Label>
        {showLabelsOpt && (
          <Switch
            checked={showLabels}
            onCheckedChange={(checked) =>
              handleStyleChange('showLabels', checked)
            }
            disabled={disabled}
            className="scale-75 origin-right"
          />
        )}
      </div>

      {persistentOptions.map((option) => (
        <StyleOption
          key={option.id}
          option={option}
          value={selectedWidget.styles?.[option.id]}
          onChange={(value) => handleStyleChange(option.id, value)}
          disabled={disabled}
        />
      ))}

      <Collapsible open={showLabels}>
        <CollapsibleContent className="space-y-3 pt-1 pb-2 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-normal text-muted-foreground">
                {t('style.size', 'Size')}
              </Label>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {labelFontSize}px
              </span>
            </div>
            <div className="flex items-center gap-2">
              {fontSizeOpt && (
                <Slider
                  value={[labelFontSize]}
                  onValueChange={([value]) =>
                    handleStyleChange('labelFontSize', value)
                  }
                  min={fontSizeOpt.min}
                  max={fontSizeOpt.max}
                  step={fontSizeOpt.step}
                  disabled={disabled}
                  className="flex-1"
                />
              )}

              {matchColorOpt && (
                <Switch
                  checked={matchColor}
                  onCheckedChange={(checked) =>
                    handleStyleChange('labelMatchSeriesColor', checked)
                  }
                  disabled={disabled}
                  className="scale-75 origin-center"
                />
              )}

              {colorOpt && (
                <div
                  style={{
                    opacity: matchColor ? 0.4 : 1,
                    pointerEvents: matchColor ? 'none' : 'auto',
                  }}
                >
                  <ColorPicker
                    value={labelColor}
                    onChange={(value) => handleStyleChange('labelColor', value)}
                    disabled={disabled || matchColor}
                    trigger={
                      <PaletteButton
                        color={labelColor}
                        disabled={disabled || matchColor}
                      />
                    }
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            <ToggleGroup
              type="multiple"
              value={labelStyleValues}
              onValueChange={(values) => {
                handleStyleChange('labelBold', values.includes('bold'))
                handleStyleChange('labelItalic', values.includes('italic'))
                handleStyleChange(
                  'labelUnderline',
                  values.includes('underline'),
                )
              }}
              className="border rounded-md p-0 h-6 gap-0 overflow-hidden"
            >
              <ToggleGroupItem
                value="bold"
                size="sm"
                className="h-6 w-7 p-0 rounded-none border-r data-[state=on]:bg-muted"
                disabled={disabled}
              >
                <span className="text-[10px] font-semibold">B</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="italic"
                size="sm"
                className="h-6 w-7 p-0 rounded-none border-r data-[state=on]:bg-muted"
                disabled={disabled}
              >
                <span className="text-[10px] font-semibold italic">I</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="underline"
                size="sm"
                className="h-6 w-7 p-0 rounded-none data-[state=on]:bg-muted"
                disabled={disabled}
              >
                <span className="text-[10px] font-semibold underline">U</span>
              </ToggleGroupItem>
            </ToggleGroup>

            {positionOpt && (
              <ToggleGroup
                type="single"
                value={labelPosition}
                onValueChange={(value) => {
                  if (value) handleStyleChange('labelPosition', value)
                }}
                className="border rounded-md p-0 h-6 gap-0 overflow-hidden"
              >
                {positionOptions.map((opt, index) => {
                  const value = opt.value
                  const PositionIcon =
                    value === 'left'
                      ? Icons.alignLeft
                      : value === 'center'
                        ? Icons.alignCenter
                        : value === 'right'
                          ? Icons.alignRight
                          : value === 'inside'
                            ? Icons.labelInside
                            : value === 'insideBottom' || value === 'bottom'
                              ? Icons.labelBottom
                              : Icons.labelTop
                  const isLast = index === positionOptions.length - 1

                  return (
                    <ToggleGroupItem
                      key={value}
                      value={value}
                      size="sm"
                      className={`h-6 w-7 p-0 rounded-none data-[state=on]:bg-muted ${isLast ? '' : 'border-r'}`}
                      disabled={disabled}
                      title={t(opt.labelKey, value)}
                    >
                      <PositionIcon className="h-3 w-3" />
                    </ToggleGroupItem>
                  )
                })}
              </ToggleGroup>
            )}
          </div>

          {collapsibleOptions.map((option) => (
            <StyleOption
              key={option.id}
              option={option}
              value={selectedWidget.styles?.[option.id]}
              onChange={(value) => handleStyleChange(option.id, value)}
              disabled={disabled}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
