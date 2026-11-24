/*
 * Krillion Stats — capture script.
 *
 * Runs on krillion.io (via the bookmarklet) once you've finished the daily dive.
 * It reads your finished game from the game's own localStorage and asks the
 * same endpoints the results screen uses for:
 *   - the field's score distribution and your percentile (/api/today/complete, record:false)
 *   - per-question answer popularity and tiers (/api/answer-popularity, /api/reveal)
 * It then keeps a copy on krillion.io (localStorage "krillion-stats:log") and
 * hands the whole log to the stats site through the URL hash.
 *
 * Nothing here records a score: the completion call always sends record:false,
 * which is what the game itself sends for games it shouldn't count twice.
 */
(async () => {
  'use strict';

  const SITE = (window.__KRILLION_STATS_SITE__ || 'https://buenk.github.io/krillion-stats/').replace(/[^/]*$/, '');
  const LOG_KEY = 'krillion-stats:log';
  const MAX_DAY_SCORE = 700;
  const UI_ID = 'krillion-stats-overlay';

  // ---------- helpers ----------
  const $ = (tag, props = {}, ...kids) => {
    const el = Object.assign(document.createElement(tag), props);
    for (const k of kids) el.append(k);
    return el;
  };
  const readJSON = (key) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
  };
  const norm = (s) => String(s ?? '').trim().toLowerCase();
  const withTimeout = (ms) => {
    const c = new AbortController();
    setTimeout(() => c.abort(), ms);
    return c.signal;
  };
  async function getJSON(url, ms = 15000) {
    const r = await fetch(url, { signal: withTimeout(ms) });
    if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
    return r.json();
  }

  async function gzipB64(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream === 'undefined') {
      return 'j.' + b64url(bytes);
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = new Uint8Array(await new Response(stream).arrayBuffer());
    return 'z.' + b64url(buf);
  }
  function b64url(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // ---------- overlay ----------
  document.getElementById(UI_ID)?.remove();
  const body = $('div', { className: 'ks-body' }, 'Reading your dive…');
  const overlay = $('div', { id: UI_ID },
    $('style', { textContent: `
      #${UI_ID}{position:fixed;inset:auto 16px 16px auto;z-index:2147483647;width:min(380px,calc(100vw - 32px));
        background:#0b1424;color:#e6f1ff;border:1px solid #2a4a6e;border-radius:12px;padding:16px;
        font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.5)}
      #${UI_ID} h3{margin:0 0 8px;font-size:15px;letter-spacing:.04em}
      #${UI_ID} .ks-x{position:absolute;top:8px;right:10px;background:none;border:0;color:#8fb3d9;font-size:18px;cursor:pointer}
      #${UI_ID} .ks-row{display:flex;justify-content:space-between;gap:8px;padding:2px 0}
      #${UI_ID} .ks-row b{font-variant-numeric:tabular-nums}
      #${UI_ID} .ks-muted{color:#8fb3d9;font-size:12px;margin-top:6px}
      #${UI_ID} .ks-err{color:#ff9b9b}
      #${UI_ID} .ks-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
      #${UI_ID} .ks-actions a,#${UI_ID} .ks-actions button{flex:1 1 auto;text-align:center;padding:8px 10px;border-radius:8px;
        border:1px solid #2a4a6e;background:#12243d;color:#e6f1ff;text-decoration:none;font:inherit;cursor:pointer}
      #${UI_ID} .ks-actions .ks-primary{background:#3987e5;border-color:#3987e5;color:#fff;font-weight:600}
    ` }),
    $('button', { className: 'ks-x', textContent: '×', title: 'Close', onclick: () => overlay.remove() }),
    $('h3', { textContent: '🦐 Krillion Stats' }),
    body,
  );
  document.body.append(overlay);
  const setBody = (...nodes) => { body.replaceChildren(...nodes); };
  const fail = (msg) => setBody($('div', { className: 'ks-err', textContent: msg }));

  if (!/(^|\.)krillion\.io$/.test(location.hostname)) {
    fail('Open krillion.io, finish today\'s dive, then click the bookmarklet on the results screen.');
    return;
  }

  // ---------- 1. read the finished game from the game's own storage ----------
  // Logged-in players get their keys namespaced as krillion:account:<owner>:<key>.
  let owner = null;
  try { owner = localStorage.getItem('krillion:account-owner:v1'); } catch {}
  const prefix = owner ? `krillion:account:${encodeURIComponent(owner)}:` : '';
  const game = readJSON(prefix + 'krillion:game:v1') || readJSON('krillion:game:v1');
  const stats = readJSON(prefix + 'krillion:stats:v1') || readJSON('krillion:stats:v1');
  let playerId = readJSON(prefix + 'krillion:player:v1') || readJSON('krillion:player:v1');
  if (typeof playerId !== 'string') playerId = null;

  let today;
  try { today = await getJSON('/api/today'); } catch (e) { fail('Could not reach /api/today: ' + e.message); return; }

  // ---------- 2. backfill: every finished day the game remembers ----------
  // History only has your own score + answers; field stats for past days are no longer served.
  const history = stats?.history && typeof stats.history === 'object' ? stats.history : {};

  // When a dive ends the game writes it to history[date] and clears krillion:game:v1,
  // so history is the source of truth. The saved game only matters in the brief
  // moment before that write (phase "done" but not yet in history).
  const todayDone = history[today.date]?.results?.length === 7
    ? history[today.date]
    : (game && game.phase === 'done' && game.date === today.date && game.results?.length === 7 ? game : null);
  const isToday = !!todayDone;
  const backfill = Object.entries(history).map(([date, h]) => ({
    date,
    dayNumber: h.dayNumber ?? null,
    score: h.score,
    partial: true,
    prompts: (h.results || []).map((r, i) => ({
      id: r.promptId || `p${i + 1}`,
      text: r.promptText || null,
      answer: r.displayAnswer ?? r.answer ?? r.rawAnswer ?? null,
      tier: r.tier ?? (h.tiers?.[i]) ?? 'miss',
      score: r.score ?? 0,
    })),
  })).filter((d) => typeof d.score === 'number');

  // ---------- 3. today's full record ----------
  let record = null;
  const notes = [];
  if (isToday) {
    setBody('Fetching today\'s field stats…');
    const results = todayDone.results;
    const score = typeof todayDone.score === 'number' ? todayDone.score : results.reduce((a, r) => a + (r.score || 0), 0);

    // 3a. distribution + percentile — same call the results screen makes, never recorded.
    let betterThan = null, dist = null;
    try {
      const r = await fetch('/api/today/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today.date, playerId, score, record: false }),
        signal: withTimeout(10000),
      });
      if (r.ok) {
        const j = await r.json();
        if (typeof j.betterThan === 'number') betterThan = j.betterThan;
        if (Array.isArray(j.dist)) dist = j.dist;
      } else notes.push(`distribution: HTTP ${r.status}`);
    } catch (e) { notes.push('distribution: ' + e.message); }
    if (betterThan === null) {
      // Fallback: the chart's aria-label says "your score beats N% of them".
      const m = document.querySelector('svg[aria-label*="your score beats"]')?.getAttribute('aria-label')?.match(/beats ([\d.]+)%/);
      if (m) betterThan = parseFloat(m[1]);
    }

    // 3b. per-question field stats from answer popularity + tiers.
    setBody('Fetching answer popularity (this one is big)…');
    let pop = null, reveal = null;
    try { pop = await getJSON(`/api/answer-popularity?date=${encodeURIComponent(today.date)}`, 20000); } catch (e) { notes.push('popularity: ' + e.message); }
    try { reveal = await getJSON(`/api/reveal?date=${encodeURIComponent(today.date)}`, 45000); } catch (e) { notes.push('reveal: ' + e.message); }

    const prompts = today.prompts.map((p, i) => {
      const r = results.find((x) => x.promptId === p.id) || results[i] || {};
      const out = {
        id: p.id,
        text: p.text,
        answer: r.displayAnswer ?? r.answer ?? r.rawAnswer ?? null,
        tier: r.tier ?? 'miss',
        score: r.score ?? 0,
      };
      const counts = pop?.prompts?.[p.id];
      const rp = reveal?.prompts?.find((x) => x.id === p.id);
      if (counts && rp) {
        const scoreOf = new Map();
        const tierOf = new Map();
        const tierCount = {};
        for (const a of rp.answers) {
          tierCount[a.tier] = (tierCount[a.tier] || 0) + 1;
          for (const name of [a.answer, ...(a.aliases || [])]) {
            const k = norm(name);
            if (!scoreOf.has(k)) { scoreOf.set(k, a.score); tierOf.set(k, a.tier); }
          }
        }
        let players = 0, matched = 0, sum = 0;
        const tierPlayers = {};
        for (const [name, n] of Object.entries(counts)) {
          players += n;
          const k = norm(name);
          if (scoreOf.has(k)) {
            matched += n;
            sum += scoreOf.get(k) * n;
            const t = tierOf.get(k);
            tierPlayers[t] = (tierPlayers[t] || 0) + n;
          }
        }
        const mine = out.answer ? counts[out.answer] ?? Object.entries(counts).find(([k]) => norm(k) === norm(out.answer))?.[1] ?? 0 : 0;
        Object.assign(out, {
          players,                                   // players who gave an accepted answer
          othersAvg: matched ? +(sum / matched).toFixed(2) : null, // mean points among accepted answers
          sameAnswer: mine,                          // players who gave your answer
          tierPlayers,                               // players per tier
          answerSetSize: rp.answers.length,
          tierCount,                                 // answers per tier in the answer set
        });
      }
      return out;
    });

    record = {
      date: today.date,
      dayNumber: today.dayNumber ?? null,
      capturedAt: new Date().toISOString(),
      score,
      betterThan,
      dist,
      maxScore: MAX_DAY_SCORE,
      prompts,
    };
  } else {
    notes.push('Today\'s dive isn\'t finished yet, so only your past score history was captured.');
  }

  // ---------- 4. merge into the local log ----------
  const log = readJSON(LOG_KEY) || { version: 1, days: {} };
  for (const d of backfill) {
    const cur = log.days[d.date];
    if (!cur || cur.partial) log.days[d.date] = { ...cur, ...d, prompts: d.prompts.map((p, i) => ({ ...cur?.prompts?.[i], ...p, text: p.text || cur?.prompts?.[i]?.text || null })) };
  }
  if (record) log.days[record.date] = record;
  log.updatedAt = new Date().toISOString();
  try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch (e) { notes.push('could not save local copy: ' + e.message); }

  // ---------- 5. hand off ----------
  const payload = await gzipB64(log);
  const siteUrl = `${SITE}#import=${payload}`;
  const days = Object.keys(log.days).length;

  const rows = [];
  if (record) {
    const dStats = distStats(record.dist);
    rows.push(['Your score', `${record.score} (−${(record.score * 10).toLocaleString('en-US')}m)`]);
    if (record.betterThan !== null) rows.push(['Better than', `${record.betterThan}% of players`]);
    if (dStats) {
      rows.push(['Field average', dStats.mean.toFixed(0)]);
      rows.push(['Top 10% from', dStats.p90.toFixed(0)]);
      rows.push(['Top 5% from', dStats.p95.toFixed(0)]);
    }
  }
  rows.push(['Days in log', String(days)]);

  const download = () => {
    const a = $('a', {
      href: URL.createObjectURL(new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' })),
      download: `krillion-stats-${today.date}.json`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const copyBtn = $('button', {
    textContent: 'Copy JSON',
    onclick: async () => {
      try { await navigator.clipboard.writeText(JSON.stringify(log)); copyBtn.textContent = 'Copied'; }
      catch { copyBtn.textContent = 'Copy failed'; }
    },
  });

  setBody(
    ...rows.map(([k, v]) => $('div', { className: 'ks-row' }, $('span', { textContent: k }), $('b', { textContent: v }))),
    ...notes.map((n) => $('div', { className: 'ks-muted', textContent: n })),
    $('div', { className: 'ks-actions' },
      $('a', { className: 'ks-primary', href: siteUrl, target: '_blank', rel: 'noopener', textContent: 'Save to stats site ↗' }),
      copyBtn,
      $('button', { textContent: 'Download', onclick: download }),
    ),
  );

  // Same maths as the site: buckets spread evenly over 0..700.
  function distStats(dist) {
    if (!Array.isArray(dist) || !dist.length) return null;
    const n = dist.length;
    const total = dist.reduce((a, b) => a + b, 0);
    if (!(total > 0)) return null;
    const lo = (i) => (i * MAX_DAY_SCORE) / n;
    let mean = 0;
    dist.forEach((c, i) => { mean += c * (lo(i) + MAX_DAY_SCORE / n / 2); });
    mean /= total;
    const q = (p) => {
      let acc = 0;
      for (let i = 0; i < n; i++) {
        if (acc + dist[i] >= p * total) return lo(i) + ((p * total - acc) / (dist[i] || 1)) * (MAX_DAY_SCORE / n);
        acc += dist[i];
      }
      return MAX_DAY_SCORE;
    };
    return { mean, p50: q(0.5), p90: q(0.9), p95: q(0.95) };
  }
})().catch((e) => {
  const o = document.getElementById('krillion-stats-overlay');
  if (o) o.querySelector('.ks-body').textContent = 'Something went wrong: ' + e.message;
  else alert('Krillion Stats: ' + e.message);
});
