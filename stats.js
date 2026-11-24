// Shared maths for the field's score distribution and per-question field stats.
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

// Re-bin the distribution into fixed-width bins (default 25 points → 28 bins) for drawing.
export function rebin(dist, binWidth = 25, max = MAX_DAY_SCORE) {
  // Split each source bucket across the target bins it overlaps, so uneven
  // bucket widths don't produce a saw-tooth.
  const bins = new Array(Math.ceil(max / binWidth)).fill(0);
  const w = max / dist.length;
  dist.forEach((c, i) => {
    const lo = i * w, hi = lo + w;
    for (let b = Math.floor(lo / binWidth); b * binWidth < hi && b < bins.length; b++) {
      const overlap = Math.min(hi, (b + 1) * binWidth) - Math.max(lo, b * binWidth);
      if (overlap > 0) bins[b] += ((c || 0) * overlap) / w;
    }
  });
  return bins;
}

// Colours point at CSS custom properties (the game's own tier tokens by default),
// so a palette can recolour tiers without touching the scripts.
export const TIERS = [
  { id: 'krillion', label: 'One in a Krillion', score: 100, color: 'var(--tier-krillion)' },
  { id: 'deepcut', label: 'Deep Cut', score: 85, color: 'var(--tier-deepcut)' },
  { id: 'rare', label: 'Rare', score: 60, color: 'var(--tier-rare)' },
  { id: 'schooler', label: 'Schooler', score: 30, color: 'var(--tier-schooler)' },
  { id: 'tooclever', label: 'Too Clever', score: 15, color: 'var(--tier-tooclever)' },
  { id: 'plankton', label: 'Plankton', score: 10, color: 'var(--tier-plankton)' },
  { id: 'miss', label: 'Miss', score: 0, color: 'var(--tier-miss)' },
];
export const TIER = Object.fromEntries(TIERS.map((t) => [t.id, t]));
export const tierOf = (id) => TIER[id] || TIER.miss;

// The game's own score bands and verdicts.
export const BANDS = [
  { min: 450, name: 'One in a krillion', verdict: 'One in a krillion. Trench dweller. Absurd.' },
  { min: 351, name: 'Deep cut', verdict: 'Deep cut. Seriously deep dive.' },
  { min: 251, name: 'Rare', verdict: 'Rare. Below the thermocline. Nice.' },
  { min: 151, name: 'Schooler', verdict: 'Schooler. Swimming with the school.' },
  { min: 0, name: 'Plankton', verdict: 'Plankton. Plenty of ocean left down there.' },
];
export const bandOf = (score) => BANDS.find((b) => score >= b.min);

// Per-question field stats from how players split across tiers.
// Only players who gave an accepted answer are in the popularity data, so misses are excluded.
// topAvg(0.1) = average points of the best-scoring 10% of those answers.
export function questionField(p) {
  const tp = p?.tierPlayers;
  if (!tp) return typeof p?.othersAvg === 'number' ? { avg: p.othersAvg, top10: null, top5: null } : null;
  const rows = Object.entries(tp)
    .map(([id, n]) => ({ pts: tierOf(id).score, n }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.pts - a.pts);
  const total = rows.reduce((a, r) => a + r.n, 0);
  if (!total) return null;
  const topAvg = (frac) => {
    let need = frac * total, sum = 0;
    for (const r of rows) {
      const take = Math.min(r.n, need);
      sum += take * r.pts;
      need -= take;
      if (need <= 0) break;
    }
    return sum / (frac * total);
  };
  const avg = typeof p.othersAvg === 'number' ? p.othersAvg : rows.reduce((a, r) => a + r.pts * r.n, 0) / total;
  return { avg, top10: topAvg(0.1), top5: topAvg(0.05) };
}

export function formatPercentile(x) {
  return x >= 99.5 ? x.toFixed(2) : String(Math.round(x * 10) / 10);
}
