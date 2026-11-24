---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["app.js","style.css"]
---

# Krillion Stats dashboard (index.html)

Scope: the whole single-page dashboard (Today, Progress, Questions, Data). Mode: Operate.
Audience: one player (Ezra), sometimes shared with friends who play Krillion; desktop after a dive and phone.
Job: 1) how did today go vs the field, 2) am I improving vs other players, 3) where am I strong/weak.
Constraints: static GitHub Pages, no build step; capture.js URL and #import= hash must keep working; days without field stats are shown as such, never filled in. Not affiliated with Krillion: no Krillion logo or mascots.
User-pinned (2026-11-24): chosen direction "Tier Grid" from the safer re-roll; title "Ezra's Krillion Stats"; fonts Array (pixel numerals) + Satoshi (everything else) from Fontshare; no corner radii anywhere; nav highlight follows the section in view; category chart compares you with field average, top 10% and top 5%.

## Direction contract

THESIS: A stats tab that belongs next to the game: every dive is a row of seven tier-coloured squares, the same grid players already share. Refuses the generic grey analytics dashboard of stat tiles and Chart.js cards.

OWN-WORLD: Krillion's night-sea palette (abyss #050a14 ground, shallow #101d33 panels, line #1b2c47 hairlines, foam #e8f1ff text, drift #7d93b8 muted) with the game's tier colours as the only data colours (krillion #ffd166, deep cut #bfa7ff, rare #ff7bac, schooler #7deaff, too clever #ff9f43, plankton #d7e1f2, miss #3d4f6e). Square everything: no radii. Array pixel numerals for the headline numbers and tier squares; Satoshi for all UI text. Hairline-ruled tables, tabular numerals.

STORY: Arrive from the bookmarklet and see today's score, depth, verdict and percentile, then how everyone scored; scroll to see progress over time against the field, top 10% and top 5%; then category and tier strengths; finally capture/backup controls.

FIRST VIEWPORT: Sticky top bar (mark + "Ezra's Krillion Stats", tabs Today/Progress/Questions/Data with scroll-following underline, dive date right). Left: giant Array score "490/700", depth "−4,900 m deep", band verdict, "Better than 96% of players today", then the row of seven large tier squares with points and the tier legend. Right panel: field average / you vs average / top 10% / top 5% stats over today's score histogram with average and you markers and top-10%/top-5% brackets. Answers table begins below the fold.

FORM: grounded direction "Tier Grid" from the safer re-roll lineup (user-chosen, kind grounded); seed:0ea190b4e924367f.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
