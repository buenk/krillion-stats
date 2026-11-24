---
name: Krillion Stats
description: A night-sea logbook of daily Krillion dives, every one a row of seven tier-coloured squares set against the field.
colors:
  abyss: "#050a14"
  sunk: "#0a1426"
  shallow: "#101d33"
  line: "#1b2c47"
  line-2: "#2a3f63"
  line-hover: "#3a5075"
  foam: "#e8f1ff"
  drift: "#7d93b8"
  drift-2: "#a3b6d6"
  slate: "#647a9f"
  focus-cyan: "#4de3ff"
  tier-krillion: "#ffd166"
  tier-deepcut: "#bfa7ff"
  tier-rare: "#ff7bac"
  tier-schooler: "#7deaff"
  tier-tooclever: "#ff9f43"
  tier-plankton: "#d7e1f2"
  tier-miss: "#3d4f6e"
typography:
  display:
    fontFamily: "Array, ui-monospace, monospace"
    fontSize: "168px"
    fontWeight: 400
    lineHeight: 0.8
    letterSpacing: "0"
  display-of:
    fontFamily: "Array, ui-monospace, monospace"
    fontSize: "48px"
    fontWeight: 400
    lineHeight: 0.8
  depth:
    fontFamily: "Array, ui-monospace, monospace"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 1
  headline:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  stat:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  verdict:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  none: "0px"
spacing:
  gutter: "24px"
  gutter-mobile: "16px"
  section: "72px"
  section-mobile: "56px"
  panel: "24px"
  grid: "24px"
  grid-wide: "40px"
  stack: "20px"
  tier-gap: "8px"
components:
  button-primary:
    backgroundColor: "{colors.foam}"
    textColor: "{colors.abyss}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 18px"
    height: "42px"
  button-ghost:
    backgroundColor: "{colors.abyss}"
    textColor: "{colors.foam}"
    rounded: "{rounded.none}"
    padding: "0 18px"
    height: "42px"
  select:
    backgroundColor: "{colors.shallow}"
    textColor: "{colors.foam}"
    rounded: "{rounded.none}"
    padding: "0 32px 0 12px"
    height: "36px"
  panel:
    backgroundColor: "{colors.shallow}"
    rounded: "{rounded.none}"
    padding: "{spacing.panel}"
  nav-tab:
    textColor: "{colors.drift}"
    typography: "{typography.body}"
    padding: "0 14px"
    height: "60px"
  nav-tab-active:
    textColor: "{colors.foam}"
  tier-square:
    rounded: "{rounded.none}"
    textColor: "{colors.abyss}"
  tier-pill:
    textColor: "{colors.abyss}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "2px 8px"
  number-badge:
    textColor: "{colors.drift}"
    rounded: "{rounded.none}"
    size: "24px"
---

# Design System: Krillion Stats

## Overview

**Creative North Star: "The Night-Sea Logbook"**

Krillion Stats reads as a page torn from the game's own logbook, not a generic analytics dashboard. The ground is the game's abyss navy, panels sit one step shallower, and hairline rules divide everything. Colour is held back almost entirely: the only saturated hues on the page are the game's seven tier colours, and they appear only where a tier is being reported. Everything else (you, the field, top 10%, top 5%, running average) is told in foam, drift and drift-2, separated by shape and dash pattern rather than hue.

The signature unit is the dive as a row of seven square tiles, the same grid players already share from the game. It appears giant on the Today hero and small on the dive wall. The brand is a plain lowercase wordmark, "real divers", with no logo. Headline numbers are set in Array, a pixel face that echoes the game's screen: the hero score and depth, the field stats, the Progress summary figures and the points in the tier squares. Every other word and number, including everything in lists, tables, legends and chart labels, is Satoshi. Density is moderate: a 1100px column, panels with 24px padding, tables ruled with 1px lines.

Every corner is square. The page is dark only, drawn from krillion.io's own CSS tokens, and honest about gaps: a day without captured field stats shows a dashed stub, never an estimate.

**Key Characteristics:**
- Night-sea navy ground with tonal panels and 1px hairlines, no shadows.
- Tier colours are the only saturated data colours; benchmarks are neutral shapes and dashes.
- Seven square tier tiles per dive as the recurring signature.
- Array pixel numerals for headline numbers only (400 for the giant hero numerals, 600 for stat figures and tier squares); Satoshi for words and for numbers in lists, tables, legends and chart labels.
- Zero corner radius everywhere.
- Missing field data is drawn as a dashed "no field data" stub, never filled in.

## Colors

A cold, nearly monochrome navy scale lit only by the game's seven tier colours.

### Primary
- **Tier palette** (krillion `tier-krillion`, deep cut `tier-deepcut`, rare `tier-rare`, schooler `tier-schooler`, too clever `tier-tooclever`, plankton `tier-plankton`, miss `tier-miss`): the game's own tier tokens, copied from krillion.io. Used for tier squares, tier pills, legend swatches, and the tier-split bars. Text on a tier fill is always `abyss`.

### Neutral
- **Abyss** (`abyss`): page ground, sticky top bar, text on light fills.
- **Sunk** (`sunk`): recessed tracks inside panels (category bar tracks).
- **Shallow** (`shallow`): panels, select fields, the halo ring that lifts chart markers off lines.
- **Line** (`line`): every hairline: panel borders, table rules, the top bar's bottom edge, gridlines.
- **Line 2** (`line-2`): stronger rules: the histogram baseline, number badges, ghost button borders, and histogram bars that are not "you".
- **Slate** (`slate`): the neutral "you, all questions" bar on the category tracks; 4.2:1 against `sunk`, so it reads as the row's main measure while the foam diamond (you on questions with field data) stays distinct above it.
- **Line hover** (`line-hover`): border on hover for the select and ghost buttons.
- **Foam** (`foam`): primary text; also "you" in every chart (your bar, your line, your marker), and the primary button fill.
- **Drift** (`drift`): muted text, labels, axes; also "field average" as a solid fill.
- **Drift 2** (`drift-2`): the top 10% / top 5% / running-average series, always dashed or outlined.
- **Focus cyan** (`focus-cyan`): the 2px focus outline and nothing else.

### Named Rules
**The Tier Monopoly Rule.** Saturated colour on this site means a tier. The seven tier colours are the only saturated data colours; no chart series, benchmark, highlight or decoration borrows a hue.

**The Neutral Benchmarks Rule.** You are foam, the field average is drift, and top 10%, top 5% and the running average are drift-2. They are told apart by mark and dash: field average is a solid line and filled square, top 10% is a `6 4` dash and hollow square, top 5% is a `2 3` dash and short bar, running average is a `5 3` dash.

**The Honest Gap Rule.** A day without field stats is drawn as a 7px dashed outline stub (1.5px dashed `drift`, open at the bottom) with the key "no field data". It is never interpolated, averaged in or filled.

## Typography

**Display Font:** Array (Fontshare, pixel numerals; fallback ui-monospace)
**Body Font:** Satoshi (Fontshare, weights 400/500/700/900; fallback ui-sans-serif, system-ui)

**Character:** A blocky pixel numeral for the one number that matters, against a firm, geometric grotesk that carries every label and table at heavy weights.

### Hierarchy
- **Display** (Array 400, 168px, line-height 0.8; 128px under 640px): today's score.
- **Display of** (Array 400, 48px; 40px mobile): the "/700" beside the score, in `drift`.
- **Depth** (Array 400, 40px; 34px mobile): "−4,900" metres.
- **Headline** (Satoshi 900, 30px / 1.1, −0.02em; 26px mobile): section headings.
- **Stat** (Satoshi 900, 28px / 1.15, −0.02em; 24px in summary rows and on mobile): field stats and summary numbers.
- **Verdict** (Satoshi 700, 22px / 1.3; 20px mobile): the band verdict line.
- **Title** (Satoshi 700, 17px / 1.3): panel headings. The brand wordmark is Satoshi 900, 18px, lowercase.
- **Body** (Satoshi 500, 15px / 1.5, tabular numerals): table cells, buttons, nav; question text and answers at 700.
- **Label** (Satoshi 500, 13px; 12px for axes): column heads, metas, keys and legends, in `drift`, sentence case.

### Named Rules
**The Headline Pixel Rule.** Array is for headline numbers only (user-pinned, 2026-11-24, after trying it on every number): the hero score, /700 and depth in the dotted 400 weight, and the field stats, Progress summary figures and tier-square points in 600. Numbers in lists, tables, legends and chart labels read better in Satoshi and stay there; the light 400 weight smears into scanlines below about 28px.

**The Tabular Rule.** All numbers use tabular numerals (`font-variant-numeric: tabular-nums` on body) so columns align.

**The One Family Per Link Rule.** Load each Fontshare family with its own `<link>`; Fontshare serves only the first family in a combined request.

## Layout

A single centred column, max 1100px, with a 24px gutter (16px under 640px). Sections stack vertically in story order (Today, Progress, Questions, Data) with 72px top padding (56px mobile; Today opens at 40px / 28px) and a scroll margin equal to the sticky bar.

Within sections, two-column grids carry the content: Today splits 5fr / 6fr (hero left, field panel right), Progress 7fr / 5fr, Questions and Data 1fr / 1fr, with 24px or 40px gaps. All collapse to one column at 980px. The answers table is a six-column grid that reflows at 760px into a three-row card per answer, with small `drift` labels per cell and dashed hairlines between the stacked stats. At 640px the nav drops below the brand as a four-up 44px tab strip.

Section headers sit on a flex row: heading left, meta or range control right, 20px below. Panels open with a title row (title left, `drift` meta right) 20px above content.

## Elevation & Depth

Flat. Depth comes from tonal layering (abyss ground, shallow panels, sunk tracks) and 1px hairlines, never from drop shadows. The one shadow-like device is a 2px solid halo ring (`box-shadow: 0 0 0 2px`) in the surface colour behind chart markers, so a marker reads cleanly where it crosses a line.

### Named Rules
**The Hairline Rule.** Separation is a 1px `line` rule or a step in navy tone. No drop shadows, blurs or glows.

## Shapes

Every corner is square: the global reset sets `border-radius: 0` on every element and pseudo-element. Squares are the form language: tier tiles at 1:1 aspect ratio, legend swatches at 12px, number badges as bordered 24px and 28px squares. Benchmarks use distinct square-family marks: a filled 9px square (field average), a hollow 11px square with 2px border (top 10%), a 3px vertical bar (top 5%), and a foam square rotated 45° (your score on a category track). Bracket rules with end ticks mark the top-10% and top-5% ranges under the histogram.

### Named Rules
**The No Radius Rule.** No corner radius anywhere, on any component, at any size.

## Components

### Buttons
Blunt, solid blocks.
- **Shape:** square (0px), 42px tall, 18px horizontal padding, Satoshi 700 15px.
- **Primary:** `foam` fill, `abyss` text; hover goes to pure white.
- **Ghost:** transparent with a `line-2` border and `foam` text; hover fills `#16263f` with a `line-hover` border.
- **Danger:** the ghost button with pink text (`#ff9bb8`), used only for "Clear local data".
- **Transitions:** background and border colour at 0.15s. Focus is the shared 2px `focus-cyan` outline, 3px offset.

### Select
Square `shallow` field with a `line-2` border, 36px tall, Satoshi 700 14px; the chevron is drawn with two CSS gradients in `drift`. Hover shifts the border to `line-hover`.

### Panels
- **Corner Style:** square.
- **Background:** `shallow`, with a 1px `line` border.
- **Shadow Strategy:** none (see Elevation).
- **Internal Padding:** 24px (18px 16px on mobile).

### Navigation
Sticky 60px top bar on `abyss` with a 1px `line` bottom edge: the lowercase "real divers" wordmark at left (no logo), tabs, dive date at right in `drift`. Tabs are Satoshi 700 in `drift`, foam on hover; the active tab is foam with a 2px foam underline sitting on the bar's bottom rule. The underline follows the section in view as you scroll (the last section whose top has passed a line 25% below the bar; the last section at page bottom), not only the clicked tab. Colour changes at 0.15s, the underline at 0.2s.

### Tier Square (signature)
A square tile filled with its tier colour. On the Today hero, seven squares in a 7-column grid (8px gap, max 440px wide) with the points in Satoshi 900 20px `abyss` text centred. On the dive wall, seven 24px squares (20px mobile) with a 5px gap per dive, date left and score right. Always followed or keyed by a legend of 12px swatches with tier name and points.

### Tier Pill
Inline tier label: tier fill, `abyss` text, Satoshi 700 13px, 2px 8px padding, square.

### Field Stats Row
A four-up definition list (two-up on mobile) separated by 1px `line` verticals: 13px `drift` label above a Satoshi 900 28px number.

### Charts
Bars and lines are built in HTML and SVG with the same tokens. You are a foam bar or 2.5px foam line; field average is a `drift` bar or 2px solid line; top 10% and top 5% are `drift-2` dashed lines with their marks; the running average is a `drift-2` `5 3` dashed line cased in `shallow`. Gridlines are 1px `line` with 12px `drift` labels. The latest day's column carries a faint foam wash (5% foam) and a bold foam x-label. Every chart ends in a key row above a `line` rule. Days without field data show the dashed stub from the Honest Gap Rule.

### Number Badge
Bordered square (1px `line-2`), 24px in the answers table and 28px in the capture steps, centred Satoshi numeral.

## Do's and Don'ts

### Do:
- **Do** keep every corner at 0px radius.
- **Do** use the seven tier colours only to report tiers, with `abyss` text on tier fills.
- **Do** draw you in `foam`, the field average in `drift`, and top 10% / top 5% / running average in `drift-2`, distinguished by dash (`6 4`, `2 3`, `5 3`) and mark shape.
- **Do** show a day without field stats as a 7px dashed `drift` stub keyed "no field data".
- **Do** set headline numbers in Array (400 for the giant hero numerals, 600 for stat figures and tier squares); list, table, legend and chart-label numbers in Satoshi.
- **Do** load Array and Satoshi from Fontshare with one `<link>` per family.
- **Do** separate with 1px `line` hairlines and navy tonal steps.
- **Do** keep the nav underline in sync with the section in view.

### Don't:
- **Don't** introduce any corner radius.
- **Don't** give a benchmark, series or highlight its own hue; saturated colour belongs to tiers.
- **Don't** fill, interpolate or estimate field data for days that have none.
- **Don't** use Array in lists, tables, legends or chart labels, Array 400 below about 28px, or Array for words.
- **Don't** add drop shadows, glows or blurs; the 2px halo ring behind chart markers is the only box-shadow.
- **Don't** add a light theme; the palette is dark only, taken from krillion.io's own tokens.
