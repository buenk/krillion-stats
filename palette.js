// Palette tester (dev only). Loaded on localhost, or anywhere with ?palette in the URL.
// Paste hex codes (or a Coolors URL, or a Lospec hex list), and the whole site recolours:
// the darkest and lightest colours become ground and text (swapped for a light ground),
// the most colourful ones become the seven tier colours, and every other tone
// (panels, hairlines, muted text) is mixed from ground and text.

const KEY = 'krillion-stats:palette';
const TIER_IDS = ['krillion', 'deepcut', 'rare', 'schooler', 'tooclever', 'plankton', 'miss'];
const TIER_NAMES = { krillion: 'One in a Krillion', deepcut: 'Deep Cut', rare: 'Rare', schooler: 'Schooler', tooclever: 'Too Clever', plankton: 'Plankton', miss: 'Miss' };
const DEFAULT = {
  ground: '#050a14', text: '#e8f1ff',
  tiers: { krillion: '#ffd166', deepcut: '#bfa7ff', rare: '#ff7bac', schooler: '#7deaff', tooclever: '#ff9f43', plankton: '#d7e1f2', miss: '#3d4f6e' },
  source: 'Krillion (default)',
};

// ---------- colour maths ----------
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => rgbToHex(hexToRgb(a).map((v, i) => v + (hexToRgb(b)[i] - v) * t));
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const [r, g, b] = hexToRgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function oklab(h) {
  const [r, g, b] = hexToRgb(h).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B) };
}

export function parseHexes(text) {
  const out = [];
  for (const m of String(text).matchAll(/(?:^|[^0-9a-f])#?([0-9a-f]{6})(?![0-9a-f])/gi)) {
    const h = '#' + m[1].toLowerCase();
    if (!out.includes(h)) out.push(h);
  }
  return out;
}

export function fromHexes(hexes, light = false) {
  const byL = [...hexes].sort((a, b) => oklab(a).L - oklab(b).L);
  const dark = byL[0], bright = byL.at(-1);
  const ground = light ? bright : dark, text = light ? dark : bright;
  const accents = hexes.filter((h) => h !== dark && h !== bright).sort((a, b) => oklab(b).C - oklab(a).C);
  const tiers = {};
  TIER_IDS.slice(0, 6).forEach((id, i) => {
    // Fewer than six accents: reuse them, lifted toward the text colour so tiers stay distinct.
    tiers[id] = accents.length
      ? (i < accents.length ? accents[i] : mix(accents[i % accents.length], text, 0.35 * Math.ceil((i + 1) / accents.length - 1)))
      : DEFAULT.tiers[id];
  });
  tiers.miss = mix(ground, text, 0.25);
  return { ground, text, tiers };
}

function tokens(p) {
  const g = p.ground, t = p.text;
  const light = oklab(g).L > oklab(t).L;
  const onTier = light ? t : g;
  return {
    '--abyss': g, '--sunk': mix(g, t, 0.03), '--shallow': mix(g, t, 0.07), '--ghost-hover': mix(g, t, 0.11),
    '--line': mix(g, t, 0.13), '--line-2': mix(g, t, 0.22), '--line-hover': mix(g, t, 0.3),
    '--slate': mix(g, t, 0.42), '--drift': mix(g, t, 0.58), '--drift-2': mix(g, t, 0.72),
    '--foam': t, '--cyan': p.tiers.schooler, '--on-tier': onTier,
    ...Object.fromEntries(TIER_IDS.map((id) => [`--tier-${id}`, p.tiers[id]])),
    'color-scheme': light ? 'light' : 'dark',
  };
}

function apply(p) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens(p))) {
    if (k === 'color-scheme') root.style.colorScheme = v;
    else root.style.setProperty(k, v);
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.ground);
}

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const save = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };

// ---------- panel ----------
let state = load() || structuredClone(DEFAULT);
apply(state);

const css = `
.pal-toggle{position:fixed;right:16px;bottom:16px;z-index:40;height:40px;padding:0 16px;font:700 14px var(--sans);background:var(--foam);color:var(--abyss);border:0;cursor:pointer}
.pal{position:fixed;right:16px;bottom:64px;z-index:40;width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 96px);overflow:auto;background:var(--shallow);border:1px solid var(--line-2);padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.45);font-size:14px}
.pal[hidden]{display:none}
.pal h2{font-size:16px;font-weight:900;margin-bottom:4px}
.pal .sd{margin-bottom:12px}
.pal textarea{width:100%;height:64px;resize:vertical;font:500 13px ui-monospace,monospace;color:var(--foam);background:var(--sunk);border:1px solid var(--line-2);padding:8px}
.pal-row{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}
.pal .btn{height:34px;padding:0 12px;font-size:13px}
.pal-roles{margin-top:16px;display:grid;grid-template-columns:auto 1fr auto;gap:8px 10px;align-items:center}
.pal-roles input[type=color]{width:34px;height:26px;padding:0;border:1px solid var(--line-2);background:none;cursor:pointer}
.pal-roles .r{text-align:right;font:600 13px var(--px);color:var(--drift)}
.pal-roles .low{color:var(--danger)}
.pal-src{margin-top:12px;color:var(--drift);font-size:12px}
.pal label.radio{display:flex;gap:6px;align-items:center;color:var(--drift);font-size:13px;cursor:pointer}
`;
document.head.append(Object.assign(document.createElement('style'), { textContent: css }));

const toggle = Object.assign(document.createElement('button'), { className: 'pal-toggle', type: 'button', textContent: 'Palette' });
const panel = Object.assign(document.createElement('div'), { className: 'pal', hidden: true });
panel.setAttribute('role', 'dialog');
panel.setAttribute('aria-label', 'Palette tester');
panel.innerHTML = `
  <h2>Try a palette</h2>
  <p class="sd">Paste hex codes, a Coolors link or a Lospec hex list. Darkest and lightest become ground and text; the most colourful become the tiers.</p>
  <textarea id="pal-in" placeholder="e.g. https://coolors.co/264653-2a9d8f-e9c46a-f4a261-e76f51"></textarea>
  <div class="pal-row">
    <button class="btn btn-primary" id="pal-apply" type="button">Apply</button>
    <label class="radio"><input type="checkbox" id="pal-light"> Light ground</label>
  </div>
  <div class="pal-roles" id="pal-roles"></div>
  <div class="pal-row">
    <button class="btn btn-ghost" id="pal-copy" type="button">Copy for Claude</button>
    <button class="btn btn-ghost" id="pal-reset" type="button">Reset</button>
  </div>
  <p class="pal-src" id="pal-src"></p>`;
document.body.append(toggle, panel);
toggle.addEventListener('click', () => { panel.hidden = !panel.hidden; });

const ratio = (a, b) => {
  const r = contrast(a, b);
  return `<span class="r${r < 3 ? ' low' : ''}" title="contrast">${r.toFixed(1)}:1</span>`;
};

function drawRoles() {
  const on = tokens(state)['--on-tier'];
  const rows = [
    ['ground', 'Ground', state.ground, '<span class="r"></span>'],
    ['text', 'Text', state.text, ratio(state.text, state.ground)],
    ...TIER_IDS.map((id) => [`tier:${id}`, TIER_NAMES[id], state.tiers[id], ratio(on, state.tiers[id])]),
  ];
  panel.querySelector('#pal-roles').innerHTML = rows.map(([k, label, v, r]) =>
    `<input type="color" value="${v}" data-k="${k}" aria-label="${label}"><span>${label}</span>${r}`).join('');
  panel.querySelector('#pal-src').textContent = `Source: ${state.source || 'custom'}. Ratios: text on ground, and tier-square text on each tier (below 3:1 is hard to read).`;
}
drawRoles();

panel.querySelector('#pal-roles').addEventListener('input', (e) => {
  const k = e.target.dataset.k;
  if (!k) return;
  if (k.startsWith('tier:')) state.tiers[k.slice(5)] = e.target.value;
  else state[k] = e.target.value;
  state.source = (state.source || '').replace(/( \(edited\))?$/, ' (edited)');
  apply(state); save(state);
});
panel.querySelector('#pal-roles').addEventListener('change', drawRoles);

panel.querySelector('#pal-apply').addEventListener('click', () => {
  const raw = panel.querySelector('#pal-in').value;
  const hexes = parseHexes(raw);
  if (hexes.length < 2) { panel.querySelector('#pal-src').textContent = 'Need at least two hex colours.'; return; }
  state = { ...fromHexes(hexes, panel.querySelector('#pal-light').checked), source: raw.trim().slice(0, 200) };
  apply(state); save(state); drawRoles();
});
panel.querySelector('#pal-reset').addEventListener('click', () => {
  state = structuredClone(DEFAULT);
  apply(state); save(state); drawRoles();
});
panel.querySelector('#pal-copy').addEventListener('click', async (e) => {
  const text = `Palette for real divers (source: ${state.source || 'custom'})\nground ${state.ground}\ntext ${state.text}\n` +
    TIER_IDS.map((id) => `tier ${id} ${state.tiers[id]}`).join('\n');
  try { await navigator.clipboard.writeText(text); e.target.textContent = 'Copied'; }
  catch { e.target.textContent = 'Copy failed'; }
  setTimeout(() => { e.target.textContent = 'Copy for Claude'; }, 1500);
});
