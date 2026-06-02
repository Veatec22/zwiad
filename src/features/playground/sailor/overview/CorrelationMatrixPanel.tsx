import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import { useEffect, useMemo, useState } from 'react'

import type { SailorProfile } from '../sailorTypes'

interface ChartThemeColors {
  background: string
  borderStrong: string
  foreground: string
  foregroundMuted: string
  foregroundSubtle: string
}

const fallbackColors: ChartThemeColors = {
  background: '#09090b',
  borderStrong: '#27272a',
  foreground: '#fafafa',
  foregroundMuted: '#71717a',
  foregroundSubtle: '#52525b',
}

function formatColumnName(name: string) {
  return name.length > 10 ? `${name.slice(0, 10)}...` : name
}

function hexToRgb(hex: string) {
  const normalized = hex.trim().replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized

  if (value.length !== 6) {
    return null
  }

  const parsed = Number.parseInt(value, 16)

  if (!Number.isFinite(parsed)) {
    return null
  }

  return {
    b: parsed & 255,
    g: (parsed >> 8) & 255,
    r: (parsed >> 16) & 255,
  }
}

function mixColor(from: string, to: string, amount: number) {
  const fromRgb = hexToRgb(from)
  const toRgb = hexToRgb(to)

  if (!fromRgb || !toRgb) {
    return to
  }

  const clamped = Math.max(0, Math.min(1, amount))
  const mix = (start: number, end: number) =>
    Math.round(start + (end - start) * clamped)

  return `rgb(${mix(fromRgb.r, toRgb.r)}, ${mix(fromRgb.g, toRgb.g)}, ${mix(
    fromRgb.b,
    toRgb.b,
  )})`
}

function getCorrelationColor(value: number, colors: ChartThemeColors) {
  const clamped = Math.max(-1, Math.min(1, value))

  if (clamped >= 0) {
    return mixColor(colors.borderStrong, colors.foreground, clamped)
  }

  return mixColor(
    colors.borderStrong,
    colors.foregroundSubtle,
    Math.abs(clamped),
  )
}

function readThemeColors() {
  if (typeof window === 'undefined') {
    return fallbackColors
  }

  const styles = window.getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback

  return {
    background: read('--bg', fallbackColors.background),
    borderStrong: read('--border-strong', fallbackColors.borderStrong),
    foreground: read('--fg', fallbackColors.foreground),
    foregroundMuted: read('--fg-3', fallbackColors.foregroundMuted),
    foregroundSubtle: read('--fg-4', fallbackColors.foregroundSubtle),
  }
}

function useChartThemeColors() {
  const [colors, setColors] = useState(readThemeColors)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync colors from the document theme (external) on mount and on theme change
    setColors(readThemeColors())

    const observer = new MutationObserver(() => {
      setColors(readThemeColors())
    })

    observer.observe(document.documentElement, {
      attributeFilter: ['class', 'data-theme'],
      attributes: true,
    })

    return () => observer.disconnect()
  }, [])

  return colors
}

function getTooltipValue(params: unknown) {
  if (!params || typeof params !== 'object') {
    return null
  }

  const rawData = (params as { data?: unknown }).data
  const data =
    rawData && typeof rawData === 'object' && 'value' in rawData
      ? (rawData as { value?: unknown }).value
      : rawData

  if (!Array.isArray(data) || data.length < 3) {
    return null
  }

  const xIndex = Number(data[0])
  const yIndex = Number(data[1])
  const value = Number(data[2])

  if (
    !Number.isInteger(xIndex) ||
    !Number.isInteger(yIndex) ||
    !Number.isFinite(value)
  ) {
    return null
  }

  return { value, xIndex, yIndex }
}

function CorrelationHeatmap({
  columns,
  correlation,
}: {
  columns: string[]
  correlation: Record<string, Record<string, number>>
}) {
  const colors = useChartThemeColors()
  const data = useMemo(
    () =>
      columns.flatMap((rowColumn, yIndex) =>
        columns.map((column, xIndex) => {
          const value = correlation[rowColumn]?.[column] ?? 0

          return {
            itemStyle: {
              color: getCorrelationColor(value, colors),
            },
            value: [xIndex, yIndex, value],
          }
        }),
      ),
    [colors, columns, correlation],
  )
  const chartHeight = Math.max(220, columns.length * 28 + 84)
  const option = useMemo(
    () =>
      ({
        animation: false,
        grid: {
          bottom: 24,
          containLabel: true,
          left: 56,
          right: 8,
          top: 42,
        },
        tooltip: {
          appendToBody: true,
          confine: true,
          trigger: 'item',
          formatter: (params: unknown) => {
            const tooltipValue = getTooltipValue(params)
            if (!tooltipValue) {
              return ''
            }

            const rowColumn = columns[tooltipValue.yIndex] ?? ''
            const column = columns[tooltipValue.xIndex] ?? ''

            return `${rowColumn} x ${column}: ${tooltipValue.value.toFixed(3)}`
          },
        },
        visualMap: {
          show: false,
          dimension: 2,
          min: -1,
          max: 1,
        },
        xAxis: {
          type: 'category',
          data: columns,
          axisLabel: {
            color: colors.foregroundMuted,
            fontSize: 9,
            formatter: formatColumnName,
            interval: 0,
            rotate: 45,
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitArea: { show: false },
        },
        yAxis: {
          type: 'category',
          data: columns,
          inverse: true,
          axisLabel: {
            color: colors.foregroundMuted,
            fontSize: 10,
            formatter: formatColumnName,
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitArea: { show: false },
        },
        series: [
          {
            type: 'heatmap',
            data,
            emphasis: {
              itemStyle: {
                borderColor: colors.foreground,
                borderWidth: 1,
              },
            },
            itemStyle: {
              borderColor: colors.background,
              borderRadius: 3,
              borderWidth: 1,
            },
          },
        ],
      }) satisfies EChartsOption,
    [colors, columns, data],
  )

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <ReactECharts
        className="w-full"
        notMerge={true}
        option={option}
        opts={{ renderer: 'svg' }}
        style={{ height: chartHeight, width: '100%' }}
      />
    </div>
  )
}

export function CorrelationMatrixPanel({
  correlation,
}: {
  correlation: SailorProfile['correlation']
}) {
  if (!correlation) {
    return (
      <div className="grid min-h-56 place-items-center rounded-md border border-dashed bg-muted/20 p-4 text-center text-muted-foreground text-sm">
        Correlation needs at least two numeric columns.
      </div>
    )
  }

  if (typeof correlation === 'string') {
    return (
      <div className="grid min-h-56 place-items-center rounded-md border border-dashed bg-muted/20 p-4 text-center text-muted-foreground text-sm">
        {correlation}
      </div>
    )
  }

  const columns = Object.keys(correlation)

  if (columns.length === 0) {
    return (
      <div className="grid min-h-56 place-items-center rounded-md border border-dashed bg-muted/20 p-4 text-center text-muted-foreground text-sm">
        No correlation data available.
      </div>
    )
  }

  return <CorrelationHeatmap columns={columns} correlation={correlation} />
}
