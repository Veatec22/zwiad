import { Icons } from '@/config/icons'
import { commonLabelOptions } from './commonLabel'
import { commonNumberFormatOptions } from './commonNumberFormat'
import { commonTooltipOptions } from './commonTooltip'
import type { ChartConfig } from './types'

export const treemapChartConfig: ChartConfig = {
  type: 'treemap',
  nameKey: 'charts.treemap.name',
  icon: Icons.chartTreemap,
  category: 'hierarchy',
  descriptionKey: 'charts.treemap.description',
  supportsOrientation: false,
  supportsStacking: false,
  channels: [
    {
      id: 'hierarchy',
      labelKey: 'channels.hierarchy',
      placeholderKey: 'channels.hierarchyPlaceholder',
      accepts: 'dimension',
      cardinality: 'multiple',
      required: true,
      descriptionKey: 'channels.hierarchyDescription',
      icon: Icons.Dimensions,
      order: 1,
      tab: 'config',
      group: 'structure',
    },
    {
      id: 'size',
      labelKey: 'channels.size',
      placeholderKey: 'channels.sizeTreemapPlaceholder',
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
    ...commonLabelOptions,
    {
      id: 'percentageMode',
      labelKey: 'style.percentageMode',
      type: 'select',
      defaultValue: 'none',
      options: [
        { value: 'none', labelKey: 'style.displayMode.none' },
        { value: 'percentage', labelKey: 'style.displayMode.percentage' },
        {
          value: 'value_percentage',
          labelKey: 'style.displayMode.valuePercentage',
        },
      ],
      tab: 'style',
      group: 'labels',
      order: 10,
    },
    {
      id: 'showBorder',
      labelKey: 'style.showBorder',
      type: 'toggle',
      defaultValue: true,
      tab: 'style',
      group: 'grid',
      order: 11,
    },
    {
      id: 'borderWidth',
      labelKey: 'style.borderWidth',
      type: 'slider',
      defaultValue: 2,
      min: 0,
      max: 6,
      step: 1,
      tab: 'style',
      group: 'grid',
      order: 12,
    },
    {
      id: 'borderColor',
      labelKey: 'style.borderColor',
      type: 'color',
      defaultValue: 'hsl(var(--background))',
      tab: 'style',
      group: 'grid',
      order: 13,
    },
    ...commonTooltipOptions,
    ...commonNumberFormatOptions,
  ],
  minRequirements: {
    dimensions: 1,
    measures: 1,
  },
}
