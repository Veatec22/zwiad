/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Icons } from '@/config/icons'
import type { StyleOptionDefinition } from '../../../chart-engine/configs/types'
import type { Widget } from '../../../chart-engine/store'
import { StyleOption } from '../common/StyleOption'

interface LayoutSectionProps {
  group: string
  options: StyleOptionDefinition[]
  selectedWidget: Widget
  handleStyleChange: (id: string, value: any) => void
  disabled: boolean
}

export function LayoutSection({
  group,
  options,
  selectedWidget,
  handleStyleChange,
  disabled,
}: LayoutSectionProps) {
  const { t } = useTranslation()

  const orientationOpt = options.find((o) => o.id === 'orientation')
  const sortOrderOpt = options.find((o) => o.id === 'sortOrder')
  const sortModeOpt = options.find((o) => o.id === 'sortMode')
  const stackOpt = options.find((o) => o.id === 'stackMode')

  const otherOptions = options.filter(
    (option) =>
      !['orientation', 'sortOrder', 'sortMode', 'stackMode'].includes(
        option.id,
      ),
  )

  const orientation = String(
    selectedWidget.styles?.orientation ??
      orientationOpt?.defaultValue ??
      'vertical',
  )
  const stackMode = Boolean(
    selectedWidget.styles?.stackMode ?? stackOpt?.defaultValue ?? false,
  )

  const sortOption = sortModeOpt ?? sortOrderOpt
  const sortId = sortOption?.id
  const isFunnelSort =
    selectedWidget.chartType === 'funnel' && sortId === 'sortMode'
  const sortValue = useMemo(() => {
    if (!sortOption) return ''
    const defaultValue = String(sortOption.defaultValue ?? 'descending')
    return String(selectedWidget.styles?.[sortOption.id] ?? defaultValue)
  }, [selectedWidget.styles, sortOption])

  const supportsNoneSort = Boolean(
    sortOption?.options?.some((opt) => opt.value === 'none'),
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between py-1">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t(`styleGroups.${group}`, group)}
        </Label>
      </div>

      {(orientationOpt || sortOption || stackOpt) && (
        <div className="flex items-center gap-4">
          {orientationOpt && (
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs font-normal text-muted-foreground">
                {t(orientationOpt.labelKey, 'Orientation')}
              </Label>
              <ToggleGroup
                type="single"
                value={orientation}
                onValueChange={(value) => {
                  if (value) handleStyleChange('orientation', value)
                }}
                className="justify-start border rounded-md p-0 h-7 overflow-hidden w-full"
              >
                <ToggleGroupItem
                  value="vertical"
                  size="sm"
                  className="flex-1 h-7 p-0 rounded-none border-r data-[state=on]:bg-muted"
                  disabled={disabled}
                >
                  <Icons.orientationVertical className="h-3.5 w-3.5" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="horizontal"
                  size="sm"
                  className="flex-1 h-7 p-0 rounded-none data-[state=on]:bg-muted"
                  disabled={disabled}
                >
                  <Icons.orientationHorizontal className="h-3.5 w-3.5" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}

          {sortOption && sortId && (
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs font-normal text-muted-foreground">
                {t(sortOption.labelKey, 'Sort')}
              </Label>
              <ToggleGroup
                type="single"
                value={sortValue}
                onValueChange={(value) => {
                  if (!value && supportsNoneSort) {
                    handleStyleChange(sortId, 'none')
                    return
                  }
                  if (value) {
                    handleStyleChange(sortId, value)
                  }
                }}
                className="justify-start border rounded-md p-0 h-7 overflow-hidden w-full"
              >
                <ToggleGroupItem
                  value="ascending"
                  size="sm"
                  className="flex-1 h-7 p-0 rounded-none border-r data-[state=on]:bg-muted"
                  disabled={disabled}
                >
                  {isFunnelSort ? (
                    <Icons.chartFunnel className="h-3.5 w-3.5 rotate-180" />
                  ) : (
                    <Icons.sortAsc className="h-3.5 w-3.5" />
                  )}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="descending"
                  size="sm"
                  className="flex-1 h-7 p-0 rounded-none data-[state=on]:bg-muted"
                  disabled={disabled}
                >
                  {isFunnelSort ? (
                    <Icons.chartFunnel className="h-3.5 w-3.5" />
                  ) : (
                    <Icons.sortDesc className="h-3.5 w-3.5" />
                  )}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}

          {stackOpt && (
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground block">
                {t(stackOpt.labelKey, 'Stack')}
              </Label>
              <Toggle
                pressed={stackMode}
                onPressedChange={(pressed) =>
                  handleStyleChange('stackMode', pressed)
                }
                size="sm"
                variant="outline"
                disabled={disabled}
                className="h-7 w-full px-2 data-[state=on]:bg-muted"
              >
                <Icons.stack className="h-3.5 w-3.5" />
              </Toggle>
            </div>
          )}
        </div>
      )}

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
