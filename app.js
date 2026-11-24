import { classify } from './categories.js';
import { distStats, rebin, TIERS, tierOf, bandOf, questionField, formatPercentile, MAX_DAY_SCORE } from './stats.js';
import { loadLocal, saveLocal, mergeLogs, decodePayload } from './data.js';

const SITE = location.origin + location.pathname.replace(/[^/]*$/, '');
const $ = (id) => document.getElementById(id);
let allDays = [];
let currentLog = { version: 1, days: {} };

// ---------------- formatting ----------------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const asDate = (iso) => new Date(iso + 'T12:00:00Z');
const fmt = (iso, o) => asDate(iso).toLocaleDateString('en-GB', { timeZone: 'UTC', ...o });
const dShort = (iso) => fmt(iso, { day: 'numeric', month: 'short' });
const dLong = (iso) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' });
const num = (x, d = 0) => (x == null ? '–' : Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
const signed = (x, d = 0) => (x == null ? '–' : (x >= 0 ? '+' : '−') + num(Math.abs(x), d));
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (v, max = MAX_DAY_SCORE) => Math.max(0, Math.min(100, (v / max) * 100));
// The daily dive resets at 05:00 UTC.
const gameDate = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);

// ---------------- boot ----------------
async function init() {
  let log = loadLocal();
  try {
    const r = await fetch('data.json', { cache: 'no-store' });
    if (r.ok) log = mergeLogs(log, await r.json()).log;
  } catch {}

  const m = location.hash.match(/import=([^&]+)/);
  if (m) {
    try {
      const res = mergeLogs(log, await decodePayload(m[1]));
      log = res.log;
      toast(saveLocal(log)
        ? `Saved. ${res.added} new dive${res.added === 1 ? '' : 's'}${res.upgraded ? `, ${res.upgraded} upgraded with field stats` : ''}.`
        : 'Couldn\'t save to this browser\'s storage. Export a backup.');
    } catch (e) {
      toast('Couldn\'t read the data from the bookmarklet: ' + e.message);
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
  $('range').addEventListener('change', renderRange);
  render();
  setupScrollSpy();
}

function render() {
  const latest = allDays.at(-1);
  $('when').textContent = latest ? `${dLong(latest.date)} · Dive ${latest.dayNumber ?? ''}`.trim() : '';
  $('today-body').innerHTML = latest ? todayView(latest, allDays.at(-2)) : emptyView();
  for (const id of ['progress', 'questions']) $(id).hidden = !latest;
  if (latest) renderRange();
}

function renderRange() {
  const v = $('range').value;
  const days = v === 'all' ? allDays : allDays.slice(-Number(v));
  $('progress-body').innerHTML = progressView(days);
  const qs = days.flatMap((d) => d.prompts || []);
  $('questions-meta').textContent = `${qs.length} questions over ${days.length} dive${days.length === 1 ? '' : 's'} · ${days.filter((d) => d.field).length} with field stats`;
  $('questions-body').innerHTML = questionsView(days);
}

function emptyView() {
  return `<div class="panel empty"><b>No dives yet</b>Finish today's dive on krillion.io, click the Capture dive bookmarklet on the results screen, then Save to stats site. Set it up under <a href="#data">Data</a>.</div>`;
}

// ---------------- today ----------------
function todayView(d, prev) {
  const isToday = d.date === gameDate();
  const band = bandOf(d.score);
  const vsPrev = (isToday ? '' : ` · latest dive, ${dShort(d.date)}`) + (prev ? ` · ${signed(d.score - prev.score)} on previous dive` : '');
  const rank = typeof d.betterThan === 'number'
    ? `Better than <strong>${formatPercentile(d.betterThan)}%</strong> of players ${isToday ? 'today' : 'that day'}`
    : 'Field stats weren\'t captured for this dive.';
  const prompts = d.prompts || [];
  const squares = prompts.map((p, i) => {
    const t = tierOf(p.tier);
    return `<div class="sq-xl" style="--c:${t.color}" title="${esc(`Q${i + 1} · ${p.answer ?? 'no answer'} · ${t.label} · ${p.score ?? 0}`)}"><span>${p.score ?? 0}</span></div>`;
  }).join('');
  const legend = TIERS.map((t) => `<li><span class="lsq" style="--c:${t.color}"></span>${t.label} <span class="lp">${t.score}</span></li>`).join('');

  return `
  <div class="today-grid">
    <div class="hero">
      <p class="score"><span class="big px">${d.score}</span><span class="of px">/${MAX_DAY_SCORE}</span></p>
      <p class="depth"><span class="px">−${num(d.score * 10)}</span><span class="unit">m deep${vsPrev}</span></p>
      <p class="verdict">${esc(band.verdict)}</p>
      <p class="rank">${rank}</p>
      <div class="grid-xl" role="img" aria-label="${esc(prompts.map((p) => tierOf(p.tier).label).join(', '))}">${squares}</div>
      <ul class="legend">${legend}</ul>
    </div>
    ${fieldPanel(d)}
  </div>
  ${answersPanel(d)}`;
}

function fieldPanel(d) {
  const f = d.field;
  if (!f) {
    return `<div class="panel"><div class="ph"><h3 class="h3">How everyone scored</h3></div>
      <p class="empty"><b>No field stats for this dive</b>Krillion only serves the day's score spread on the day itself. Click the bookmarklet on the results screen before the 05:00 UTC reset to capture it.</p></div>`;
  }
  const bins = rebin(d.dist);
  const max = Math.max(...bins);
  const bw = MAX_DAY_SCORE / bins.length;
  const myBin = Math.min(bins.length - 1, Math.floor(d.score / bw));
  const rects = bins.map((c, i) => {
    const h = (c / max) * 100;
    return `<rect class="hb${i === myBin ? ' you' : ''}" x="${i * 10 + 1}" y="${100 - h}" width="8" height="${h}"/>`;
  }).join('');
  const axis = [0, 100, 200, 300, 400, 500, 600, 700].map((v) => `<span style="left:${pct(v)}%">${v}</span>`).join('');
  return `
  <div class="panel">
    <div class="ph"><h3 class="h3">How everyone scored</h3><span class="ph-meta">${esc(dShort(d.date))} distribution</span></div>
    <dl class="fstats">
      <div><dt>Field average</dt><dd>${num(f.mean)}</dd></div>
      <div><dt>You vs average</dt><dd>${signed(d.score - f.mean)}</dd></div>
      <div><dt>Top 10% from</dt><dd>${num(f.p90)}</dd></div>
      <div><dt>Top 5% from</dt><dd>${num(f.p95)}</dd></div>
    </dl>
    <div class="dist-plot" role="img" aria-label="Score distribution: field average ${num(f.mean)}, you ${d.score}">
      <svg viewBox="0 0 ${bins.length * 10} 100" preserveAspectRatio="none" aria-hidden="true">${rects}</svg>
      <div class="vline mean" style="left:${pct(f.mean)}%"><span class="vtag">Avg <b>${num(f.mean)}</b></span></div>
      <div class="vline me" style="left:${pct(d.score)}%"><span class="vtag">You <b>${d.score}</b></span></div>
    </div>
    <div class="axis">${axis}</div>
    <div class="brk" style="margin-left:${pct(f.p90)}%">Top 10% <b>${num(f.p90)}+</b></div>
    <div class="brk" style="margin-left:${pct(f.p95)}%">Top 5% <b>${num(f.p95)}+</b></div>
  </div>`;
}

function sameAnswer(p) {
  if (!p.players) return { main: '–', sub: '' };
  const share = (100 * (p.sameAnswer || 0)) / p.players;
  const main = share < 0.01 ? '<0.01%' : `${share < 1 ? share.toFixed(2) : share.toFixed(1)}%`;
  return { main, sub: `${num(p.sameAnswer || 0)} player${p.sameAnswer === 1 ? '' : 's'}` };
}

function answersPanel(d) {
  const rows = (d.prompts || []).map((p, i) => {
    const t = tierOf(p.tier);
    const f = questionField(p);
    const diff = f ? (p.score ?? 0) - f.avg : null;
    const s = sameAnswer(p);
    return `<div class="arow">
      <div class="a-q"><span class="a-n">${i + 1}</span><div><p class="q">${esc(p.text || 'Question not saved')}</p>
        <p class="qcat">${esc(classify(p.text))}${p.players ? ` · ${num(p.players)} answered` : ''}</p></div></div>
      <div class="a-ans"><span class="mlab">Your answer</span>${esc(p.answer ?? '—')}</div>
      <div class="a-tier"><span class="pill" style="--c:${t.color}">${t.label}</span></div>
      <div class="a-pts"><span class="mlab">Points</span><b>${p.score ?? 0}</b></div>
      <div class="a-fld"><span class="mlab">Field avg</span>${f ? `${num(f.avg, 1)}<span class="delta${diff < 0 ? ' down' : ''}">${signed(diff, 1)}</span>` : '–'}</div>
      <div class="a-same"><span class="mlab">Same answer</span><b>${s.main}</b><span class="sub">${s.sub}</span></div>
    </div>`;
  }).join('');
  return `
  <div class="panel answers">
    <div class="ph"><h3 class="h3">${d.date === gameDate() ? 'Today\'s' : 'Latest'} answers</h3><span class="ph-meta">${d.score} of ${MAX_DAY_SCORE} points</span></div>
    <div class="ahead"><span>Question</span><span>Your answer</span><span>Tier</span><span class="r">Points</span><span class="r">Field avg</span><span class="r">Same answer</span></div>
    ${rows}
    <p class="foot">Field avg is the average points among players who gave an accepted answer; same answer is how many of them said exactly what you did.</p>
  </div>`;
}

// ---------------- progress ----------------
function progressView(days) {
  const captured = days.filter((d) => d.field);
  const avg = mean(days.map((d) => d.score));
  const best = Math.max(...days.map((d) => d.score));
  const gap = mean(captured.map((d) => d.score - d.field.mean));
  const pctAvg = mean(days.filter((d) => typeof d.betterThan === 'number').map((d) => d.betterThan));
  return `
  <dl class="sumrow">
    <div><dt>Dives</dt><dd>${days.length} <small>${captured.length} with field stats</small></dd></div>
    <div><dt>Your average</dt><dd>${num(avg, 1)}</dd></div>
    <div><dt>Best</dt><dd>${best}</dd></div>
    <div><dt>Vs field average</dt><dd>${gap == null ? '–' : signed(gap)} ${dayNote(captured.length)}</dd></div>
    <div><dt>Average percentile</dt><dd>${pctAvg == null ? '–' : `${num(pctAvg)}%`} ${dayNote(days.filter((d) => typeof d.betterThan === 'number').length)}</dd></div>
  </dl>
  <div class="prog-grid">
    ${scoreChart(days)}
    ${wallPanel(days)}
  </div>
  <div class="panel vf">${captured.length >= 2
    ? `<div class="vf-grid">${vsChart(days)}${gapPanel(captured)}</div>`
    : `<div class="vf-grid">${gapPanel(captured)}<div class="vf-wait"><h3 class="h3">You vs the field over time</h3><p class="sd">This chart appears once at least two dives have field stats. Capture each dive on the day with the bookmarklet; ${captured.length} of ${days.length} in this range so far.</p></div></div>`}</div>`;
}

const dayNote = (n) => (n ? `<small>${n} dive${n === 1 ? '' : 's'}</small>` : '');

const gridlines = (vals, max) => vals.map((v) => `<div class="gl" style="bottom:${(v / max) * 100}%"><i>${v}</i></div>`).join('');

function xLabels(days) {
  const n = days.length;
  const step = Math.max(1, Math.ceil(n / 8));
  return days.map((d, i) => {
    const last = i === n - 1;
    if (!last && (i % step !== 0 || n - 1 - i < step / 2)) return '';
    // Every other label is hidden at phone width (counted back from the latest so it always shows).
    const cls = [last ? 'is-latest' : '', (Math.ceil((n - 1 - i) / step) % 2) ? 'alt' : ''].join(' ').trim();
    return `<span class="${cls}" style="left:${((i + 0.5) / n) * 100}%">${esc(dShort(d.date))}</span>`;
  }).join('');
}

function scoreChart(days) {
  const n = days.length;
  let sum = 0;
  const run = days.map((d, i) => `${((i + 0.5) / n) * 100},${100 - pct((sum += d.score) / (i + 1))}`).join(' ');
  const cols = days.map((d, i) => {
    const fld = d.field
      ? `<span class="bar fld" style="height:${pct(d.field.mean)}%"></span>`
      : '<span class="bar nofld"></span>';
    const tip = `${dLong(d.date)}: you ${d.score}${d.field ? `, field ${num(d.field.mean)}` : ', no field data'}`;
    return `<div class="col${i === n - 1 ? ' is-latest' : ''}" title="${esc(tip)}"><div class="pair"><span class="bar you" style="height:${pct(d.score)}%"></span>${fld}</div></div>`;
  }).join('');
  return `
  <div class="panel">
    <div class="ph"><h3 class="h3">Score per dive</h3><span class="ph-meta">out of ${MAX_DAY_SCORE}</span></div>
    <div class="chart">
      <div class="plot">
        ${gridlines([0, 200, 400, 600], MAX_DAY_SCORE)}
        <div class="cols" style="grid-template-columns:repeat(${n},1fr)">${cols}</div>
        <svg class="overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline class="case" points="${run}"/><polyline class="run" points="${run}"/></svg>
      </div>
      <div class="xlabels">${xLabels(days)}</div>
    </div>
    <ul class="keys"><li><span class="k k-you"></span>You</li><li><span class="k k-fld"></span>Field average</li><li><span class="k k-none"></span>No field data</li><li><span class="k k-run"></span>Your running average</li></ul>
  </div>`;
}

function wallPanel(days) {
  const shown = [...days].reverse().slice(0, 12);
  const latestDate = allDays.at(-1)?.date;
  const rows = shown.map((d) => {
    const sq = (d.prompts || []).map((p) => {
      const t = tierOf(p.tier);
      return `<span class="sq-w" style="--c:${t.color}" title="${esc(`${p.answer ?? 'no answer'} · ${t.label}`)}"></span>`;
    }).join('');
    return `<li class="wrow${d.date === latestDate ? ' is-latest' : ''}"><span class="wdte">${esc(dShort(d.date))}</span><span class="wsq">${sq}</span><span class="wsc">${d.score}</span></li>`;
  }).join('');
  const more = days.length - shown.length;
  return `
  <div class="panel">
    <div class="ph"><h3 class="h3">Dive wall</h3><span class="ph-meta">newest first</span></div>
    <ol class="wall">${rows}</ol>
    ${more > 0 ? `<p class="wall-more">${more} earlier dive${more === 1 ? '' : 's'} in this range</p>` : ''}
  </div>`;
}

// You as a solid line; field average, top 10% and top 5% as neutral reference series.
const SERIES = [
  { key: 'mean', label: 'Field average', color: 'var(--field)', dash: '' },
  { key: 'p90', label: 'Top 10% from', color: 'var(--drift-2)', dash: '6 4' },
  { key: 'p95', label: 'Top 5% from', color: 'var(--drift-2)', dash: '2 3' },
];

function vsChart(days) {
  const n = days.length;
  const x = (i) => ((i + 0.5) / n) * 100;
  const y = (v) => 100 - pct(v);
  const you = days.map((d, i) => `${x(i)},${y(d.score)}`).join(' ');
  let lines = '', points = '';
  for (const s of SERIES) {
    let seg = [];
    const flush = () => { if (seg.length > 1) lines += `<polyline points="${seg.join(' ')}" stroke="${s.color}" stroke-width="2" stroke-dasharray="${s.dash}"/>`; seg = []; };
    days.forEach((d, i) => {
      if (d.field) {
        seg.push(`${x(i)},${y(d.field[s.key])}`);
        const v = d.field[s.key];
        points += `<span class="vpt vpt-${s.key}" style="left:${x(i)}%;bottom:${pct(v)}%" title="${esc(`${dShort(d.date)}: ${s.label.toLowerCase()} ${num(v)}`)}"></span>`;
      } else flush();
    });
    flush();
  }
  const captured = days.filter((d) => d.field).length;
  const keys = `<li><span class="k k-you"></span>You</li>` + SERIES.map((s) =>
    `<li><svg width="18" height="4" aria-hidden="true"><line x1="0" y1="2" x2="18" y2="2" stroke="${s.color}" stroke-width="2.5" stroke-dasharray="${s.dash}"/></svg>${s.label}</li>`).join('');
  return `
  <div>
    <div class="ph"><h3 class="h3">You vs the field</h3><span class="ph-meta">${captured} of ${n} dives with field stats</span></div>
    <div class="chart">
      <div class="vplot">
        ${gridlines([0, 200, 400, 600], MAX_DAY_SCORE)}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}<polyline points="${you}" stroke="var(--you)" stroke-width="2.5"/></svg>
        ${points}
      </div>
      <div class="xlabels">${xLabels(days)}</div>
    </div>
    <ul class="keys">${keys}</ul>
    ${captured < 2 ? '<p class="note">Field lines build up as you capture more days with the bookmarklet.</p>' : ''}
  </div>`;
}

function gapPanel(captured) {
  if (!captured.length) {
    return `<div><div class="ph"><h3 class="h3">Gap to the field</h3></div><p class="empty"><b>No field stats in this range</b>Capture a dive on the day to compare.</p></div>`;
  }
  const me = mean(captured.map((d) => d.score));
  const rows = [
    ['Field average', mean(captured.map((d) => d.field.mean))],
    ['Median player', mean(captured.map((d) => d.field.p50))],
    ['Top 10%', mean(captured.map((d) => d.field.p90))],
    ['Top 5%', mean(captured.map((d) => d.field.p95))],
  ].map(([label, v]) => ({ label, v, gap: me - v }));
  const scale = Math.max(100, ...rows.map((r) => Math.abs(r.gap)));
  const list = rows.map((r) => {
    const w = (Math.abs(r.gap) / scale) * 50;
    const pos = r.gap >= 0 ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`;
    return `<div class="gap-row" title="${esc(`${r.label}: ${num(r.v)} · you ${num(me)}`)}"><span class="gap-n">${r.label}</span><span class="gap-track"><span class="gap-bar ${r.gap >= 0 ? 'up' : 'down'}" style="${pos}"></span></span><span class="gap-v">${signed(r.gap)}</span></div>`;
  }).join('');
  return `
  <div>
    <div class="ph"><h3 class="h3">Gap to the field</h3><span class="ph-meta">points per dive</span></div>
    <div class="gap-list">${list}</div>
    <p class="gap-sub">Your average (${num(me)}) minus each benchmark, over the ${captured.length} dive${captured.length === 1 ? '' : 's'} with field stats. Right of the line means you beat it.</p>
  </div>`;
}

// ---------------- questions ----------------
function questionsView(days) {
  return `${categoryPanel(days)}<div class="q-grid">${tierPanel(days)}${weekdayPanel(days)}</div>`;
}

function categoryPanel(days) {
  const by = new Map();
  for (const d of days) for (const p of d.prompts || []) {
    if (!p.text) continue;
    const c = classify(p.text);
    if (!by.has(c)) by.set(c, { me: [], meF: [], avg: [], t10: [], t5: [] });
    const g = by.get(c);
    g.me.push(p.score ?? 0);
    const f = questionField(p);
    if (f) {
      g.meF.push(p.score ?? 0);
      g.avg.push(f.avg);
      if (f.top10 != null) { g.t10.push(f.top10); g.t5.push(f.top5); }
    }
  }
  if (!by.size) return `<div class="panel"><div class="ph"><h3 class="h3">Average points by category</h3></div><p class="empty">No question texts saved yet.</p></div>`;
  const rows = [...by.entries()].sort((a, b) => mean(b[1].me) - mean(a[1].me)).map(([c, g]) => {
    const me = mean(g.me), avg = mean(g.avg), t10 = mean(g.t10), t5 = mean(g.t5);
    const meF = mean(g.meF);
    const marks = (meF != null ? `<span class="cm mef" style="left:${meF}%"></span>` : '')
      + (avg != null ? `<span class="cm avg" style="left:${avg}%"></span>` : '')
      + (t10 != null ? `<span class="cm t10" style="left:${t10}%"></span>` : '')
      + (t5 != null ? `<span class="cm t5" style="left:${t5}%"></span>` : '');
    // Compare like with like: your points on the same questions the field numbers cover.
    const det = avg != null
      ? `${g.avg.length === g.me.length ? 'All' : `${g.avg.length} of ${g.me.length}`} with field data: you <b>${num(meF, 1)}</b> · avg <b>${num(avg, 1)}</b>${t10 != null ? ` · top 10% <b>${num(t10, 1)}</b> · top 5% <b>${num(t5, 1)}</b>` : ''}`
      : 'No field data yet';
    return `<div class="crow"><span class="cn">${esc(c)}<small>${g.me.length} question${g.me.length === 1 ? '' : 's'}</small></span>
      <span class="ctrack" title="${esc(`${c}: you ${num(me, 1)}${avg != null ? `, field ${num(avg, 1)}` : ''}`)}"><span class="cbar" style="width:${me}%"></span>${marks}</span>
      <span class="cv">${num(me, 1)}</span><p class="cdet">${det}</p></div>`;
  }).join('');
  return `
  <div class="panel">
    <div class="ph"><h3 class="h3">Average points by category</h3><span class="ph-meta">per question, 0–100</span></div>
    <ul class="ckeys"><li><span class="k k-you"></span>You, all questions</li><li><span class="mk-mef"></span>You, questions with field data</li><li><span class="mk-avg"></span>Field average</li><li><span class="mk-t10"></span>Top 10% of answers</li><li><span class="mk-t5"></span>Top 5% of answers</li></ul>
    <div class="clist">${rows}</div>
    <p class="foot">The bar is your average on every question in the category. The markers compare only questions captured on the day, with your own score on those same questions as the white diamond. Top 10% is the average points of the best-scoring 10% of accepted answers.</p>
  </div>`;
}

function tierPanel(days) {
  const mine = Object.fromEntries(TIERS.map((t) => [t.id, 0]));
  const field = Object.fromEntries(TIERS.map((t) => [t.id, 0]));
  let total = 0, fq = 0;
  for (const d of days) for (const p of d.prompts || []) {
    mine[tierOf(p.tier).id]++; total++;
    const tp = p.tierPlayers;
    const tt = tp && Object.values(tp).reduce((a, b) => a + b, 0);
    if (tt) { fq++; for (const [k, v] of Object.entries(tp)) if (k in field) field[k] += v / tt; }
  }
  const max = Math.max(1, ...Object.values(mine));
  const rows = TIERS.map((t) => {
    const c = mine[t.id];
    const share = total ? Math.round((100 * c) / total) : 0;
    const fs = fq && t.id !== 'miss' ? ` · field ${Math.round((100 * field[t.id]) / fq)}%` : '';
    return `<li class="trow"><span class="tn"><span class="lsq" style="--c:${t.color}"></span>${t.label} <span class="lp">${t.score}</span></span>
      <span>${c ? `<span class="tbar" style="--c:${t.color};width:${Math.max(12, (c / max) * 100)}%"><b>${c}</b></span>` : '<span class="tbar zero"><b>0</b></span>'}</span>
      <span class="tp"><b>${share}%</b>${fs ? `<small>${fs.slice(3)}</small>` : ''}</span></li>`;
  }).join('');
  return `
  <div class="panel">
    <div class="ph"><h3 class="h3">Your answers by tier</h3><span class="ph-meta">${total} answers</span></div>
    <ul class="tlist">${rows}</ul>
    ${fq ? `<p class="foot">Field share is across accepted answers on the ${fq} question${fq === 1 ? '' : 's'} with field data.</p>` : ''}
  </div>`;
}

function weekdayPanel(days) {
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const me = names.map(() => []), fld = names.map(() => []);
  for (const d of days) {
    const i = (asDate(d.date).getUTCDay() + 6) % 7;
    me[i].push(d.score);
    if (d.field) fld[i].push(d.field.mean);
  }
  const cols = names.map((n, i) => {
    const a = mean(me[i]), f = mean(fld[i]);
    if (a == null) return '<div class="wcol"><span class="wbar none"></span></div>';
    return `<div class="wcol" title="${esc(`${n}: you ${num(a)}${f != null ? `, field ${num(f)}` : ''}`)}"><span class="wbar you" style="height:${pct(a)}%"><b>${num(a)}</b></span>${f != null ? `<span class="wbar fld" style="height:${pct(f)}%"></span>` : ''}</div>`;
  }).join('');
  const xs = names.map((n, i) => `<span><b>${n}</b><i>${me[i].length} dive${me[i].length === 1 ? '' : 's'}</i></span>`).join('');
  return `
  <div class="panel">
    <div class="ph"><h3 class="h3">Average by weekday</h3><span class="ph-meta">your score, field where captured</span></div>
    <div class="wplot"><div class="wcols">${cols}</div></div>
    <div class="wx">${xs}</div>
  </div>`;
}

// ---------------- nav: highlight follows the section in view ----------------
function setupScrollSpy() {
  const links = [...document.querySelectorAll('.tabs a')];
  const set = (id) => links.forEach((a) => (a.getAttribute('href') === `#${id}` ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const update = () => {
    // The last section whose top has passed the line just under the sticky bar wins;
    // at the very bottom of the page, the last section wins.
    const line = document.querySelector('.top').offsetHeight + window.innerHeight * 0.25;
    let current = sections[0];
    for (const s of sections) if (!s.hidden && s.getBoundingClientRect().top <= line) current = s;
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = sections.at(-1);
    set(current.id);
  };
  let raf = 0;
  addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
  addEventListener('resize', update);
  // Web fonts change the layout after first paint.
  document.fonts?.ready.then(update);
  update();
}

// ---------------- data section ----------------
function setupBookmarklets() {
  const loader = `javascript:(()=>{window.__KRILLION_STATS_SITE__=${JSON.stringify(SITE)};var s=document.createElement('script');s.src=${JSON.stringify(SITE + 'capture.js')}+'?v='+Date.now();s.onerror=()=>alert('Krillion Stats: could not load the capture script. Try the standalone bookmarklet.');document.head.appendChild(s)})()`;
  $('bm-loader').href = loader;
  fetch('capture.js', { cache: 'no-store' }).then((r) => r.text()).then((code) => {
    // `void 0` at the end so Firefox doesn't navigate to the script's return value.
    $('bm-standalone').href = 'javascript:' + encodeURIComponent(`window.__KRILLION_STATS_SITE__=${JSON.stringify(SITE)};\n${code}\n;void 0`);
  }).catch(() => {});
  for (const a of [$('bm-loader'), $('bm-standalone')]) {
    a.addEventListener('click', (e) => { e.preventDefault(); toast('Drag this onto your bookmarks bar (or bookmark it with a keyword), then use it on krillion.io.'); });
  }
}

function setupDataButtons() {
  $('export').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(currentLog, null, 2)], { type: 'application/json' }));
    a.download = `krillion-stats-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('import').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const res = mergeLogs(loadLocal(), JSON.parse(await f.text()));
      saveLocal(res.log);
      toast(`Imported ${res.added} new dive${res.added === 1 ? '' : 's'}.`);
      setTimeout(() => location.reload(), 800);
    } catch (err) { toast('That file isn\'t a Krillion Stats export: ' + err.message); }
  });
  $('clear').addEventListener('click', () => {
    if (!confirm('Delete all Krillion Stats data stored in this browser? Export first if you want a backup.')) return;
    localStorage.removeItem('krillion-stats:v1');
    location.reload();
  });
}

let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 5000);
}

init();
