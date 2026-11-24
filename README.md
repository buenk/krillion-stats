# Krillion Stats (real divers)

A bookmarklet that records your [Krillion](https://krillion.io) daily dive results, plus a static GitHub Pages dashboard that charts them over time against the rest of the field.

## How it works

1. **`capture.js`** runs on krillion.io when you click the bookmarklet on the results screen. It:
   - reads your finished game from the game's own localStorage (`krillion:game:v1`; for logged-in players the key is prefixed with `krillion:account:<owner>:`),
   - backfills every past day the game remembers from `krillion:stats:v1`, which holds only your own scores and answers,
   - calls `POST /api/today/complete` with `record: false` to get the day's score distribution (`dist`) and your percentile (`betterThan`). The results screen makes the same call, and `record: false` means nothing is counted again.
   - fetches `/api/answer-popularity` and `/api/reveal` to work out, for each question, the field's average points, how many players gave your answer, and how players split across tiers,
   - keeps a copy in krillion.io localStorage (`krillion-stats:log`) and offers **Save to stats site**, which opens the dashboard with the whole log gzipped into the URL hash.
2. **The dashboard** (`index.html` + `app.js`, fonts Satoshi and Array from Fontshare) merges that data into its own localStorage and into `data.json`, if the repo has one, then draws the charts.

Krillion only serves field stats (distribution, popularity, reveal) for the current day; past dates return 403. Run the bookmarklet each day you play if you want field comparisons. Backfilled days show only your own score.

## Files

| File | What |
|---|---|
| `capture.js` | The capture script the bookmarklet runs |
| `index.html`, `app.js`, `style.css` | Dashboard: hand-drawn HTML/SVG charts, no chart library, no build step |
| `data.js` | Storage, merging and the `#import=` payload format |
| `stats.js` | Distribution maths (mean, median, top 10% / 5%), tier colours, score bands, per-question field stats |
| `categories.js` | Keyword rules that sort questions into categories. Edit them freely; every saved day is re-classified on load |
| `data.json` | Optional: commit an export here to see your data on any device |
| `PRODUCT.md`, `DESIGN.md` | Product context and the design system (fonts, palette, rules) |

## Bookmarklet

Open the site, go to **Data** and drag **Capture dive** onto the bookmarks toolbar, or bookmark it with a keyword (e.g. `ks`) and type that on the results screen (handy in Zen, where the toolbar is hidden). The default bookmarklet loads `capture.js` fresh from the site each time. The **standalone** variant inlines the whole script, in case krillion.io ever adds a Content-Security-Policy that blocks external scripts.

## Local development

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

The loader bookmarklet can't fetch an `http://localhost` script from the https krillion.io page because browsers block mixed content. Use the standalone bookmarklet when you test locally.

## Notes

- **Field average** comes from the distribution buckets, using each bucket's midpoint. The **top 10% / 5%** cut-offs are interpolated within a bucket, so treat them as accurate to a few points.
- **Per-question field average** counts only players who gave an accepted answer. Misses aren't in the popularity data, so the field figure runs a little high.

## Data safety

There's no shared database: each visitor's dives live only in their own browser, so other people using the bookmarklet can't touch yours. Import links (`#import=…`) are validated field by field (numbers in range, real dates, capped text) before anything is stored or drawn. A link that didn't come from krillion.io (checked via the referrer) asks for confirmation before adding anything.
