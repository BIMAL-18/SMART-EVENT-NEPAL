import { describe, test, expect } from '@jest/globals';
import { RandomForestClassifier, evaluateClassifier } from '../../src/services/randomForest.js';

// A trivially separable synthetic dataset: label = 1 iff feature[0] > 0.5
function makeSeparableData(n = 400) {
  const rows = [], labels = [];
  for (let i = 0; i < n; i++) {
    const x = Math.random();
    const y = Math.random();
    rows.push([x, y]);
    labels.push(x > 0.5 ? 1 : 0);
  }
  return { rows, labels };
}

describe('RandomForestClassifier', () => {
  test('learns a clearly separable pattern with high accuracy', () => {
    const { rows, labels } = makeSeparableData(500);
    const split = 400;
    const model = new RandomForestClassifier({ nTrees: 15, maxDepth: 5, featureNames: ['x', 'y'] });
    model.fit(rows.slice(0, split), labels.slice(0, split));
    const metrics = evaluateClassifier(model, rows.slice(split), labels.slice(split));
    expect(metrics.accuracy).toBeGreaterThan(0.85);
  });

  test('feature importance favours the informative feature', () => {
    // With only 2 features, each split randomly considers 1 of them (sqrt(2) ~ 1),
    // so a single small forest is noisy. Use a larger forest to average that out.
    const { rows, labels } = makeSeparableData(600);
    const model = new RandomForestClassifier({ nTrees: 60, maxDepth: 5, featureNames: ['x', 'y'] });
    model.fit(rows, labels);
    expect(model.featureImportance.x).toBeGreaterThan(model.featureImportance.y);
  });

  test('predictProba returns a probability between 0 and 1', () => {
    const { rows, labels } = makeSeparableData(200);
    const model = new RandomForestClassifier({ nTrees: 10, featureNames: ['x', 'y'] });
    model.fit(rows, labels);
    const p = model.predictProba([0.9, 0.1]);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});
