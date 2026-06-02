import { Icons } from '@/config/icons'
import { commonNumberFormatOptions } from './commonNumberFormat'
import { commonTooltipOptions } from './commonTooltip'
import type { ChartConfig } from './types'

export const calendarChartConfig: ChartConfig = {
  type: 'calendar',
  nameKey: 'charts.calendar.name',
  icon: Icons.chartCalendar,
  category: 'basic',
  descriptionKey: 'charts.calendar.description',
  supportsOrientation: false,
  supportsStacking: false,

  channels: [
    {
      id: 'date',
      labelKey: 'channels.date',
      placeholderKey: 'channels.datePlaceholder',
      accepts: 'dimension',
      cardinality: 'single',
      required: true,
      icon: Icons.featuredate,
      order: 1,
      tab: 'config',
      group: 'data',
    },
    {
      id: 'value',
      labelKey: 'channels.value',
      placeholderKey: 'channels.valuePlaceholder',
      accepts: 'measure',
      cardinality: 'single',
      required: true,
      defaultAggregation: 'sum',
      icon: Icons.Measures,
      order: 2,
      tab: 'config',
      group: 'data',
    },
  ],

  styleOptions: [
    {
      id: 'cellSize',
      labelKey: 'style.cellSize',
      type: 'slider',
      defaultValue: 13,
      min: 8,
      max: 24,
      step: 1,
      tab: 'style',
      group: 'layout',
      order: 1,
    },
    {
      id: 'calendarOrient',
      labelKey: 'style.orientation',
      type: 'select',
      defaultValue: 'vertical',
      options: [
        { value: 'vertical', labelKey: 'style.orientationVertical' },
        { value: 'horizontal', labelKey: 'style.orientationHorizontal' },
      ],
      tab: 'style',
      group: 'layout',
      order: 2,
    },
    ...commonTooltipOptions,
    ...commonNumberFormatOptions,
  ],

  minRequirements: {
    dimensions: 1,
    measures: 1,
  },
}
