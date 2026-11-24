# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
One Krillion player tracking their own daily dives. They sometimes show or send the page to friends who also play, so it should be readable to someone who knows Krillion but not this site. They use it equally on desktop (right after a dive, arriving from the bookmarklet) and on their phone, browsing trends in spare moments.

## Product Purpose
Krillion (krillion.io) is a daily trivia game: seven prompts, rare answers score more (tiers from Plankton 10 up to One in a Krillion 100; max 700 points a day, shown as depth in metres, 10 m per point). Krillion Stats keeps a long-term record of the player's dives and compares them with everyone else who played that day. Success means the player can answer, in this order: how did today go, am I getting better over time and against other players, and where am I strong or weak.

## Positioning
The game itself only shows today. This keeps every day, and on days captured with the bookmarklet it also keeps the field's full score distribution, the player's percentile, and per-question field averages. The game stops serving these the next day, so the record exists nowhere else.

## Operating Context
- After finishing the daily dive, the player clicks a bookmarklet on krillion.io (in Zen browser, via a keyword bookmark) and then "Save to stats site", which opens this page with the new data in the URL hash.
- Data lives in the browser's localStorage, with optional JSON export/import and an optional committed `data.json`.
- Daily reset is 05:00 UTC; field stats can only be captured on the day itself.

## Capabilities and Constraints
- Static GitHub Pages site (plain HTML/CSS/JS ES modules, Chart.js from cdnjs, no build step), deployed from `main` at https://buenk.github.io/krillion-stats/.
- `capture.js` is loaded by the bookmarklet at runtime; its URL and the `#import=` hash format must keep working.
- Data per day: date, day number, score, per-question text/answer/tier/points; on captured days also `betterThan` (percentile), `dist` (score distribution buckets over 0–700), per-question field average, players giving the same answer, tier split.
- Days imported from game history have no field stats ("history" days).
- Question categories come from keyword rules in `categories.js`.

## Brand Commitments
Not affiliated with Krillion; the page must not present itself as the official game. The game's own vocabulary (dive, depth in metres, tiers, "one in a krillion") is fair to use.

## Evidence on Hand
The player's real data (8 days as of 2026-11-24, one with field stats). No other users' data, testimonials or claims exist; do not invent any.

## Product Principles
1. Today first: the first screen answers "how did today go" against the field.
2. Then the long view: progress over time and standing against other players.
3. Then the detail: categories, tiers, and individual questions.
4. Honest about gaps: days without field stats are shown as such, never filled in.
5. Shareable at a glance: a friend who plays Krillion understands it without explanation.
