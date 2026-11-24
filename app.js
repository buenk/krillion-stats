import { classify } from './categories.js';
import { distStats, TIERS, MAX_DAY_SCORE } from './stats.js';

const STORE_KEY = 'krillion-stats:v1';
const SITE = location.origin + location.pathname.replace(/[^/]*$/, '');
const charts = {};
let allDays = [];
let currentLog = { version: 1, days: {} };

// ---------------- storage & merging ----------------
function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { version: 1, days: {} }; }
  catch { return { version: 1, days: {} }; }
}
function saveLocal(log) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(log)); return true; }
  catch { toast('Could not save to this browser\'s storage. Export a backup.'); return false; }
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
function mergeLogs(base, incoming) {
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

async function decodePayload(s) {
  const [kind, data] = [s.slice(0, 2), s.slice(2)];
  const bin = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  if (kind === 'z.') {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function init() {
  let log = loadLocal();

  // data.json in the repo: a way to see the same data on other devices.
  try {
    const r = await fetch('data.json', { cache: 'no-store' });
    if (r.ok) log = mergeLogs(log, await r.json()).log;
  } catch {}

  const m = location.hash.match(/import=([^&]+)/);
  if (m) {
    try {
      const incoming = await decodePayload(m[1]);
      const res = mergeLogs(log, incoming);
      log = res.log;
      if (saveLocal(log)) {
        toast(`Saved. ${res.added} new day${res.added === 1 ? '' : 's'}${res.upgraded ? `, ${res.upgraded} upgraded with field stats` : ''}.`);
      }
    } catch (e) {
      toast('Could not read the data from the bookmarklet: ' + e.message);
    }
    history.replaceState(null, '', location.pathname + location.search);
  }

  currentLog = log;
  allDays = Object.values(log.days)
    .filter((d) => d && typeof d.score === 'number' && d.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, field: distStats(d.dist, d.maxScore || MAX_DAY_SCORE) }));

  setupBookmarklets();
  setupDataButtons();
  document.getElementById('range').addEventListener('change', render);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
  render();
}

// ---------------- rendering ----------------
function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
const fmtDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
const fmtDateLong = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

function visibleDays() {
  const v = document.getElementById('range').value;
  if (v === 'all') return allDays;
  const cutoff = new Date(Date.now() - Number(v) * 864e5).toISOString().slice(0, 10);
  return allDays.filter((d) => d.date >= cutoff);
}

function render() {
  const has = allDays.length > 0;
  document.getElementById('empty').hidden = has;
  document.getElementById('dashboard').hidden = !has;
  if (!has) return;

  const days = visibleDays();
  const t = theme();
  Chart.defaults.color = t.ink2;
  Chart.defaults.borderColor = t.grid;
  Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  Chart.defaults.plugins.tooltip.backgroundColor = t.ink;
  Chart.defaults.plugins.tooltip.titleColor = t.page;
  Chart.defaults.plugins.tooltip.bodyColor = t.page;
  Chart.defaults.plugins.legend.labels.boxWidth = 12;
  Chart.defaults.plugins.legend.labels.boxHeight = 12;

  renderKpis(days);
  dailyChart(days, t);
  vsChart(days, t);
  avgChart(days, t);
  gapChart(days, t);
  categoryChart(days, t);
  weekdayChart(days, t);
  percentileChart(days, t);
  tierChart(days, t);
  distChart(t);
  renderTable(days);
}

function theme() {
  return {
    page: css('--page'), surface: css('--surface'), ink: css('--ink'), ink2: css('--ink-2'),
    muted: css('--muted'), grid: css('--grid'), axis: css('--axis'),
    s: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => css(`--s${i}`)),
    good: css('--good'), bad: css('--bad'),
  };
}

function draw(id, config) {
  charts[id]?.destroy();
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    animation: false,
  };
  charts[id] = new Chart(document.getElementById(id), { ...config, options: { ...base, ...config.options } });
}
const yScale = (extra = {}) => ({ beginAtZero: true, grid: { color: css('--grid') }, border: { display: false }, ...extra });
const xScale = (extra = {}) => ({ grid: { display: false }, border: { color: css('--axis') }, ticks: { maxRotation: 0, autoSkipPadding: 12 }, ...extra });
const bar = (label, data, color, extra = {}) => ({ type: 'bar', label, data, backgroundColor: color, borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 28, ...extra });
const line = (label, data, color, extra = {}) => ({ type: 'line', label, data, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.25, spanGaps: true, ...extra });

function renderKpis(days) {
  const scores = days.map((d) => d.score);
  const captured = days.filter((d) => d.field);
  const myAvg = mean(scores);
  const fieldGap = mean(captured.map((d) => d.score - d.field.mean));
  const pct = mean(days.filter((d) => typeof d.betterThan === 'number').map((d) => d.betterThan));
  const best = days.reduce((b, d) => (!b || d.score > b.score ? d : b), null);
  const last = days[days.length - 1];
  const prev = days[days.length - 2];
  const kpis = [
    { label: 'Dives', value: days.length, delta: `${captured.length} with field stats` },
    { label: 'Your average', value: myAvg?.toFixed(0) ?? '–', delta: `of ${MAX_DAY_SCORE}` },
    { label: 'Vs field average', value: fieldGap == null ? '–' : (fieldGap >= 0 ? '+' : '') + fieldGap.toFixed(0), cls: fieldGap == null ? '' : fieldGap >= 0 ? 'up' : 'down', delta: fieldGap == null ? 'no captured days yet' : `points a day, over ${captured.length} day${captured.length === 1 ? "" : "s"}` },
    { label: 'Avg percentile', value: pct == null ? '–' : `${pct.toFixed(0)}%`, delta: 'of players beaten' },
    { label: 'Best dive', value: best?.score ?? '–', delta: best ? fmtDateLong(best.date) : '' },
    { label: 'Latest', value: last?.score ?? '–', cls: prev ? (last.score >= prev.score ? 'up' : 'down') : '', delta: prev ? `${last.score >= prev.score ? '▲' : '▼'} ${Math.abs(last.score - prev.score)} vs previous` : '' },
  ];
  document.getElementById('kpis').replaceChildren(...kpis.map((k) => {
    const el = document.createElement('div');
    el.className = 'kpi';
    el.innerHTML = `<div class="label"></div><div class="value"></div><div class="delta ${k.cls || ''}"></div>`;
    el.children[0].textContent = k.label;
    el.children[1].textContent = k.value;
    el.children[2].textContent = k.delta;
    return el;
  }));
}

function dailyChart(days, t) {
  draw('c-daily', {
    data: {
      labels: days.map((d) => fmtDate(d.date)),
      datasets: [
        bar('Your score', days.map((d) => d.score), t.s[0]),
        bar('Field average', days.map((d) => r1(d.field?.mean)), t.s[1]),
      ],
    },
    options: {
      // Days without field stats get no empty slot: your bar stays centred.
      skipNull: true,
      scales: { x: xScale(), y: yScale({ max: MAX_DAY_SCORE }) },
    },
  });
}

function vsChart(days, t) {
  draw('c-vs', {
    data: {
      labels: days.map((d) => fmtDate(d.date)),
      datasets: [
        line('You', days.map((d) => d.score), t.s[0], { pointRadius: days.length < 40 ? 3 : 0 }),
        line('Field average', days.map((d) => r1(d.field?.mean)), t.s[1]),
        line('Top 10% from', days.map((d) => r1(d.field?.p90)), t.s[2]),
        line('Top 5% from', days.map((d) => r1(d.field?.p95)), t.s[3]),
      ],
    },
    options: { scales: { x: xScale(), y: yScale({ max: MAX_DAY_SCORE }) } },
  });
}

function avgChart(days, t) {
  const rolling = days.map((_, i) => r1(mean(days.slice(Math.max(0, i - 6), i + 1).map((d) => d.score))));
  let sum = 0;
  const running = days.map((d, i) => r1((sum += d.score) / (i + 1)));
  draw('c-avg', {
    data: {
      labels: days.map((d) => fmtDate(d.date)),
      datasets: [line('7-day average', rolling, t.s[0]), line('All-time average', running, t.s[1], { borderDash: [5, 4] })],
    },
    options: { scales: { x: xScale(), y: yScale() } },
  });
}

function gapChart(days, t) {
  const cap = days.filter((d) => d.field);
  const me = mean(cap.map((d) => d.score));
  const rows = [
    ['Field average', mean(cap.map((d) => d.field.mean))],
    ['Median player', mean(cap.map((d) => d.field.p50))],
    ['Top 10%', mean(cap.map((d) => d.field.p90))],
    ['Top 5%', mean(cap.map((d) => d.field.p95))],
  ];
  const gaps = rows.map(([, v]) => (me == null || v == null ? null : r1(me - v)));
  draw('c-gap', {
    data: {
      labels: rows.map(([l]) => l),
      datasets: [bar('You minus benchmark', gaps, gaps.map((g) => (g >= 0 ? t.s[0] : t.s[7])), { borderSkipped: false })],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { afterLabel: (ctx) => `You avg ${me?.toFixed(0)} · ${rows[ctx.dataIndex][0]} ${rows[ctx.dataIndex][1]?.toFixed(0)}` } },
      },
      scales: { x: xScale(), y: yScale({ beginAtZero: true, grid: { color: (c) => (c.tick.value === 0 ? t.axis : t.grid) } }) },
    },
  });
}

function categoryChart(days, t) {
  const by = new Map();
  for (const d of days) for (const p of d.prompts || []) {
    if (!p.text) continue; // backfilled days without the question text can't be classified
    const c = classify(p.text);
    if (!by.has(c)) by.set(c, { me: [], field: [] });
    by.get(c).me.push(p.score ?? 0);
    if (typeof p.othersAvg === 'number') by.get(c).field.push(p.othersAvg);
  }
  const cats = [...by.entries()].sort((a, b) => mean(b[1].me) - mean(a[1].me));
  draw('c-cat', {
    data: {
      labels: cats.map(([c]) => c),
      datasets: [
        bar('You', cats.map(([, v]) => r1(mean(v.me))), t.s[0]),
        bar('Field', cats.map(([, v]) => r1(mean(v.field))), t.s[1]),
      ],
    },
    options: {
      indexAxis: 'y',
      interaction: { mode: 'index', intersect: false, axis: 'y' },
      plugins: { tooltip: { callbacks: { footer: (items) => `${cats[items[0].dataIndex][1].me.length} questions` } } },
      scales: { x: yScale({ max: 100 }), y: { grid: { display: false }, border: { color: t.axis } } },
    },
  });
}

function weekdayChart(days, t) {
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const me = names.map(() => []), field = names.map(() => []);
  for (const d of days) {
    const i = (new Date(d.date + 'T12:00:00Z').getUTCDay() + 6) % 7;
    me[i].push(d.score);
    if (d.field) field[i].push(d.field.mean);
  }
  draw('c-dow', {
    data: {
      labels: names,
      datasets: [bar('You', me.map((x) => r1(mean(x))), t.s[0]), bar('Field average', field.map((x) => r1(mean(x))), t.s[1])],
    },
    options: {
      plugins: { tooltip: { callbacks: { footer: (items) => `${me[items[0].dataIndex].length} dives` } } },
      scales: { x: xScale(), y: yScale() },
    },
  });
}

function percentileChart(days, t) {
  const ds = days.filter((d) => typeof d.betterThan === 'number');
  draw('c-pct', {
    data: {
      labels: ds.map((d) => fmtDate(d.date)),
      datasets: [line('Players beaten (%)', ds.map((d) => d.betterThan), t.s[0], { pointRadius: ds.length < 40 ? 3 : 0, fill: false })],
    },
    options: { plugins: { legend: { display: false } }, scales: { x: xScale(), y: yScale({ max: 100, ticks: { callback: (v) => v + '%' } }) } },
  });
}

function tierChart(days, t) {
  const mine = Object.fromEntries(TIERS.map((x) => [x.id, 0]));
  const field = Object.fromEntries(TIERS.map((x) => [x.id, 0]));
  let myTotal = 0, fieldTotal = 0;
  for (const d of days) for (const p of d.prompts || []) {
    const id = p.tier in mine ? p.tier : 'miss';
    mine[id]++; myTotal++;
    if (p.tierPlayers && p.players) {
      // Players with no accepted answer aren't in the popularity data, so the field share excludes misses.
      for (const [k, n] of Object.entries(p.tierPlayers)) if (k in field) { field[k] += n / p.players; }
      fieldTotal++;
    }
  }
  const pct = (n, tot) => (tot ? r1((100 * n) / tot) : null);
  draw('c-tiers', {
    data: {
      labels: TIERS.map((x) => `${x.label} (${x.score})`),
      datasets: [
        bar('You', TIERS.map((x) => pct(mine[x.id], myTotal)), t.s[0]),
        bar('Field (accepted answers)', TIERS.map((x) => (x.id === 'miss' ? null : pct(field[x.id], fieldTotal))), t.s[1]),
      ],
    },
    options: {
      indexAxis: 'y',
      interaction: { mode: 'index', intersect: false, axis: 'y' },
      plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw ?? '–'}%` } } },
      scales: { x: yScale({ ticks: { callback: (v) => v + '%' } }), y: { grid: { display: false }, border: { color: t.axis } } },
    },
  });
}

function distChart(t) {
  const d = [...allDays].reverse().find((x) => Array.isArray(x.dist) && x.field);
  const note = document.getElementById('dist-note');
  if (!d) {
    note.textContent = 'Capture a day with the bookmarklet to see how everyone scored.';
    charts['c-dist']?.destroy();
    return;
  }
  const n = d.dist.length, w = (d.maxScore || MAX_DAY_SCORE) / n;
  const myBucket = Math.min(n - 1, Math.floor(d.score / w));
  note.textContent = `${fmtDateLong(d.date)}: you scored ${d.score}${typeof d.betterThan === 'number' ? `, better than ${d.betterThan}% of players` : ''}. Field average ${d.field.mean.toFixed(0)}, top 10% from ${d.field.p90.toFixed(0)}, top 5% from ${d.field.p95.toFixed(0)}.`;
  const total = d.dist.reduce((a, b) => a + b, 0);
  draw('c-dist', {
    data: {
      labels: d.dist.map((_, i) => `${Math.round(i * w)}–${Math.round((i + 1) * w)}`),
      datasets: [bar('Players', d.dist.map((c) => r1((100 * c) / total)), d.dist.map((_, i) => (i === myBucket ? t.s[0] : t.muted)), { maxBarThickness: 40, borderRadius: 2 })],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${c.raw}% of players${c.dataIndex === myBucket ? ' · you are here' : ''}` } },
      },
      scales: { x: xScale({ ticks: { maxRotation: 0, autoSkipPadding: 16 } }), y: yScale({ ticks: { callback: (v) => v + '%' } }) },
    },
  });
}

function renderTable(days) {
  const tbl = document.getElementById('days');
  const head = '<thead><tr><th>Date</th><th>#</th><th class="num">You</th><th class="num">Field avg</th><th class="num">Top 10%</th><th class="num">Beat</th><th>Questions</th></tr></thead>';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tierLabel = Object.fromEntries(TIERS.map((x) => [x.id, x.label]));
  const rows = [...days].reverse().map((d) => {
    const qs = (d.prompts || []).map((p) => {
      const same = p.players ? ` · ${((100 * (p.sameAnswer || 0)) / p.players).toFixed(p.sameAnswer / p.players < 0.01 ? 2 : 1)}% said this` : '';
      const field = typeof p.othersAvg === 'number' ? ` · field ${p.othersAvg.toFixed(0)}` : '';
      return `<li>${p.text ? esc(p.text) : '<i>question not saved</i>'} <span class="tag">${esc(classify(p.text))}</span><br>→ <b>${esc(p.answer ?? '—')}</b> · ${esc(tierLabel[p.tier] || p.tier)} · ${p.score ?? 0} pts${field}${same}</li>`;
    }).join('');
    return `<tr>
      <td>${esc(fmtDateLong(d.date))}${d.partial ? ' <span class="tag" title="Imported from game history: no field stats">history</span>' : ''}</td>
      <td class="num">${d.dayNumber ?? ''}</td>
      <td class="num"><b>${d.score}</b></td>
      <td class="num">${d.field ? d.field.mean.toFixed(0) : '–'}</td>
      <td class="num">${d.field ? d.field.p90.toFixed(0) : '–'}</td>
      <td class="num">${typeof d.betterThan === 'number' ? d.betterThan + '%' : '–'}</td>
      <td>${qs ? `<details><summary>${d.prompts.length} answers</summary><ol class="qlist">${qs}</ol></details>` : ''}</td>
    </tr>`;
  }).join('');
  tbl.innerHTML = head + '<tbody>' + rows + '</tbody>';
}

// ---------------- setup section ----------------
function setupBookmarklets() {
  const loader = `javascript:(()=>{window.__KRILLION_STATS_SITE__=${JSON.stringify(SITE)};var s=document.createElement('script');s.src=${JSON.stringify(SITE + 'capture.js')}+'?v='+Date.now();s.onerror=()=>alert('Krillion Stats: could not load the capture script. Try the standalone bookmarklet.');document.head.appendChild(s)})()`;
  document.getElementById('bm-loader').href = loader;
  fetch('capture.js', { cache: 'no-store' }).then((r) => r.text()).then((code) => {
    // `void 0` at the end so Firefox doesn't navigate to the script's return value.
    document.getElementById('bm-standalone').href = 'javascript:' + encodeURIComponent(`window.__KRILLION_STATS_SITE__=${JSON.stringify(SITE)};\n${code}\n;void 0`);
  }).catch(() => {});
  for (const a of document.querySelectorAll('.bookmarklet')) {
    a.addEventListener('click', (e) => { e.preventDefault(); toast('Drag this onto your bookmarks toolbar, then click it on krillion.io.'); });
  }
}

function setupDataButtons() {
  document.getElementById('export').addEventListener('click', () => {
    const log = currentLog;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' }));
    a.download = `krillion-stats-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  document.getElementById('import').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const res = mergeLogs(loadLocal(), JSON.parse(await f.text()));
      saveLocal(res.log);
      toast(`Imported ${res.added} new day${res.added === 1 ? '' : 's'}.`);
      setTimeout(() => location.reload(), 800);
    } catch (err) { toast('That file isn\'t a Krillion Stats export: ' + err.message); }
  });
  document.getElementById('clear').addEventListener('click', () => {
    if (!confirm('Delete all Krillion Stats data stored in this browser? Export first if you want a backup.')) return;
    localStorage.removeItem(STORE_KEY);
    location.reload();
  });
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 5000);
}

init();
