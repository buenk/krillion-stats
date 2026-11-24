// Storage, merging and the #import= payload format shared with capture.js.

export const STORE_KEY = 'krillion-stats:v1';

export function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { version: 1, days: {} }; }
  catch { return { version: 1, days: {} }; }
}

export function saveLocal(log) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(log)); return true; }
  catch { return false; }
}

// ---------------- validation ----------------
// Imported data can come from a link anyone could craft, so every field is
// coerced to the type and range the dashboard expects; anything else is dropped.
const TIER_IDS = new Set(['krillion', 'deepcut', 'rare', 'schooler', 'tooclever', 'plankton', 'miss']);
const numIn = (x, lo, hi) => (typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi ? x : undefined);
const str = (x, max) => (typeof x === 'string' ? x.slice(0, max) : null);

function cleanPrompt(p, i) {
  if (!p || typeof p !== 'object') return null;
  const out = {
    id: /^p\d{1,2}$/.test(p.id) ? p.id : `p${i + 1}`,
    text: str(p.text, 300),
    answer: str(p.answer, 200),
    tier: TIER_IDS.has(p.tier) ? p.tier : 'miss',
    score: numIn(p.score, 0, 100) ?? 0,
  };
  const players = numIn(p.players, 0, 1e9);
  if (players !== undefined) out.players = players;
  const same = numIn(p.sameAnswer, 0, 1e9);
  if (same !== undefined) out.sameAnswer = same;
  const avg = numIn(p.othersAvg, 0, 100);
  if (avg !== undefined) out.othersAvg = avg;
  if (p.tierPlayers && typeof p.tierPlayers === 'object') {
    const tp = {};
    for (const [k, v] of Object.entries(p.tierPlayers)) if (TIER_IDS.has(k) && numIn(v, 0, 1e9) !== undefined) tp[k] = v;
    if (Object.keys(tp).length) out.tierPlayers = tp;
  }
  return out;
}

export function cleanDay(d) {
  if (!d || typeof d !== 'object') return null;
  if (typeof d.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.date) || Number.isNaN(Date.parse(d.date))) return null;
  const score = numIn(d.score, 0, 700);
  if (score === undefined) return null;
  const out = { date: d.date, score, dayNumber: Number.isInteger(d.dayNumber) && d.dayNumber > 0 && d.dayNumber < 1e5 ? d.dayNumber : null };
  if (d.partial === true) out.partial = true;
  if (typeof d.capturedAt === 'string' && !Number.isNaN(Date.parse(d.capturedAt))) out.capturedAt = d.capturedAt.slice(0, 40);
  const bt = numIn(d.betterThan, 0, 100);
  if (bt !== undefined) out.betterThan = bt;
  if (Array.isArray(d.dist) && d.dist.length && d.dist.length <= 1000 && d.dist.every((c) => numIn(c, 0, 1e12) !== undefined)) {
    out.dist = d.dist;
    out.maxScore = 700;
  }
  out.prompts = Array.isArray(d.prompts) ? d.prompts.slice(0, 7).map(cleanPrompt).filter(Boolean) : [];
  return out;
}

export function cleanLog(log) {
  const days = {};
  for (const d of Object.values(log?.days && typeof log.days === 'object' ? log.days : {})) {
    const c = cleanDay(d);
    if (c) days[c.date] = c;
  }
  return { version: 1, days };
}

// A full capture (made on the day) beats a backfilled one from game history.
function mergeDay(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.partial && !b.partial) return fillText(b, a);
  if (!a.partial && b.partial) return fillText(a, b);
  const newer = (b.capturedAt || '') >= (a.capturedAt || '') ? b : a;
  return fillText(newer, newer === a ? b : a);
}
function fillText(keep, other) {
  if (!keep.prompts || !other.prompts) return keep;
  return { ...keep, prompts: keep.prompts.map((p, i) => ({ ...p, text: p.text || other.prompts[i]?.text || null })) };
}

export function mergeLogs(base, incoming) {
  const days = { ...cleanLog(base).days };
  let added = 0, upgraded = 0;
  for (const [date, d] of Object.entries(cleanLog(incoming).days)) {
    const before = days[date];
    days[date] = mergeDay(before, d);
    if (!before) added++;
    else if (before.partial && !days[date].partial) upgraded++;
  }
  return { log: { version: 1, days, updatedAt: new Date().toISOString() }, added, upgraded };
}

export async function decodePayload(s) {
  const [kind, data] = [s.slice(0, 2), s.slice(2)];
  const bin = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  if (kind === 'z.') {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
