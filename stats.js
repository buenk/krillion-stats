// Shared maths for the field's score distribution.
// The game sends `dist` as bucket counts spread evenly over 0..700
// (that's how its own results chart draws them), so bucket i covers
// [i*700/n, (i+1)*700/n). Values in between are linearly interpolated.

export const MAX_DAY_SCORE = 700;

export function distStats(dist, max = MAX_DAY_SCORE) {
  if (!Array.isArray(dist) || !dist.length) return null;
  const n = dist.length;
  const w = max / n;
  const total = dist.reduce((a, b) => a + (b || 0), 0);
  if (!(total > 0)) return null;
  let mean = 0;
  dist.forEach((c, i) => { mean += (c || 0) * (i * w + w / 2); });
  mean /= total;
  const quantile = (p) => {
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const c = dist[i] || 0;
      if (acc + c >= p * total) return i * w + (c ? (p * total - acc) / c : 0) * w;
      acc += c;
    }
    return max;
  };
  return { mean, p50: quantile(0.5), p75: quantile(0.75), p90: quantile(0.9), p95: quantile(0.95), total };
}

export const TIERS = [
  { id: 'krillion', label: 'One in a Krillion', score: 100 },
  { id: 'deepcut', label: 'Deep Cut', score: 85 },
  { id: 'rare', label: 'Rare', score: 60 },
  { id: 'schooler', label: 'Schooler', score: 30 },
  { id: 'tooclever', label: 'Too Clever', score: 15 },
  { id: 'plankton', label: 'Plankton', score: 10 },
  { id: 'miss', label: 'Miss', score: 0 },
];
