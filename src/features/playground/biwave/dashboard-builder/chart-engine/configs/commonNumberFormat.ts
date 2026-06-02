import type { StyleOptionDefinition } from './types'

export const commonNumberFormatOptions: StyleOptionDefinition[] = [
  {
    id: 'decimalPlaces',
    labelKey: 'style.decimalPlaces',
    type: 'slider',
    defaultValue: 2,
    min: 0,
    max: 6,
    step: 1,
    tab: 'style',
    group: 'numbers',
    order: 500,
  },
  {
    id: 'numberFormat',
    labelKey: 'style.numberFormat',
    type: 'select',
    defaultValue: 'number',
    options: [
      { value: 'number', labelKey: 'style.numberFormatNumber' },
      { value: 'currency', labelKey: 'style.numberFormatCurrency' },
      { value: 'compact', labelKey: 'style.numberFormatCompact' },
    ],
    tab: 'style',
    group: 'numbers',
    order: 501,
  },
  {
    id: 'currencyCode',
    labelKey: 'style.currencyCode',
    type: 'select',
    defaultValue: 'USD',
    options: [
      { value: 'USD', labelKey: 'style.currencyUSD' },
      { value: 'EUR', labelKey: 'style.currencyEUR' },
      { value: 'PLN', labelKey: 'style.currencyPLN' },
      { value: 'GBP', labelKey: 'style.currencyGBP' },
      { value: 'JPY', labelKey: 'style.currencyJPY' },
    ],
    tab: 'style',
    group: 'numbers',
    order: 502,
  },
]
