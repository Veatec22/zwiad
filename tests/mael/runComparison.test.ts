import { describe, expect, test } from 'vitest'

import { compareRunToActive } from '../../src/features/playground/mael/maelRunComparison'
import type { MaelRun } from '../../src/features/playground/mael/maelTypes'

function run(overrides: Partial<MaelRun>): MaelRun {
  return {
    bestIteration: 20,
    datasetHash: 'hash',
    excludedFeatures: [],
    hyperparams: {
      class_weight_balanced: false,
      colsample_bytree: 0.9,
      gamma: 0,
      learning_rate: 0.08,
      max_depth: 4,
      min_child_weight: 1,
      n_estimators: 80,
      reg_alpha: 0,
      reg_lambda: 1,
      scale_pos_weight: 1,
      subsample: 0.9,
    },
    imbalanceCorrected: false,
    isPreviousDataset: false,
    hasLeakageWarning: false,
    missingStrategy: 'native',
    ordering: 'random',
    pinned: false,
    primaryMetric: { label: 'F1 weighted', value: 0.82 },
    randomState: 42,
    resolvedTask: 'binary',
    reviewWarningCount: 0,
    runId: 'run-1',
    target: 'bought',
    timestamp: '2026-05-17T00:00:00.000Z',
    validation: 'holdout',
    ...overrides,
  }
}

describe('compareRunToActive', () => {
  const active = run({ primaryMetric: { label: 'F1 weighted', value: 0.8 } })

  test('higher-is-better metric → improvement with formatted delta', () => {
    expect(compareRunToActive(run({}), active)).toEqual({
      comparable: true,
      direction: 'improvement',
      reason: undefined,
      text: '+0.0200',
    })
  })

  test('lower-is-better metric (RMSE) inverts direction', () => {
    expect(
      compareRunToActive(
        run({ primaryMetric: { label: 'RMSE', value: 1.2 } }),
        run({ primaryMetric: { label: 'RMSE', value: 1.0 } }),
      ).direction,
    ).toBe('regression')
  })

  test('different validation regime → not comparable', () => {
    expect(compareRunToActive(run({ validation: 'cv' }), active)).toEqual({
      comparable: false,
      direction: 'neutral',
      reason: 'different-validation',
      text: '—',
    })
  })

  test('different ordering regime → not comparable', () => {
    expect(
      compareRunToActive(run({ ordering: 'time', timeColumn: 'date' }), active)
        .reason,
    ).toBe('different-validation')
  })

  test('different random state → comparable but flagged', () => {
    const delta = compareRunToActive(run({ randomState: 7 }), active)
    expect(delta.comparable).toBe(true)
    expect(delta.reason).toBe('different-random-state')
  })

  test('missing metric label mismatch → not comparable', () => {
    expect(
      compareRunToActive(
        run({ primaryMetric: { label: 'AUC', value: 0.9 } }),
        active,
      ).reason,
    ).toBe('missing-metric')
  })
})
