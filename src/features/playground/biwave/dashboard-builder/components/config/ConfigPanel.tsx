import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Icons } from '@/config/icons'
import {
  type ChannelDefinition,
  canRenderChart,
  getChartConfig,
  type StyleOptionDefinition,
} from '../../chart-engine/configs'
import { buildChartQuery } from '../../chart-engine/sql/chartQueryBuilder'
import {
  selectSelectedWidget,
  useDashboardStore,
} from '../../chart-engine/store'
import type { DatasetField } from '../../chart-engine/types'
import { OptionGroup } from './common/OptionGroup'
import { StyleOption } from './common/StyleOption'
import { SqlTab } from './SqlTab'
import { AppearanceSection } from './sections/AppearanceSection'
import { AxisSection } from './sections/AxisSection'
import { GridSection } from './sections/GridSection'
import { LabelSection } from './sections/LabelSection'
import { LayoutSection } from './sections/LayoutSection'
import { LegendSection } from './sections/LegendSection'
import { TitleSection } from './sections/TitleSection'
import { TooltipSection } from './sections/TooltipSection'
import { TrendlineSection } from './sections/TrendlineSection'
import { ChannelShelf } from './shelves/ChannelShelf'

interface ConfigPanelProps {
  fields: DatasetField[]
  disabled?: boolean
}

export function ConfigPanel({ fields, disabled = false }: ConfigPanelProps) {
  const { t } = useTranslation()

  const selectedWidget = useDashboardStore(selectSelectedWidget)
  const dashboardFilters = useDashboardStore((state) => state.dashboardFilters)
  const {
    updateWidget,
    setStyle,
    addToChannel,
    removeFromChannel,
    setChannel,
  } = useDashboardStore()

  const selectedChartType = selectedWidget?.chartType ?? null
  const chartConfig = useMemo(() => {
    if (!selectedChartType) return null
    return getChartConfig(selectedChartType)
  }, [selectedChartType])

  const channelsByTab = useMemo(() => {
    if (!chartConfig) return { config: [], style: [] }

    const config: Array<{ group: string; channels: ChannelDefinition[] }> = []
    const style: Array<{ group: string; channels: ChannelDefinition[] }> = []

    const configGroups = new Map<string, ChannelDefinition[]>()
    const styleGroups = new Map<string, ChannelDefinition[]>()

    for (const channel of chartConfig.channels) {
      const map = channel.tab === 'config' ? configGroups : styleGroups
      const group = channel.group || 'default'
      if (!map.has(group)) map.set(group, [])
      map.get(group)?.push(channel)
    }

    configGroups.forEach((channels, group) => {
      config.push({
        group,
        channels: channels.sort((a, b) => a.order - b.order),
      })
    })
    styleGroups.forEach((channels, group) => {
      style.push({
        group,
        channels: channels.sort((a, b) => a.order - b.order),
      })
    })

    return { config, style }
  }, [chartConfig])

  const styleOptionsByGroup = useMemo(() => {
    if (!chartConfig || !selectedWidget) return []
    const numberFormat = String(selectedWidget.styles?.numberFormat ?? 'number')
    const variant = String(selectedWidget.styles?.variant ?? 'pie')
    const filteredStyleOptions = chartConfig.styleOptions.filter((option) => {
      if (option.id === 'currencyCode' && numberFormat !== 'currency')
        return false
      if (option.id === 'innerRadius' && variant !== 'donut') return false
      return true
    })

    const groups = new Map<string, StyleOptionDefinition[]>()

    for (const option of filteredStyleOptions) {
      const group = option.group || 'default'
      if (!groups.has(group)) groups.set(group, [])
      groups.get(group)?.push(option)
    }

    const result: Array<{ group: string; options: StyleOptionDefinition[] }> =
      []
    groups.forEach((options, group) => {
      result.push({
        group,
        options: options.sort((a, b) => a.order - b.order),
      })
    })

    return result
  }, [chartConfig, selectedWidget])

  const handleStyleChange = (styleId: string, value: unknown) => {
    if (!selectedWidget) return
    setStyle(selectedWidget.id, styleId, value)
  }

  const effectiveGlobalFilters = useMemo(
    () => dashboardFilters,
    [dashboardFilters],
  )

  const sql = useMemo(() => {
    if (!selectedWidget?.chartType) return null
    if (!canRenderChart(selectedWidget.chartType, selectedWidget.channels))
      return null
    const q = buildChartQuery(selectedWidget.chartType, {
      tableName: 'dataset_active',
      channels: selectedWidget.channels,
      globalFilters: effectiveGlobalFilters,
      localFilters: selectedWidget.filters,
    })
    return q?.sql ?? null
  }, [effectiveGlobalFilters, selectedWidget])

  if (!selectedWidget) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <Icons.settings className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-xs text-muted-foreground">
          {t('config.noSelection', 'Select a chart to configure')}
        </p>
      </div>
    )
  }

  if (selectedWidget.type === 'text') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0 p-3 space-y-1">
          <Label className="text-xs">{t('elements.text', 'Text')}</Label>
          <Textarea
            value={String(selectedWidget.styles.text ?? '')}
            onChange={(e) =>
              setStyle(selectedWidget.id, 'text', e.target.value)
            }
            className="min-h-[140px] text-xs"
            disabled={disabled}
          />
        </div>
      </div>
    )
  }

  if (!chartConfig) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center">
        <p className="text-xs text-muted-foreground">
          {t('config.noSelection', 'Select a chart to configure')}
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="config" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 shrink-0 h-9">
          <TabsTrigger
            value="config"
            className="flex-1 gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-1.5 text-xs"
          >
            <Icons.settings className="h-3.5 w-3.5" />
            {t('tabs.configuration', 'Settings')}
          </TabsTrigger>
          <TabsTrigger
            value="style"
            className="flex-1 gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-1.5 text-xs"
          >
            <Icons.reportstyles className="h-3.5 w-3.5" />
            {t('tabs.style', 'Style')}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 min-h-0">
          <TabsContent value="config" className="p-3 m-0 space-y-3">
            {channelsByTab.config.map(({ group, channels }) => (
              <OptionGroup
                key={group}
                title={t(`channelGroups.${group}`, group)}
              >
                {channels.map((channel) => (
                  <ChannelShelf
                    key={channel.id}
                    channel={channel}
                    fields={fields}
                    value={selectedWidget.channels[channel.id] || []}
                    onChange={(newFields) =>
                      setChannel(selectedWidget.id, channel.id, newFields)
                    }
                    onAdd={(field) =>
                      addToChannel(selectedWidget.id, channel.id, field)
                    }
                    onRemove={(fieldName) =>
                      removeFromChannel(
                        selectedWidget.id,
                        channel.id,
                        fieldName,
                      )
                    }
                    disabled={disabled}
                  />
                ))}
              </OptionGroup>
            ))}

            <div className="pt-1">
              <div className="h-px bg-border/40 my-2" />
              <SqlTab sql={sql} />
            </div>
          </TabsContent>

          <TabsContent value="style" className="p-3 m-0 space-y-0.5">
            <TitleSection
              selectedWidget={selectedWidget}
              setStyle={setStyle}
              updateWidget={updateWidget}
              disabled={disabled}
            />

            {channelsByTab.style.map(({ group, channels }) => (
              <OptionGroup
                key={group}
                title={t(`channelGroups.${group}`, group)}
              >
                {channels.map((channel) => (
                  <ChannelShelf
                    key={channel.id}
                    channel={channel}
                    fields={fields}
                    value={selectedWidget.channels[channel.id] || []}
                    onChange={(newFields) =>
                      setChannel(selectedWidget.id, channel.id, newFields)
                    }
                    onAdd={(field) =>
                      addToChannel(selectedWidget.id, channel.id, field)
                    }
                    onRemove={(fieldName) =>
                      removeFromChannel(
                        selectedWidget.id,
                        channel.id,
                        fieldName,
                      )
                    }
                    disabled={disabled}
                  />
                ))}
              </OptionGroup>
            ))}

            {styleOptionsByGroup.map(({ group, options }) => {
              if (group === 'grid') {
                return (
                  <GridSection
                    key={group}
                    group={group}
                    options={options}
                    selectedWidget={selectedWidget}
                    handleStyleChange={(id, value) =>
                      handleStyleChange(id, value)
                    }
                    disabled={disabled}
                  />
                )
              }

              if (group === 'legend') {
                return (
                  <LegendSection
                    key={group}
                    group={group}
                    options={options}
                    selectedWidget={selectedWidget}
                    handleStyleChange={(id, value) =>
                      handleStyleChange(id, value)
                    }
                    disabled={disabled}
                  />
                )
              }

              if (group === 'layout') {
                return (
                  <LayoutSection
                    key={group}
                    group={group}
                    options={options}
                    selectedWidget={selectedWidget}
                    handleStyleChange={(id, value) =>
                      handleStyleChange(id, value)
                    }
                    disabled={disabled}
                  />
                )
              }

              if (group === 'labels') {
                return (
                  <LabelSection
                    key={group}
                    group={group}
                    options={options}
                    selectedWidget={selectedWidget}
                    handleStyleChange={(id, value) =>
                      handleStyleChange(id, value)
                    }
                    disabled={disabled}
                  />
                )
              }

              if (group === 'appearance') {
                return (
                  <AppearanceSection
                    key={group}
                    group={group}
                    options={options}
                    selectedWidget={selectedWidget}
                    handleStyleChange={(id, value) =>
                      handleStyleChange(id, value)
                    }
                    disabled={disabled}
                  />
                )
              }

              if (group === 'axis') {
                return (
                  <AxisSection
                    key={group}
                    group={group}
                    options={options}
                    selectedWidget={selectedWidget}
                    handleStyleChange={(id, value) =>
                      handleStyleChange(id, value)
                    }
                    disabled={disabled}
                  />
                )
              }

              if (group === 'tooltip') {
                return (
                  <TooltipSection
                    key={group}
                    group={group}
                    options={options}
                    selectedWidget={selectedWidget}
                    handleStyleChange={(id, value) =>
                      handleStyleChange(id, value)
                    }
                    disabled={disabled}
                  />
                )
              }

              if (group === 'trendline') {
                return (
                  <TrendlineSection
                    key={group}
                    group={group}
                    options={options}
                    selectedWidget={selectedWidget}
                    handleStyleChange={(id, value) =>
                      handleStyleChange(id, value)
                    }
                    disabled={disabled}
                  />
                )
              }

              return (
                <OptionGroup
                  key={group}
                  title={t(`styleGroups.${group}`, group)}
                >
                  {options.map((option) => (
                    <StyleOption
                      key={option.id}
                      option={option}
                      value={selectedWidget.styles[option.id]}
                      onChange={(value) => handleStyleChange(option.id, value)}
                      disabled={disabled}
                    />
                  ))}
                </OptionGroup>
              )
            })}

            {styleOptionsByGroup.length === 0 &&
              channelsByTab.style.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  {t('style.noOptions', 'No style options for this chart type')}
                </p>
              )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
