import { Icons } from '@/config/icons'
import { commonNumberFormatOptions } from './commonNumberFormat'
import { commonTooltipOptions } from './commonTooltip'
import type { ChartConfig } from './types'

export const gaugeChartConfig: ChartConfig = {
  type: 'gauge',
  nameKey: 'charts.gauge.name',
  icon: Icons.chartGauge,
  category: 'basic',
  descriptionKey: 'charts.gauge.description',
  supportsOrientation: false,
  supportsStacking: false,

  channels: [
    {
      id: 'value',
      labelKey: 'channels.value',
      placeholderKey: 'channels.valuePlaceholder',
      accepts: 'measure',
      cardinality: 'single',
      required: true,
      defaultAggregation: 'avg',
      icon: Icons.Measures,
      order: 1,
      tab: 'config',
      group: 'data',
    },
    {
      id: 'label',
      labelKey: 'channels.label',
      placeholderKey: 'channels.labelPlaceholder',
      accepts: 'dimension',
      cardinality: 'optional',
      required: false,
      icon: Icons.Dimensions,
      order: 2,
      tab: 'config',
      group: 'data',
    },
  ],

  styleOptions: [
    {
      id: 'min',
      labelKey: 'style.min',
      type: 'number',
      defaultValue: 0,
      tab: 'style',
      group: 'scale',
      order: 1,
    },
    {
      id: 'max',
      labelKey: 'style.max',
      type: 'number',
      defaultValue: 100,
      tab: 'style',
      group: 'scale',
      order: 2,
    },
    {
      id: 'splitNumber',
      labelKey: 'style.splitNumber',
      type: 'slider',
      defaultValue: 5,
      min: 2,
      max: 10,
      step: 1,
      tab: 'style',
      group: 'scale',
      order: 3,
    },
    {
      id: 'showProgress',
      labelKey: 'style.showProgress',
      type: 'toggle',
      defaultValue: true,
      tab: 'style',
      group: 'appearance',
      order: 4,
    },
    {
      id: 'showPointer',
      labelKey: 'style.showPointer',
      type: 'toggle',
      defaultValue: true,
      tab: 'style',
      group: 'appearance',
      order: 5,
    },
    ...commonTooltipOptions,
    ...commonNumberFormatOptions,
  ],

  minRequirements: {
    measures: 1,
  },
}
