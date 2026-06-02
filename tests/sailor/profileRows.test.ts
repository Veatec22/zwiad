import assert from 'node:assert/strict'
import { test } from 'vitest'

import type { SailorProfile } from '../../src/features/playground/sailor/sailorTypes'
import {
  buildOverviewRows,
  getProfileSummary,
} from '../../src/features/playground/sailor/overview/profileRows'

test('profile rows + summary derivation', () => {
  const profile: SailorProfile = {
    tableName: 'uploaded_data',
    rowCount: 4,
    columns: [
      {
        name: 'Age',
        duckdbType: 'INTEGER',
        semanticType: 'numeric',
      },
      {
        name: 'Cabin',
        duckdbType: 'VARCHAR',
        semanticType: 'text',
      },
      {
        name: 'VIP',
        duckdbType: 'BOOLEAN',
        semanticType: 'boolean',
      },
    ],
    sampleRows: [],
    numericStats: {
      Age: {
        count: 3,
        mean: 31.25,
        std: 12.5,
        min: 18,
        max: 55,
        median: 30,
        '25%': 24,
        '50%': 30,
        '75%': 42,
        skewness: 0.4,
        kurtosis: 2.8,
        zero_counts: 1,
        null_count: 1,
      },
    },
    categoricalStats: {
      Cabin: {
        unique_count: 2,
        null_count: 1,
        topValues: [
          { value: 'B45', count: 2 },
          { value: null, count: 1 },
        ],
      },
      VIP: {
        unique_count: 2,
        null_count: 0,
        topValues: [
          { value: true, count: 3 },
          { value: false, count: 1 },
        ],
      },
    },
    correlation: null,
  }

  assert.deepEqual(getProfileSummary(profile), {
    rows: 4,
    columns: 3,
    numeric: 1,
    text: 1,
    boolean: 1,
    temporal: 0,
  })

  const rows = buildOverviewRows(profile)

  assert.equal(rows.length, 3)
  assert.equal(rows[0]?.name, 'Age')
  assert.equal(rows[0]?.typeLabel, 'Numeric (integer)')
  assert.equal(rows[0]?.nullCount, 1)
  assert.equal(rows[0]?.completenessPercent, 75)
  assert.equal(rows[0]?.numericStats?.q1, 24)
  assert.equal(rows[0]?.numericStats?.median, 30)
  assert.equal(rows[0]?.numericStats?.q3, 42)
  assert.equal(rows[0]?.numericStats?.zeroCount, 1)

  assert.equal(rows[1]?.name, 'Cabin')
  assert.equal(rows[1]?.typeLabel, 'Text')
  assert.equal(rows[1]?.uniqueCount, 2)
  assert.deepEqual(rows[1]?.topValues, [
    { label: 'B45', count: 2 },
    { label: 'null', count: 1 },
  ])

  assert.equal(rows[2]?.name, 'VIP')
  assert.equal(rows[2]?.typeLabel, 'Boolean')
  assert.equal(rows[2]?.completenessPercent, 100)
})
