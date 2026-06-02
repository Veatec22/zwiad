/* eslint-disable @typescript-eslint/no-explicit-any */
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Icons } from '@/config/icons'
import type { Widget } from '../../../chart-engine/store'
import { ColorPicker } from '../../ColorPicker'

interface TitleSectionProps {
  selectedWidget: Widget
  setStyle: (id: string, key: string, value: any) => void
  updateWidget: (id: string, updates: Partial<Widget>) => void
  disabled: boolean
}

export function TitleSection({
  selectedWidget,
  setStyle,
  updateWidget,
  disabled,
}: TitleSectionProps) {
  const { t } = useTranslation()
  const titleBackground = String(
    selectedWidget.styles?.titleBackground || 'hsl(var(--border))',
  )
  const titleColor = String(
    selectedWidget.styles?.titleColor || 'hsl(var(--foreground))',
  )
  const widgetBackground = String(
    selectedWidget.styles?.widgetBackground || 'hsl(var(--card))',
  )
  const titleFontSize = Number(selectedWidget.styles?.titleFontSize || 14)
  const titleAlign = String(selectedWidget.styles?.titleAlign || 'left')
  const titleStyles = [
    selectedWidget.styles?.titleBold ? 'bold' : '',
    selectedWidget.styles?.titleItalic ? 'italic' : '',
    selectedWidget.styles?.titleUnderline ? 'underline' : '',
  ].filter(Boolean)

  return (
    <div>
      <div className="flex items-center justify-between py-1">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t('style.title', 'Title')}
        </Label>
        <Switch
          checked={!selectedWidget.styles?.titleHidden}
          onCheckedChange={(checked) =>
            setStyle(selectedWidget.id, 'titleHidden', !checked)
          }
          disabled={disabled}
          className="scale-75 origin-right"
        />
      </div>

      <Collapsible open={!selectedWidget.styles?.titleHidden}>
        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <div className="space-y-3 pt-1 pb-2">
            <div className="space-y-1">
              <Label className="text-xs font-normal">
                {t('style.titleText', 'Text')}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={selectedWidget.title}
                  onChange={(e) =>
                    updateWidget(selectedWidget.id, { title: e.target.value })
                  }
                  className="h-7 text-xs flex-1"
                  disabled={disabled}
                />
                <ColorPicker
                  value={titleBackground}
                  onChange={(color) =>
                    setStyle(selectedWidget.id, 'titleBackground', color)
                  }
                  disabled={disabled}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      className="h-7 w-7 p-0 rounded-md border-2"
                      style={{ borderColor: titleBackground }}
                    >
                      <Icons.reportstyles className="h-3.5 w-3.5" />
                    </Button>
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-normal">
                  {t('style.fontSize', 'Font Size')}
                </Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {titleFontSize}px
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Slider
                  value={[titleFontSize]}
                  onValueChange={([v]) =>
                    setStyle(selectedWidget.id, 'titleFontSize', v)
                  }
                  min={10}
                  max={48}
                  step={1}
                  disabled={disabled}
                  className="flex-1"
                />
                <ColorPicker
                  value={titleColor}
                  onChange={(color) =>
                    setStyle(selectedWidget.id, 'titleColor', color)
                  }
                  disabled={disabled}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      className="h-7 w-7 p-0 rounded-md border-2"
                      style={{ borderColor: titleColor }}
                    >
                      <Icons.reportstyles className="h-3.5 w-3.5" />
                    </Button>
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <ToggleGroup
                  type="multiple"
                  value={titleStyles}
                  onValueChange={(values) => {
                    setStyle(
                      selectedWidget.id,
                      'titleBold',
                      values.includes('bold'),
                    )
                    setStyle(
                      selectedWidget.id,
                      'titleItalic',
                      values.includes('italic'),
                    )
                    setStyle(
                      selectedWidget.id,
                      'titleUnderline',
                      values.includes('underline'),
                    )
                  }}
                  className="border rounded-md p-0 h-6 gap-0 overflow-hidden"
                >
                  <ToggleGroupItem
                    value="bold"
                    size="sm"
                    disabled={disabled}
                    className="h-6 w-7 p-0 rounded-none border-r data-[state=on]:bg-muted"
                  >
                    <span className="text-[10px] font-semibold">B</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="italic"
                    size="sm"
                    disabled={disabled}
                    className="h-6 w-7 p-0 rounded-none border-r data-[state=on]:bg-muted"
                  >
                    <span className="text-[10px] font-semibold italic">I</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="underline"
                    size="sm"
                    disabled={disabled}
                    className="h-6 w-7 p-0 rounded-none data-[state=on]:bg-muted"
                  >
                    <span className="text-[10px] font-semibold underline">
                      U
                    </span>
                  </ToggleGroupItem>
                </ToggleGroup>

                <ToggleGroup
                  type="single"
                  value={titleAlign}
                  onValueChange={(value) => {
                    if (value) setStyle(selectedWidget.id, 'titleAlign', value)
                  }}
                  className="border rounded-md p-0 h-6 gap-0 overflow-hidden"
                >
                  <ToggleGroupItem
                    value="left"
                    size="sm"
                    className="h-6 w-7 p-0 rounded-none border-r data-[state=on]:bg-muted"
                    disabled={disabled}
                  >
                    <Icons.alignLeft className="h-3 w-3" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="center"
                    size="sm"
                    className="h-6 w-7 p-0 rounded-none border-r data-[state=on]:bg-muted"
                    disabled={disabled}
                  >
                    <Icons.alignCenter className="h-3 w-3" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="right"
                    size="sm"
                    className="h-6 w-7 p-0 rounded-none data-[state=on]:bg-muted"
                    disabled={disabled}
                  >
                    <Icons.alignRight className="h-3 w-3" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs font-normal flex-1">
                  {t('style.background', 'Background')}
                </Label>
                <ColorPicker
                  value={widgetBackground}
                  onChange={(color) =>
                    setStyle(selectedWidget.id, 'widgetBackground', color)
                  }
                  disabled={disabled}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      className="h-7 w-7 p-0 rounded-md border-2"
                      style={{ borderColor: widgetBackground }}
                    >
                      <Icons.reportstyles className="h-3.5 w-3.5" />
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
