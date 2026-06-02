import type { ElementType, SVGProps } from 'react'
import type { Aggregation, SemanticType } from '../types'

export type ChannelType = 'dimension' | 'measure' | 'any'

export type ChannelCardinality = 'single' | 'optional' | 'multiple'

export type IconComponent = ElementType<SVGProps<SVGSVGElement>>

export interface ChannelDefinition {
  id: string
  labelKey: string
  placeholderKey: string
  accepts: ChannelType
  cardinality: ChannelCardinality
  required: boolean
  descriptionKey?: string
  defaultAggregation?: Aggregation
  allowAggregation?: boolean
  icon?: IconComponent
  order: number
  tab: 'config' | 'style'
  group?: string
}

export interface StyleOptionDefinition {
  id: string
  labelKey: string
  type: 'select' | 'toggle' | 'color' | 'number' | 'slider' | 'toggle-group'
  defaultValue: unknown
  options?: Array<{ value: string; labelKey: string }>
  min?: number
  max?: number
  step?: number
  tab: 'config' | 'style'
  group?: string
  order: number
}

export interface ChartConfig {
  type: string
  nameKey: string
  icon: IconComponent
  category: 'basic' | 'distribution' | 'relationship' | 'hierarchy' | 'flow'
  descriptionKey: string
  channels: ChannelDefinition[]
  styleOptions: StyleOptionDefinition[]
  minRequirements?: {
    dimensions?: number
    measures?: number
  }
  supportsOrientation?: boolean
  supportsStacking?: boolean
  previewSvg?: string
}

export interface EncodedFieldValue {
  name: string
  semanticType: SemanticType
  aggregation?: Aggregation
}

export interface ChannelState {
  channelId: string
  fields: EncodedFieldValue[]
}

export type ChannelValue<C extends ChannelCardinality> = C extends 'single'
  ? EncodedFieldValue
  : C extends 'optional'
    ? EncodedFieldValue | null
    : EncodedFieldValue[]
