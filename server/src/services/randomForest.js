/**
 * A compact, dependency-free Random Forest classifier (bagged CART decision
 * trees with random feature subsampling) implemented from scratch.
 *
 * This is a real, working ML model - not a stub. It is intentionally simple
 * (suitable for a synthetic seed dataset of a few thousand rows) rather than
 * a highly-optimised implementation, which keeps it auditable for a viva.
 *
 * Used by attendancePredictionService.js. If a Python/scikit-learn service is
 * available at ML_SERVICE_URL in a future deployment, this module's interface
 * (train/predict) can be swapped for an HTTP client with no changes upstream.
 */

function giniImpurity(labels) {
  const n = labels.length;
  if (n === 0) return 0;
  const counts = {};
  for (const l of labels) counts[l] = (counts[l] || 0) + 1;
  let impurity = 1;
  for (const c of Object.values(counts)) {
    const p = c / n;
    impurity -= p * p;
  }
  return impurity;
}

function splitDataset(rows, labels, featureIdx, threshold) {
  const leftRows = [], leftLabels = [], rightRows = [], rightLabels = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][featureIdx] <= threshold) {
      leftRows.push(rows[i]); leftLabels.push(labels[i]);
    } else {
      rightRows.push(rows[i]); rightLabels.push(labels[i]);
    }
  }
  return { leftRows, leftLabels, rightRows, rightLabels };
}

function majorityClass(labels) {
  const counts = {};
  for (const l of labels) counts[l] = (counts[l] || 0) + 1;
  let best = labels[0], bestCount = -1;
  for (const [k, v] of Object.entries(counts)) {
    if (v > bestCount) { best = k; bestCount = v; }
  }
  return { label: Number(best), prob1: (counts[1] || 0) / labels.length };
}

function buildTree(rows, labels, featureNames, maxDepth, minSize, nFeatures, depth = 0) {
  if (rows.length === 0) return null;
  const { label, prob1 } = majorityClass(labels);

  if (depth >= maxDepth || rows.length <= minSize || new Set(labels).size === 1) {
    return { leaf: true, label, prob1 };
  }

  // random subset of features to consider at this split (feature bagging)
  const allIdx = [...Array(featureNames.length).keys()];
  for (let i = allIdx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIdx[i], allIdx[j]] = [allIdx[j], allIdx[i]];
  }
  const candidateFeatures = allIdx.slice(0, nFeatures);

  let best = null;
  const parentImpurity = giniImpurity(labels);

  for (const fIdx of candidateFeatures) {
    const values = [...new Set(rows.map(r => r[fIdx]))].sort((a, b) => a - b);
    // sample up to 8 candidate thresholds for speed
    const step = Math.max(1, Math.floor(values.length / 8));
    for (let vi = 0; vi < values.length; vi += step) {
      const threshold = values[vi];
      const { leftLabels, rightLabels, leftRows, rightRows } = splitDataset(rows, labels, fIdx, threshold);
      if (leftLabels.length === 0 || rightLabels.length === 0) continue;
      const weightedImpurity =
        (leftLabels.length / labels.length) * giniImpurity(leftLabels) +
        (rightLabels.length / labels.length) * giniImpurity(rightLabels);
      const gain = parentImpurity - weightedImpurity;
      if (!best || gain > best.gain) {
        best = { gain, fIdx, threshold, leftRows, leftLabels, rightRows, rightLabels };
      }
    }
  }

  if (!best || best.gain <= 0) return { leaf: true, label, prob1 };

  return {
    leaf: false,
    featureIdx: best.fIdx,
    threshold: best.threshold,
    left: buildTree(best.leftRows, best.leftLabels, featureNames, maxDepth, minSize, nFeatures, depth + 1),
    right: buildTree(best.rightRows, best.rightLabels, featureNames, maxDepth, minSize, nFeatures, depth + 1),
  };
}

function predictTree(tree, row) {
  let node = tree;
  while (node && !node.leaf) {
    node = row[node.featureIdx] <= node.threshold ? node.left : node.right;
  }
  return node ? node.prob1 : 0.5;
}

export class RandomForestClassifier {
  constructor({ nTrees = 30, maxDepth = 6, minSize = 5, featureNames = [] } = {}) {
    this.nTrees = nTrees;
    this.maxDepth = maxDepth;
    this.minSize = minSize;
    this.featureNames = featureNames;
    this.trees = [];
    this.featureImportance = {};
  }

  fit(rows, labels) {
    // sqrt(nFeatures) feature bagging is the standard RF heuristic, but with
    // very few features it forces near-random single-feature splits and makes
    // importance unstable - so use all features when there are 3 or fewer.
    const nFeatures = this.featureNames.length <= 3
      ? this.featureNames.length
      : Math.max(1, Math.round(Math.sqrt(this.featureNames.length)));
    this.trees = [];
    const importanceCounts = {};

    for (let t = 0; t < this.nTrees; t++) {
      // bootstrap sample (bagging)
      const sampleRows = [], sampleLabels = [];
      for (let i = 0; i < rows.length; i++) {
        const idx = Math.floor(Math.random() * rows.length);
        sampleRows.push(rows[idx]);
        sampleLabels.push(labels[idx]);
      }
      const tree = buildTree(sampleRows, sampleLabels, this.featureNames, this.maxDepth, this.minSize, nFeatures);
      this.trees.push(tree);
      this._countFeatureUsage(tree, importanceCounts);
    }

    const total = Object.values(importanceCounts).reduce((a, b) => a + b, 0) || 1;
    this.featureImportance = {};
    this.featureNames.forEach((name, idx) => {
      this.featureImportance[name] = Number(((importanceCounts[idx] || 0) / total).toFixed(4));
    });
    return this;
  }

  _countFeatureUsage(node, counts) {
    if (!node || node.leaf) return;
    counts[node.featureIdx] = (counts[node.featureIdx] || 0) + 1;
    this._countFeatureUsage(node.left, counts);
    this._countFeatureUsage(node.right, counts);
  }

  predictProba(row) {
    const probs = this.trees.map(tree => predictTree(tree, row));
    return probs.reduce((a, b) => a + b, 0) / probs.length;
  }

  predict(row, threshold = 0.5) {
    const p = this.predictProba(row);
    return p >= threshold ? 1 : 0;
  }

  toJSON() {
    return { trees: this.trees, featureNames: this.featureNames, featureImportance: this.featureImportance };
  }

  static fromJSON(obj) {
    const rf = new RandomForestClassifier({ featureNames: obj.featureNames });
    rf.trees = obj.trees;
    rf.featureImportance = obj.featureImportance;
    return rf;
  }
}

export function evaluateClassifier(model, rows, labels, threshold = 0.5) {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  const probs = [];
  for (let i = 0; i < rows.length; i++) {
    const p = model.predictProba(rows[i]);
    probs.push(p);
    const pred = p >= threshold ? 1 : 0;
    if (pred === 1 && labels[i] === 1) tp++;
    else if (pred === 0 && labels[i] === 0) tn++;
    else if (pred === 1 && labels[i] === 0) fp++;
    else fn++;
  }
  const accuracy = (tp + tn) / rows.length;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const rocAuc = approximateRocAuc(probs, labels);
  return {
    accuracy: Number(accuracy.toFixed(4)),
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
    rocAuc: Number(rocAuc.toFixed(4)),
    confusionMatrix: { tp, tn, fp, fn },
  };
}

// Mann-Whitney U based ROC-AUC approximation (rank-based, no external deps)
function approximateRocAuc(probs, labels) {
  const paired = probs.map((p, i) => ({ p, y: labels[i] }));
  paired.sort((a, b) => a.p - b.p);
  let rankSum = 0, rank = 1;
  const ranks = new Array(paired.length);
  // average ranks for ties
  let i = 0;
  while (i < paired.length) {
    let j = i;
    while (j + 1 < paired.length && paired[j + 1].p === paired[i].p) j++;
    const avgRank = (rank + (rank + (j - i))) / 2;
    for (let k = i; k <= j; k++) ranks[k] = avgRank;
    rank += (j - i + 1);
    i = j + 1;
  }
  let posCount = 0, negCount = 0;
  for (let k = 0; k < paired.length; k++) {
    if (paired[k].y === 1) { rankSum += ranks[k]; posCount++; }
    else negCount++;
  }
  if (posCount === 0 || negCount === 0) return 0.5;
  const auc = (rankSum - (posCount * (posCount + 1)) / 2) / (posCount * negCount);
  return auc;
}
