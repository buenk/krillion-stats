// Sync between devices through a secret GitHub gist.
// Each device stores a GitHub token (gist scope only) and the gist id in its own
// localStorage. On load the page pulls the gist and merges it in; whenever the merged
// result has something the gist lacks, it writes the whole log back. Merging only ever
// adds or upgrades days, so two devices can't undo each other.

const KEY = 'krillion-stats:sync';
const FILE = 'real-divers.json';
const API = 'https://api.github.com';

export const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=real%20divers%20sync';

export function getConfig() {
  try { const c = JSON.parse(localStorage.getItem(KEY)); return c?.token && c?.gistId ? c : null; }
  catch { return null; }
}
const setConfig = (c) => localStorage.setItem(KEY, JSON.stringify(c));
export const disconnect = () => localStorage.removeItem(KEY);

async function gh(path, token, opts = {}) {
  const r = await fetch(API + path, {
    ...opts,
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (r.status === 401) throw new Error('GitHub rejected the token (expired or revoked?)');
  if (r.status === 403 || r.status === 404) throw new Error(`GitHub said ${r.status}: does the token have the gist scope?`);
  if (!r.ok) throw new Error(`GitHub error ${r.status}`);
  return r.json();
}

// Same order every time, so "has anything changed?" is a string comparison.
export const canonical = (log) => JSON.stringify({
  version: 1,
  days: Object.fromEntries(Object.entries(log?.days || {}).sort(([a], [b]) => a.localeCompare(b))),
});

// Find the sync gist on this account, or create a secret one.
export async function connect(token) {
  token = token.trim();
  const user = await gh('/user', token);
  let gistId = null;
  for (let page = 1; page <= 10 && !gistId; page++) {
    const list = await gh(`/gists?per_page=100&page=${page}`, token);
    gistId = list.find((g) => g.files && g.files[FILE])?.id ?? null;
    if (list.length < 100) break;
  }
  if (!gistId) {
    const g = await gh('/gists', token, {
      method: 'POST',
      body: JSON.stringify({
        description: 'real divers: Krillion stats sync (written by the site, keep secret)',
        public: false,
        files: { [FILE]: { content: canonical({ days: {} }) } },
      }),
    });
    gistId = g.id;
  }
  const cfg = { token, gistId, login: user.login };
  setConfig(cfg);
  return cfg;
}

export async function pull(cfg) {
  const g = await gh(`/gists/${cfg.gistId}`, cfg.token);
  const f = g.files?.[FILE];
  if (!f) throw new Error(`The gist no longer has ${FILE}`);
  // Files over ~1 MB come back truncated; the raw URL has the full text.
  const text = f.truncated ? await (await fetch(f.raw_url, { cache: 'no-store' })).text() : f.content;
  return JSON.parse(text || '{"days":{}}');
}

export async function push(cfg, log) {
  await gh(`/gists/${cfg.gistId}`, cfg.token, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [FILE]: { content: canonical(log) } } }),
  });
  setConfig({ ...cfg, lastSync: new Date().toISOString() });
}

export const markSynced = (cfg) => setConfig({ ...cfg, lastSync: new Date().toISOString() });
