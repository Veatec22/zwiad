import assert from 'node:assert/strict'
import { test } from 'vitest'

import { buildResultProfile } from '../../src/features/playground/sailor/overview/resultProfileBuilder'

test('buildResultProfile derives semantic types + stats', () => {
  const profile = buildResultProfile({
    columns: ['Age', 'Name', 'VIP', 'CreatedAt'],
    rows: [
      { Age: 20, Name: 'Ada', VIP: true, CreatedAt: '2026-01-01' },
      { Age: 30, Name: 'Ada', VIP: false, CreatedAt: '2026-01-02' },
      { Age: null, Name: 'Linus', VIP: true, CreatedAt: null },
    ],
  })

  assert.equal(profile.rowCount, 3)
  assert.deepEqual(
    profile.columns.map((column) => [column.name, column.semanticType]),
    [
      ['Age', 'numeric'],
      ['Name', 'text'],
      ['VIP', 'boolean'],
      ['CreatedAt', 'temporal'],
    ],
  )
  assert.equal(profile.numericStats.Age?.count, 2)
  assert.equal(profile.numericStats.Age?.null_count, 1)
  assert.equal(profile.numericStats.Age?.histogramBins.length, 2)
  assert.equal(profile.categoricalStats.Name?.unique_count, 2)
  assert.deepEqual(profile.categoricalStats.Name?.topValues?.[0], {
    count: 2,
    value: 'Ada',
  })
  assert.equal(profile.categoricalStats.VIP?.null_count, 0)
})
