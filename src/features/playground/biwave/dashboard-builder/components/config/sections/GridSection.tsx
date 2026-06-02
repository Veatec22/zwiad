/* eslint-disable @typescript-eslint/no-explicit-any */
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

interface GridSectionProps {
  group: string
  options: StyleOptionDefinition[]
  selectedWidget: Widget
  handleStyleChange: (id: string, value: any) => void
  disabled: boolean
}

export function GridSection({
  group,
  options,
  selectedWidget,
  handleStyleChange,
  disabled,
}: GridSectionProps) {
  const { t } = useTranslation()

  const showToggleOption = options.find(
    (o) => o.id === 'showGrid' || o.id === 'showBorder',
  )
  const lineWidthOption =
    options.find((o) => o.id === 'gridLineWidth') ??
    options.find((o) => o.id === 'cellBorderWidth') ??
    options.find((o) => o.id === 'borderWidth')
  const colorOption =
    options.find((o) => o.id === 'gridLineColor') ??
    options.find((o) => o.id === 'cellBorderColor') ??
    options.find((o) => o.id === 'borderColor')

  if (!lineWidthOption || !colorOption) {
    return (
      <div className="space-y-1">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
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

  const toggleId = showToggleOption?.id
  const lineWidthId = lineWidthOption.id
  const colorId = colorOption.id
  const showGrid = toggleId
    ? Boolean(
        selectedWidget.styles?.[toggleId] ??
          showToggleOption?.defaultValue ??
          true,
      )
    : true
  const excludedIds = new Set<string>([lineWidthId, colorId])
  if (toggleId) excludedIds.add(toggleId)

  return (
    <div>
      <div className="flex items-center justify-between py-1">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t(`styleGroups.${group}`, group)}
        </Label>
        {toggleId && (
          <Switch
            checked={showGrid}
            onCheckedChange={(checked) => handleStyleChange(toggleId, checked)}
            disabled={disabled}
            className="scale-75 origin-right"
          />
        )}
      </div>

      <Collapsible open={showGrid}>
        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <div className="space-y-1.5 pt-1 pb-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-normal">
                {t(lineWidthOption.labelKey, 'Line Width')}
              </Label>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {Number(
                  selectedWidget.styles?.[lineWidthId] ??
                    lineWidthOption.defaultValue,
                )}
                px
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Slider
                value={[
                  Number(
                    selectedWidget.styles?.[lineWidthId] ??
                      lineWidthOption.defaultValue,
                  ),
                ]}
                onValueChange={([v]) => handleStyleChange(lineWidthId, v)}
                min={lineWidthOption.min}
                max={lineWidthOption.max}
                step={lineWidthOption.step}
                disabled={disabled}
                className="flex-1"
              />
              <ColorPicker
                value={String(
                  selectedWidget.styles?.[colorId] ?? colorOption.defaultValue,
                )}
                onChange={(color) => handleStyleChange(colorId, color)}
                disabled={disabled}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    className="h-7 w-7 p-0 rounded-md border-2"
                    style={{
                      borderColor: String(
                        selectedWidget.styles?.[colorId] ??
                          colorOption.defaultValue,
                      ),
                    }}
                  >
                    <Icons.reportstyles className="h-3.5 w-3.5" />
                  </Button>
                }
              />
            </div>

            {options
              .filter((o) => !excludedIds.has(o.id))
              .map((option) => (
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
