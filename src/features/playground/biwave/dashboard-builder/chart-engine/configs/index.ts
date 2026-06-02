import { areaChartConfig } from './area'
import { barChartConfig } from './bar'
import { boxplotChartConfig } from './boxplot'
import { calendarChartConfig } from './calendar'
import { comboChartConfig } from './combo'
import { funnelChartConfig } from './funnel'
import { gaugeChartConfig } from './gauge'
import { heatmapChartConfig } from './heatmap'
import { lineChartConfig } from './line'
import { pieChartConfig } from './pie'
import { radarChartConfig } from './radar'
import { sankeyChartConfig } from './sankey'
import { scatterChartConfig } from './scatter'
import { treemapChartConfig } from './treemap'
import type { ChartConfig } from './types'

// Re-export types
export * from './types'

// Chart Type enum

export type ChartType =
  | 'bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'scatter'
  | 'radar'
  | 'heatmap'
  | 'gauge'
  | 'calendar'
  | 'funnel'
  | 'sankey'
  | 'treemap'
  | 'boxplot'
  | 'combo'

// Registry

export const chartConfigs: Record<ChartType, ChartConfig> = {
  bar: barChartConfig,
  line: lineChartConfig,
  area: areaChartConfig,
  pie: pieChartConfig,
  scatter: scatterChartConfig,
  radar: radarChartConfig,
  heatmap: heatmapChartConfig,
  gauge: gaugeChartConfig,
  calendar: calendarChartConfig,
  funnel: funnelChartConfig,
  sankey: sankeyChartConfig,
  treemap: treemapChartConfig,
  boxplot: boxplotChartConfig,
  combo: comboChartConfig,
}

// Helpers

export function getChartConfig(type: ChartType): ChartConfig {
  return chartConfigs[type]
}

export function getAllChartTypes(): ChartType[] {
  return Object.keys(chartConfigs) as ChartType[]
}

export function getChartsByCategory(
  category: ChartConfig['category'],
): ChartConfig[] {
  return Object.values(chartConfigs).filter((c) => c.category === category)
}

export function getCategories(): ChartConfig['category'][] {
  const categories = new Set(Object.values(chartConfigs).map((c) => c.category))
  return Array.from(categories)
}

export function getCategoryLabel(category: ChartConfig['category']): string {
  const labels: Record<ChartConfig['category'], string> = {
    basic: 'chartCategories.basic',
    distribution: 'chartCategories.distribution',
    relationship: 'chartCategories.relationship',
    hierarchy: 'chartCategories.hierarchy',
    flow: 'chartCategories.flow',
  }
  return labels[category]
}

/**
 * Get default channel values for a chart type
 */
export function getDefaultChannelState(
  type: ChartType,
): Record<string, unknown[]> {
  const config = getChartConfig(type)
  const state: Record<string, unknown[]> = {}

  for (const channel of config.channels) {
    state[channel.id] = []
  }

  return state
}

/**
 * Get default style values for a chart type
 */
export function getDefaultStyleState(type: ChartType): Record<string, unknown> {
  const config = getChartConfig(type)
  const state: Record<string, unknown> = {}

  for (const option of config.styleOptions) {
    state[option.id] = option.defaultValue
  }

  return state
}

/**
 * Check if a chart can be rendered with current channel state
 */
export function canRenderChart(
  type: ChartType,
  channelState: Record<string, unknown[]>,
): boolean {
  const config = getChartConfig(type)

  // Check required channels have at least one field
  for (const channel of config.channels) {
    if (channel.required) {
      const fields = channelState[channel.id] || []
      if (fields.length === 0) return false
    }
  }

  // Check minimum requirements
  if (config.minRequirements) {
    let dimensionCount = 0
    let measureCount = 0

    for (const channel of config.channels) {
      const fields = channelState[channel.id] || []
      if (channel.accepts === 'dimension') {
        dimensionCount += fields.length
      } else if (channel.accepts === 'measure') {
        measureCount += fields.length
      }
    }

    if (
      config.minRequirements.dimensions &&
      dimensionCount < config.minRequirements.dimensions
    ) {
      return false
    }
    if (
      config.minRequirements.measures &&
      measureCount < config.minRequirements.measures
    ) {
      return false
    }
  }

  return true
}
