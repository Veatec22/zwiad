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

interface AxisSectionProps {
  group: string
  options: StyleOptionDefinition[]
  selectedWidget: Widget
  handleStyleChange: (id: string, value: unknown) => void
  disabled: boolean
}

interface AxisEditorProps {
  axis: 'x' | 'y'
  show: boolean
  fontSize: number
  fontColor: string
  lineWidth: number
  lineColor: string
  styleValues: string[]
  onChange: (id: string, value: unknown) => void
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

function AxisEditor({
  axis,
  show,
  fontSize,
  fontColor,
  lineWidth,
  lineColor,
  styleValues,
  onChange,
  disabled,
}: AxisEditorProps) {
  const { t } = useTranslation()
  const prefix = axis === 'x' ? 'xAxis' : 'yAxis'

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {axis === 'x'
            ? t('style.xAxis', 'X Axis')
            : t('style.yAxis', 'Y Axis')}
        </Label>
        <Switch
          checked={show}
          onCheckedChange={(checked) =>
            onChange(`show${axis.toUpperCase()}Axis`, checked)
          }
          disabled={disabled}
          className="scale-75 origin-right"
        />
      </div>

      <Collapsible open={show}>
        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <div className="space-y-2.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-normal">
                  {t('style.fontSize', 'Font Size')}
                </Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {fontSize}px
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Slider
                  value={[fontSize]}
                  onValueChange={([value]) =>
                    onChange(`${prefix}FontSize`, value)
                  }
                  min={8}
                  max={22}
                  step={1}
                  disabled={disabled}
                  className="flex-1"
                />
                <ColorPicker
                  value={fontColor}
                  onChange={(value) => onChange(`${prefix}Color`, value)}
                  disabled={disabled}
                  trigger={
                    <PaletteButton color={fontColor} disabled={disabled} />
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-normal">
                  {t('style.lineWidth', 'Line width')}
                </Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {lineWidth}px
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Slider
                  value={[lineWidth]}
                  onValueChange={([value]) =>
                    onChange(`${prefix}LineWidth`, value)
                  }
                  min={1}
                  max={4}
                  step={1}
                  disabled={disabled}
                  className="flex-1"
                />
                <ColorPicker
                  value={lineColor}
                  onChange={(value) => onChange(`${prefix}LineColor`, value)}
                  disabled={disabled}
                  trigger={
                    <PaletteButton color={lineColor} disabled={disabled} />
                  }
                />
              </div>
            </div>

            <ToggleGroup
              type="multiple"
              value={styleValues}
              onValueChange={(values) => {
                onChange(`${prefix}Bold`, values.includes('bold'))
                onChange(`${prefix}Italic`, values.includes('italic'))
                onChange(`${prefix}Underline`, values.includes('underline'))
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
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export function AxisSection({
  options,
  selectedWidget,
  handleStyleChange,
  disabled,
}: AxisSectionProps) {
  const otherOptions = options.filter(
    (option) =>
      ![
        'showXAxis',
        'xAxisFontSize',
        'xAxisColor',
        'xAxisBold',
        'xAxisItalic',
        'xAxisUnderline',
        'xAxisLineWidth',
        'xAxisLineColor',
        'showYAxis',
        'yAxisFontSize',
        'yAxisColor',
        'yAxisBold',
        'yAxisItalic',
        'yAxisUnderline',
        'yAxisLineWidth',
        'yAxisLineColor',
      ].includes(option.id),
  )

  const showXAxis = Boolean(
    selectedWidget.styles?.showXAxis ?? selectedWidget.styles?.showAxis ?? true,
  )
  const showYAxis = Boolean(
    selectedWidget.styles?.showYAxis ?? selectedWidget.styles?.showAxis ?? true,
  )

  const xAxisStyles = [
    (selectedWidget.styles?.xAxisBold ?? selectedWidget.styles?.axisBold)
      ? 'bold'
      : '',
    (selectedWidget.styles?.xAxisItalic ?? selectedWidget.styles?.axisItalic)
      ? 'italic'
      : '',
    (selectedWidget.styles?.xAxisUnderline ??
    selectedWidget.styles?.axisUnderline)
      ? 'underline'
      : '',
  ].filter(Boolean)

  const yAxisStyles = [
    (selectedWidget.styles?.yAxisBold ?? selectedWidget.styles?.axisBold)
      ? 'bold'
      : '',
    (selectedWidget.styles?.yAxisItalic ?? selectedWidget.styles?.axisItalic)
      ? 'italic'
      : '',
    (selectedWidget.styles?.yAxisUnderline ??
    selectedWidget.styles?.axisUnderline)
      ? 'underline'
      : '',
  ].filter(Boolean)

  return (
    <div className="space-y-2.5">
      <AxisEditor
        axis="x"
        show={showXAxis}
        fontSize={Number(
          selectedWidget.styles?.xAxisFontSize ??
            selectedWidget.styles?.axisFontSize ??
            11,
        )}
        fontColor={String(
          selectedWidget.styles?.xAxisColor ??
            selectedWidget.styles?.axisColor ??
            'hsl(var(--muted-foreground))',
        )}
        lineWidth={Number(
          selectedWidget.styles?.xAxisLineWidth ??
            selectedWidget.styles?.axisLineWidth ??
            1,
        )}
        lineColor={String(
          selectedWidget.styles?.xAxisLineColor ??
            selectedWidget.styles?.axisColor ??
            'hsl(var(--muted-foreground))',
        )}
        styleValues={xAxisStyles}
        onChange={handleStyleChange}
        disabled={disabled}
      />

      <AxisEditor
        axis="y"
        show={showYAxis}
        fontSize={Number(
          selectedWidget.styles?.yAxisFontSize ??
            selectedWidget.styles?.axisFontSize ??
            11,
        )}
        fontColor={String(
          selectedWidget.styles?.yAxisColor ??
            selectedWidget.styles?.axisColor ??
            'hsl(var(--muted-foreground))',
        )}
        lineWidth={Number(
          selectedWidget.styles?.yAxisLineWidth ??
            selectedWidget.styles?.axisLineWidth ??
            1,
        )}
        lineColor={String(
          selectedWidget.styles?.yAxisLineColor ??
            selectedWidget.styles?.axisColor ??
            'hsl(var(--muted-foreground))',
        )}
        styleValues={yAxisStyles}
        onChange={handleStyleChange}
        disabled={disabled}
      />

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
