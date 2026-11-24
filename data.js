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
  const days = { ...base.days };
  let added = 0, upgraded = 0;
  for (const [date, d] of Object.entries(incoming?.days || {})) {
    if (!d || typeof d.score !== 'number') continue;
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
