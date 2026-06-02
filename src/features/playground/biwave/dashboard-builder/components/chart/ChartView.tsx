import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import { useEffect, useMemo, useState } from 'react'
import type { ChartType } from '../../chart-engine/configs'

// Local type definitions (moved from old store)
export type Orientation = 'vertical' | 'horizontal'
export type StackMode = boolean

// Data Types

export interface XYPoint {
  x: string | number
  y: number
  color?: string
  size?: number
}

export interface SeriesData {
  name: string
  data: number[]
}

export interface HeatmapPoint {
  x: string | number
  y: string | number
  value: number
}

export interface BoxplotData {
  category: string
  min: number
  q1: number
  median: number
  q3: number
  max: number
}

export interface SankeyNode {
  name: string
}

export interface SankeyLink {
  source: string
  target: string
  value: number
}

export interface TreemapNode {
  name: string
  value?: number
  children?: TreemapNode[]
}

export interface FunnelData {
  name: string
  value: number
}

// Props

interface ChartViewProps {
  type: ChartType
  orientation?: Orientation
  stackMode?: StackMode
  color?: string
  colorPalette?: string[]

  // Direct ECharts options (if provided, skips internal building)
  options?: Record<string, unknown>

  // Standard X/Y data
  data?: XYPoint[]

  // Multi-series data (for stacking, color encoding)
  seriesData?: {
    categories: string[]
    series: SeriesData[]
  }

  // Heatmap data
  heatmapData?: {
    xCategories: string[]
    yCategories: string[]
    data: HeatmapPoint[]
  }

  // Boxplot data
  boxplotData?: BoxplotData[]

  // Sankey data
  sankeyData?: {
    nodes: SankeyNode[]
    links: SankeyLink[]
  }

  // Treemap data
  treemapData?: TreemapNode[]

  // Funnel data
  funnelData?: FunnelData[]

  // Combo chart - which series is line
  secondarySeriesName?: string
}

// Theme Helpers

const COLOR_TOKEN_FALLBACKS = {
  background: '#09090b',
  bg: '#09090b',
  border: '#1f1f23',
  card: '#111113',
  destructive: '#ef4444',
  fg: '#fafafa',
  'fg-2': '#a1a1aa',
  'fg-3': '#71717a',
  foreground: '#fafafa',
  muted: '#18181b',
  'muted-foreground': '#71717a',
  popover: '#111113',
  primary: '#fafafa',
  'secondary-foreground': '#fafafa',
} as const

const COLOR_TOKEN_ALIASES: Record<string, keyof typeof COLOR_TOKEN_FALLBACKS> =
  {
    background: 'bg',
    border: 'border',
    card: 'card',
    destructive: 'destructive',
    foreground: 'fg',
    muted: 'muted',
    'muted-foreground': 'fg-3',
    popover: 'card',
    primary: 'fg',
    'secondary-foreground': 'fg',
  }

const readCssColor = (token: keyof typeof COLOR_TOKEN_FALLBACKS): string => {
  if (typeof window === 'undefined') return COLOR_TOKEN_FALLBACKS[token]

  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(`--${token}`)
    .trim()

  return value || COLOR_TOKEN_FALLBACKS[token]
}

const resolveCssColor = (value: string): string => {
  const tokenMatch = /^(?:hsl\()?var\(--([^)]+)\)\)?$/.exec(value.trim())
  if (!tokenMatch) return value

  const token = tokenMatch[1]
  const resolvedToken =
    COLOR_TOKEN_ALIASES[token] ??
    (token in COLOR_TOKEN_FALLBACKS
      ? (token as keyof typeof COLOR_TOKEN_FALLBACKS)
      : null)

  return resolvedToken ? readCssColor(resolvedToken) : value
}

const resolveOptionColors = (value: unknown): unknown => {
  if (typeof value === 'string') return resolveCssColor(value)
  if (Array.isArray(value)) return value.map(resolveOptionColors)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      resolveOptionColors(entry),
    ]),
  )
}

const useThemeRevision = () => {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setRevision((current) => current + 1)
    })

    observer.observe(document.documentElement, {
      attributeFilter: ['class', 'data-theme'],
      attributes: true,
    })

    return () => observer.disconnect()
  }, [])

  return revision
}

const getThemeColors = () => ({
  text: readCssColor('fg'),
  textMuted: readCssColor('fg-3'),
  border: readCssColor('border'),
  background: readCssColor('bg'),
  popover: readCssColor('card'),
  popoverForeground: readCssColor('fg'),
})

const DEFAULT_PALETTE = [
  '#4e79a7',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc948',
  '#b07aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ac',
]

// Base Options

const getBaseOption = (): Partial<EChartsOption> => {
  const theme = getThemeColors()
  return {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 400,
    animationEasing: 'cubicOut',
    textStyle: {
      fontFamily: 'inherit',
    },
    grid: {
      left: 60,
      right: 20,
      top: 40,
      bottom: 60,
      containLabel: false,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.popover,
      borderColor: theme.border,
      borderWidth: 1,
      textStyle: {
        color: theme.popoverForeground,
        fontSize: 12,
      },
    },
  }
}

const getAxisConfig = (isCategory: boolean, data?: string[]) => {
  const theme = getThemeColors()
  return {
    type: isCategory ? 'category' : 'value',
    data: isCategory ? data : undefined,
    axisLine: {
      lineStyle: { color: theme.border },
    },
    axisTick: { show: false },
    axisLabel: {
      color: theme.textMuted,
      fontSize: 11,
    },
    splitLine: {
      lineStyle: {
        color: theme.border,
        type: 'dashed' as const,
        opacity: 0.5,
      },
    },
  }
}

// Chart Builders

function buildBarLineArea(
  props: ChartViewProps,
  chartType: 'bar' | 'line' | 'area',
): EChartsOption {
  const {
    data = [],
    seriesData,
    orientation = 'vertical',
    stackMode = false,
    color,
    colorPalette = DEFAULT_PALETTE,
  } = props

  const isHorizontal = orientation === 'horizontal'
  const isStacked = stackMode
  // const isNormalized = false; // Removed normalized support

  // Use seriesData if available (multi-series), otherwise convert simple data
  let categories: string[]
  let series: Array<{
    name: string
    type: 'bar' | 'line'
    data: number[]
    stack?: string
    areaStyle?: object
    itemStyle?: object
    lineStyle?: object
    emphasis?: object
  }>

  if (seriesData) {
    categories = seriesData.categories
    series = seriesData.series.map((s, i) => ({
      name: s.name,
      type: chartType === 'area' ? 'line' : chartType,
      data: s.data,
      stack: isStacked ? 'total' : undefined,
      areaStyle: chartType === 'area' ? { opacity: 0.4 } : undefined,
      itemStyle: {
        color: colorPalette[i % colorPalette.length],
        borderRadius:
          chartType === 'bar'
            ? isHorizontal
              ? [0, 4, 4, 0]
              : [4, 4, 0, 0]
            : undefined,
      },
      lineStyle: chartType !== 'bar' ? { width: 2 } : undefined,
      emphasis: { focus: 'series' },
    }))
  } else {
    categories = data.map((d) => String(d.x))
    series = [
      {
        name: 'Value',
        type: chartType === 'area' ? 'line' : chartType,
        data: data.map((d) => d.y),
        areaStyle:
          chartType === 'area'
            ? {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: color || colorPalette[0] },
                    { offset: 1, color: 'transparent' },
                  ],
                },
                opacity: 0.3,
              }
            : undefined,
        itemStyle: {
          color: color || colorPalette[0],
          borderRadius:
            chartType === 'bar'
              ? isHorizontal
                ? [0, 4, 4, 0]
                : [4, 4, 0, 0]
              : undefined,
        },
        lineStyle:
          chartType !== 'bar'
            ? { width: 2, color: color || colorPalette[0] }
            : undefined,
      },
    ]
  }

  const categoryAxis = {
    ...getAxisConfig(true, categories),
    axisLabel: {
      ...getAxisConfig(true).axisLabel,
      rotate: !isHorizontal && categories.length > 10 ? 45 : 0,
    },
  }

  const valueAxis = {
    ...getAxisConfig(false),
    max: undefined,
    axisLabel: {
      ...getAxisConfig(false).axisLabel,
      formatter: (value: number) => {
        if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
        if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
        return value.toString()
      },
    },
  }

  return {
    ...getBaseOption(),
    legend:
      seriesData && seriesData.series.length > 1 ? { top: 10 } : undefined,
    xAxis: isHorizontal ? valueAxis : categoryAxis,
    yAxis: isHorizontal ? categoryAxis : valueAxis,
    series,
    color: colorPalette,
  } as EChartsOption
}

function buildCombo(props: ChartViewProps): EChartsOption {
  const {
    seriesData,
    orientation = 'vertical',
    colorPalette = DEFAULT_PALETTE,
    secondarySeriesName,
  } = props

  if (!seriesData) return getBaseOption() as EChartsOption

  const isHorizontal = orientation === 'horizontal'
  const categories = seriesData.categories

  const series = seriesData.series.map((s, i) => {
    const isSecondary = s.name === secondarySeriesName
    return {
      name: s.name,
      type: isSecondary ? 'line' : 'bar',
      yAxisIndex: isSecondary ? 1 : 0,
      data: s.data,
      itemStyle: {
        color: colorPalette[i % colorPalette.length],
        borderRadius: !isSecondary ? [4, 4, 0, 0] : undefined,
      },
      lineStyle: isSecondary ? { width: 2 } : undefined,
      symbol: isSecondary ? 'circle' : undefined,
      symbolSize: isSecondary ? 6 : undefined,
    }
  })

  const categoryAxis = getAxisConfig(true, categories)
  const valueAxis = getAxisConfig(false)

  return {
    ...getBaseOption(),
    legend: { top: 10 },
    xAxis: isHorizontal ? [valueAxis, valueAxis] : categoryAxis,
    yAxis: isHorizontal
      ? categoryAxis
      : [
          { ...valueAxis, name: 'Primary' },
          { ...valueAxis, name: 'Secondary', position: 'right' },
        ],
    series,
    color: colorPalette,
  } as EChartsOption
}

function buildScatter(props: ChartViewProps): EChartsOption {
  const { data = [], color, colorPalette = DEFAULT_PALETTE } = props

  const sizes = data
    .map((d) => (typeof d.size === 'number' ? d.size : null))
    .filter((v): v is number => v !== null && Number.isFinite(v))
  const minSize = sizes.length > 0 ? Math.min(...sizes) : 0
  const maxSize = sizes.length > 0 ? Math.max(...sizes) : 0
  const hasSize = sizes.length > 0 && maxSize !== minSize

  const scaleSize = (raw: number) => {
    if (!hasSize) return 10
    const t = (raw - minSize) / (maxSize - minSize)
    return 6 + t * 24
  }

  return {
    ...getBaseOption(),
    tooltip: {
      ...getBaseOption().tooltip,
      trigger: 'item',
    },
    xAxis: getAxisConfig(false),
    yAxis: getAxisConfig(false),
    series: [
      {
        type: 'scatter',
        data: data.map((d) => [d.x, d.y, d.size ?? null]),
        symbolSize: (value: unknown) => {
          if (!Array.isArray(value)) return 10
          const raw = Number(value[2])
          return Number.isFinite(raw) ? scaleSize(raw) : 10
        },
        itemStyle: {
          color: color || colorPalette[0],
          opacity: 0.7,
        },
        emphasis: {
          itemStyle: { opacity: 1 },
        },
      },
    ],
  } as EChartsOption
}

function buildPie(props: ChartViewProps): EChartsOption {
  const { data = [], colorPalette = DEFAULT_PALETTE } = props
  const theme = getThemeColors()

  return {
    backgroundColor: 'transparent',
    animation: true,
    tooltip: {
      trigger: 'item',
      backgroundColor: theme.popover,
      borderColor: theme.border,
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: theme.text },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: theme.background,
          borderWidth: 2,
        },
        label: {
          show: true,
          color: theme.text,
          fontSize: 11,
        },
        emphasis: {
          label: { fontWeight: 'bold' },
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
          },
        },
        data: data.map((d, i) => ({
          name: String(d.x),
          value: d.y,
          itemStyle: { color: colorPalette[i % colorPalette.length] },
        })),
      },
    ],
  } as EChartsOption
}

function buildHeatmap(props: ChartViewProps): EChartsOption {
  const { heatmapData } = props
  const theme = getThemeColors()

  if (!heatmapData) return getBaseOption() as EChartsOption

  const { xCategories, yCategories, data } = heatmapData

  // Find min/max for visualMap
  const values = data.map((d) => d.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)

  return {
    ...getBaseOption(),
    tooltip: {
      ...getBaseOption().tooltip,
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { data: [number, number, number] }
        return `${xCategories[p.data[0]]} × ${yCategories[p.data[1]]}: ${p.data[2]}`
      },
    },
    grid: {
      ...getBaseOption().grid,
      top: 40,
      bottom: 100,
    },
    xAxis: {
      type: 'category',
      data: xCategories,
      splitArea: { show: true },
      axisLabel: {
        color: theme.textMuted,
        fontSize: 11,
        rotate: xCategories.length > 10 ? 45 : 0,
      },
    },
    yAxis: {
      type: 'category',
      data: yCategories,
      splitArea: { show: true },
      axisLabel: { color: theme.textMuted, fontSize: 11 },
    },
    visualMap: {
      min: minVal,
      max: maxVal,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      inRange: {
        color: [
          '#f7fbff',
          '#deebf7',
          '#c6dbef',
          '#9ecae1',
          '#6baed6',
          '#4292c6',
          '#2171b5',
          '#084594',
        ],
      },
      textStyle: { color: theme.textMuted },
    },
    series: [
      {
        type: 'heatmap',
        data: data.map((d) => [
          xCategories.indexOf(String(d.x)),
          yCategories.indexOf(String(d.y)),
          d.value,
        ]),
        label: { show: data.length < 100, color: theme.text, fontSize: 10 },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  } as EChartsOption
}

function buildBoxplot(props: ChartViewProps): EChartsOption {
  const { boxplotData = [], colorPalette = DEFAULT_PALETTE } = props
  const theme = getThemeColors()

  const categories = boxplotData.map((d) => d.category)
  const boxData = boxplotData.map((d) => [d.min, d.q1, d.median, d.q3, d.max])

  return {
    ...getBaseOption(),
    tooltip: {
      trigger: 'item',
      backgroundColor: theme.popover,
      borderColor: theme.border,
      formatter: (params: unknown) => {
        const p = params as { name: string; data: number[] }
        return `
					<strong>${p.name}</strong><br/>
					Max: ${p.data[4]}<br/>
					Q3: ${p.data[3]}<br/>
					Median: ${p.data[2]}<br/>
					Q1: ${p.data[1]}<br/>
					Min: ${p.data[0]}
				`
      },
    },
    xAxis: {
      type: 'category',
      data: categories,
      boundaryGap: true,
      axisLabel: { color: theme.textMuted, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: theme.textMuted, fontSize: 11 },
      splitLine: {
        lineStyle: { color: theme.border, type: 'dashed', opacity: 0.5 },
      },
    },
    series: [
      {
        type: 'boxplot',
        data: boxData,
        itemStyle: {
          color: colorPalette[0],
          borderColor: colorPalette[1],
        },
      },
    ],
  } as EChartsOption
}

function buildFunnel(props: ChartViewProps): EChartsOption {
  const { funnelData = [], colorPalette = DEFAULT_PALETTE } = props
  const theme = getThemeColors()

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: theme.popover,
      borderColor: theme.border,
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      top: 10,
      textStyle: { color: theme.text },
    },
    series: [
      {
        type: 'funnel',
        left: '10%',
        top: 60,
        bottom: 20,
        width: '80%',
        min: 0,
        max: Math.max(...funnelData.map((d) => d.value)),
        minSize: '0%',
        maxSize: '100%',
        sort: 'descending',
        gap: 2,
        label: {
          show: true,
          position: 'inside',
          color: '#fff',
          fontSize: 12,
        },
        itemStyle: {
          borderColor: theme.background,
          borderWidth: 1,
        },
        emphasis: {
          label: { fontSize: 14 },
        },
        data: funnelData.map((d, i) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: colorPalette[i % colorPalette.length] },
        })),
      },
    ],
  } as EChartsOption
}

function buildSankey(props: ChartViewProps): EChartsOption {
  const { sankeyData, colorPalette = DEFAULT_PALETTE } = props
  const theme = getThemeColors()

  if (!sankeyData) return getBaseOption() as EChartsOption

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: theme.popover,
      borderColor: theme.border,
      triggerOn: 'mousemove',
    },
    series: [
      {
        type: 'sankey',
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'justify',
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
        },
        label: {
          color: theme.text,
          fontSize: 11,
        },
        data: sankeyData.nodes.map((n, i) => ({
          ...n,
          itemStyle: { color: colorPalette[i % colorPalette.length] },
        })),
        links: sankeyData.links,
      },
    ],
    color: colorPalette,
  } as EChartsOption
}

function buildTreemap(props: ChartViewProps): EChartsOption {
  const { treemapData = [], colorPalette = DEFAULT_PALETTE } = props
  const theme = getThemeColors()

  return {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: theme.popover,
      borderColor: theme.border,
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number }
        return `${p.name}: ${p.value?.toLocaleString() ?? 'N/A'}`
      },
    },
    series: [
      {
        type: 'treemap',
        roam: false,
        nodeClick: 'zoomToNode',
        breadcrumb: {
          show: true,
          bottom: 10,
          itemStyle: {
            color: theme.background,
            borderColor: theme.border,
            textStyle: { color: theme.text },
          },
        },
        label: {
          show: true,
          formatter: '{b}',
          color: '#fff',
          fontSize: 12,
        },
        itemStyle: {
          borderColor: theme.background,
          borderWidth: 2,
          gapWidth: 2,
        },
        levels: [
          {
            itemStyle: {
              borderColor: theme.border,
              borderWidth: 2,
              gapWidth: 2,
            },
          },
          {
            colorSaturation: [0.35, 0.5],
            itemStyle: {
              borderColorSaturation: 0.6,
              gapWidth: 1,
            },
          },
        ],
        data: treemapData,
      },
    ],
    color: colorPalette,
  } as EChartsOption
}

// Main Component

export function ChartView(props: ChartViewProps) {
  const { type, options: directOptions, colorPalette = DEFAULT_PALETTE } = props
  const themeRevision = useThemeRevision()

  const option = useMemo<EChartsOption>(() => {
    void themeRevision

    // If direct options provided, merge with base options and return
    if (directOptions) {
      return resolveOptionColors({
        ...getBaseOption(),
        ...directOptions,
        color: directOptions.color || colorPalette,
      }) as EChartsOption
    }

    // Otherwise build from props
    let builtOption: EChartsOption
    switch (type) {
      case 'bar':
        builtOption = buildBarLineArea(props, 'bar')
        break
      case 'line':
        builtOption = buildBarLineArea(props, 'line')
        break
      case 'area':
        builtOption = buildBarLineArea(props, 'area')
        break
      case 'combo':
        builtOption = buildCombo(props)
        break
      case 'scatter':
        builtOption = buildScatter(props)
        break
      case 'pie':
        builtOption = buildPie(props)
        break
      case 'heatmap':
        builtOption = buildHeatmap(props)
        break
      case 'boxplot':
        builtOption = buildBoxplot(props)
        break
      case 'funnel':
        builtOption = buildFunnel(props)
        break
      case 'sankey':
        builtOption = buildSankey(props)
        break
      case 'treemap':
        builtOption = buildTreemap(props)
        break
      default:
        builtOption = buildBarLineArea(props, 'bar')
    }

    return resolveOptionColors(builtOption) as EChartsOption
  }, [props, type, directOptions, colorPalette, themeRevision])

  return (
    <div className="w-full h-full min-h-0">
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  )
}
