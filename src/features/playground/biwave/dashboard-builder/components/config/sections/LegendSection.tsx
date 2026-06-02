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

interface LegendSectionProps {
  group: string
  options: StyleOptionDefinition[]
  selectedWidget: Widget
  handleStyleChange: (id: string, value: unknown) => void
  disabled: boolean
}

export function LegendSection({
  group,
  options,
  selectedWidget,
  handleStyleChange,
  disabled,
}: LegendSectionProps) {
  const { t } = useTranslation()

  // Helper to get value or default
  const getValue = (id: string, def: unknown) => {
    return selectedWidget.styles[id] ?? def
  }

  const showLegendOpt = options.find((o) => o.id === 'showLegend')
  const showLegend = getValue(
    'showLegend',
    showLegendOpt?.defaultValue ?? true,
  ) as boolean

  const fontSizeOpt = options.find((o) => o.id === 'legendFontSize')
  const fontSize = getValue(
    'legendFontSize',
    fontSizeOpt?.defaultValue ?? 12,
  ) as number

  const boldOpt = options.find((o) => o.id === 'legendBold')
  const isBold = getValue(
    'legendBold',
    boldOpt?.defaultValue ?? false,
  ) as boolean

  const italicOpt = options.find((o) => o.id === 'legendItalic')
  const isItalic = getValue(
    'legendItalic',
    italicOpt?.defaultValue ?? false,
  ) as boolean

  const underlineOpt = options.find((o) => o.id === 'legendUnderline')
  const isUnderline = getValue(
    'legendUnderline',
    underlineOpt?.defaultValue ?? false,
  ) as boolean

  const colorOpt = options.find((o) => o.id === 'legendColor')
  const color = getValue(
    'legendColor',
    colorOpt?.defaultValue ?? 'hsl(var(--foreground))',
  ) as string

  const alignOpt = options.find((o) => o.id === 'legendAlign')
  const align = getValue(
    'legendAlign',
    alignOpt?.defaultValue ?? 'center',
  ) as string

  return (
    <div>
      <div className="flex items-center justify-between py-1">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t(`styleGroups.${group}`, group)}
        </Label>
        <Switch
          checked={showLegend}
          onCheckedChange={(checked) =>
            handleStyleChange('showLegend', checked)
          }
          disabled={disabled}
          className="scale-75 origin-right"
        />
      </div>

      <Collapsible open={showLegend}>
        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <div className="space-y-3 pt-1 pb-2">
            {/* Row 1: Size Slider (Grow) | Color (Icon only) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-normal text-muted-foreground">
                  {t('style.size', 'Size')}
                </Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {fontSize}px
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Slider
                  value={[fontSize]}
                  onValueChange={([v]) =>
                    handleStyleChange('legendFontSize', v)
                  }
                  min={8}
                  max={24}
                  step={1}
                  disabled={disabled}
                  className="flex-1"
                />
                {colorOpt && (
                  <ColorPicker
                    value={color}
                    onChange={(v) => handleStyleChange('legendColor', v)}
                    disabled={disabled}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        className="h-7 w-7 p-0 rounded-md border-2"
                        style={{ borderColor: color }}
                      >
                        <Icons.reportstyles className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                )}
              </div>
            </div>

            {/* Row 2: Format Group (Left) | Align Group (Right) */}
            <div className="flex items-center justify-between gap-1">
              <ToggleGroup
                type="multiple"
                className="border rounded-md p-0 h-6 gap-0 overflow-hidden"
              >
                <ToggleGroupItem
                  value="bold"
                  size="sm"
                  className="h-6 w-7 p-0 rounded-none border-r last:border-r-0 data-[state=on]:bg-muted"
                  aria-label="Bold"
                  disabled={disabled}
                  onClick={() => handleStyleChange('legendBold', !isBold)}
                  data-state={isBold ? 'on' : 'off'}
                >
                  <span className="text-[10px] font-semibold">B</span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="italic"
                  size="sm"
                  className="h-6 w-7 p-0 rounded-none border-r last:border-r-0 data-[state=on]:bg-muted"
                  aria-label="Italic"
                  disabled={disabled}
                  onClick={() => handleStyleChange('legendItalic', !isItalic)}
                  data-state={isItalic ? 'on' : 'off'}
                >
                  <span className="text-[10px] font-semibold italic">I</span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="underline"
                  size="sm"
                  className="h-6 w-7 p-0 rounded-none data-[state=on]:bg-muted"
                  aria-label="Underline"
                  disabled={disabled}
                  onClick={() =>
                    handleStyleChange('legendUnderline', !isUnderline)
                  }
                  data-state={isUnderline ? 'on' : 'off'}
                >
                  <span className="text-[10px] font-semibold underline">U</span>
                </ToggleGroupItem>
              </ToggleGroup>

              <ToggleGroup
                type="single"
                value={align}
                onValueChange={(val) =>
                  val && handleStyleChange('legendAlign', val)
                }
                className="border rounded-md p-0 h-6 gap-0 overflow-hidden"
              >
                <ToggleGroupItem
                  value="left"
                  size="sm"
                  className="h-6 w-7 p-0 rounded-none border-r last:border-r-0 data-[state=on]:bg-muted"
                  aria-label="Left"
                  disabled={disabled}
                >
                  <Icons.alignLeft className="h-3 w-3" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="center"
                  size="sm"
                  className="h-6 w-7 p-0 rounded-none border-r last:border-r-0 data-[state=on]:bg-muted"
                  aria-label="Center"
                  disabled={disabled}
                >
                  <Icons.alignCenter className="h-3 w-3" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="right"
                  size="sm"
                  className="h-6 w-7 p-0 rounded-none data-[state=on]:bg-muted"
                  aria-label="Right"
                  disabled={disabled}
                >
                  <Icons.alignRight className="h-3 w-3" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
