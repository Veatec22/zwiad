import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'

import type { OverviewNumericStats } from './profileRows'

function formatStat(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-'
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }

  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  })
}

export function CompletionDonut({
  nullCount,
  percent,
  rowCount,
}: {
  nullCount: number
  percent: number
  rowCount: number
}) {
  const clampedPercent = Math.max(0, Math.min(100, percent))
  const nullPercent =
    rowCount > 0 ? Math.max(0, Math.min(100, (nullCount / rowCount) * 100)) : 0
  const completeCount = Math.max(0, rowCount - nullCount)
  const option = {
    animation: false,
    color: ['var(--fg)', 'var(--border-strong)'],
    series: [
      {
        type: 'pie',
        radius: ['70%', '92%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        data: [
          { name: 'Complete', value: completeCount },
          { name: 'Null', value: nullCount },
        ],
      },
    ],
    tooltip: {
      appendToBody: true,
      confine: true,
      formatter: '{b}: {d}% ({c})',
      trigger: 'item',
    },
  } satisfies EChartsOption

  return (
    <div className="relative size-10">
      <ReactECharts
        aria-label={`${clampedPercent.toFixed(
          1,
        )}% complete, ${nullPercent.toFixed(1)}% null`}
        className="size-10"
        notMerge={true}
        option={option}
        opts={{ renderer: 'svg' }}
        style={{ height: 40, width: 40 }}
      />
      <span className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-1/2 left-1/2 font-semibold text-[9px]">
        {clampedPercent.toFixed(0)}%
      </span>
    </div>
  )
}

export function HistogramMiniChart({
  stats,
}: {
  stats: OverviewNumericStats | null
}) {
  if (!stats?.histogramBins.length) {
    return (
      <div className="text-muted-foreground text-xs">
        Range {formatStat(stats?.min ?? null, 2)}
      </div>
    )
  }

  const option = {
    animation: false,
    grid: {
      bottom: 2,
      containLabel: false,
      left: 2,
      right: 2,
      top: 4,
    },
    tooltip: {
      appendToBody: true,
      confine: true,
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    xAxis: {
      type: 'category',
      data: stats.histogramBins.map((bin) => bin.label),
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    series: [
      {
        name: 'Rows',
        type: 'bar',
        data: stats.histogramBins.map((bin) => bin.count),
        barCategoryGap: '18%',
        itemStyle: {
          borderRadius: [2, 2, 0, 0],
          color: 'var(--fg)',
        },
      },
    ],
  } satisfies EChartsOption

  return (
    <div className="min-w-0">
      <ReactECharts
        aria-label={`Histogram ${formatStat(stats.min, 2)} to ${formatStat(
          stats.max,
          2,
        )}`}
        className="h-12 w-full"
        notMerge={true}
        option={option}
        opts={{ renderer: 'svg' }}
        style={{ height: 48, width: '100%' }}
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{formatStat(stats.min, 1)}</span>
        <span>{formatStat(stats.max, 1)}</span>
      </div>
    </div>
  )
}

export function NumericStatsLine({
  stats,
}: {
  stats: OverviewNumericStats | null
}) {
  if (!stats) {
    return null
  }

  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
      <span>
        Mean:{' '}
        <span className="font-mono text-foreground">
          {formatStat(stats.mean)}
        </span>
      </span>
      <span>
        Std:{' '}
        <span className="font-mono text-foreground">
          {formatStat(stats.std)}
        </span>
      </span>
      <span>
        Zeros:{' '}
        <span className="font-mono text-foreground">
          {formatStat(stats.zeroCount, 0)}
        </span>
      </span>
      <span>
        Skew:{' '}
        <span className="font-mono text-foreground">
          {formatStat(stats.skewness)}
        </span>
      </span>
    </div>
  )
}
