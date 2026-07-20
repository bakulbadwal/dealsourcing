# Case Study — The Sourcing Screen
### A product-thinking write-up (not a README). To run it, see [README](./README.md); this is the *why*.

A deal-sourcing and screening dashboard that makes a scoring framework's *assumptions* visible and adjustable — built around an opinionated thesis, with fully illustrative data.

---

## The problem I was modeling

Deal screening in PE is usually a black box: a partner has a thesis in their head, deals get a gut-feel yes/no, and the *sensitivity of that judgment to its own assumptions* is invisible. Two people using "the same" five-factor screen can rank a pipeline completely differently because they silently weight the factors differently — and nobody can see it.

The product question: **what if the screen's assumptions were a control panel instead of a hidden prior?**

## Who it's for

A sourcing analyst or principal running a thesis-driven pipeline who wants to (a) rank deals against explicit criteria, and (b) *stress-test how much the ranking depends on the weights they chose*. Secondary: anyone learning how a screening framework actually behaves.

## The core product insight

**Make the model argue with itself.** Instead of a static scorecard, every one of the five criteria (market fragmentation, unit economics, AI-adoption leverage, moat, exit path) is a live slider. Drag any weight and the entire 30-deal pipeline re-ranks in real time. The value isn't the score — it's *seeing the thesis's fragility*: a deal that's #1 under "AI-Leverage Max" and #14 under "Margin First" tells you the ranking is an argument, not a fact.

## Key product decisions & tradeoffs

| Decision | Why | Tradeoff accepted |
|---|---|---|
| **Live-slider re-ranking over a static scorecard** | The whole insight is assumption-sensitivity; a frozen scorecard hides exactly the thing worth seeing. | More engineering (real-time scoring engine). It's the core differentiator, so worth it. |
| **Include deals that FAIL the screen, not just wins** | A screening tool that only shows successes is a highlight reel, not a framework. The passes and the misses are where the thesis gets tested. | Less flattering pipeline. But it's the honest, useful version. |
| **One opinionated thesis, stated up front** | "PE plays in fragmented profitable SMB services, not the AI-labs layer" — a sharp, falsifiable point of view beats a generic tool with no opinion. | Narrower. Correct — a screen with no thesis screens nothing. |
| **Data/view split (`data.json` vs `app.js`)** | A sourcing pipeline is content that must update independently of render logic — the right architecture for something meant to grow. | Slightly more upfront structure. Pays off the moment the data changes. |
| **Fictional data, labeled loudly** | Demonstrates the framework end-to-end without misrepresenting real targets or leaking anything. | It's a demo, not a live pipeline. Honest and correct for a public artifact. |

## How I'd measure success

**North-star (if this were the real Cronus tool):** *screen precision* — of the deals the framework ranks top-decile, what share actually convert to real diligence / LOIs? That's whether the screen is predictive or just tidy.

**Supporting metrics:** sourcing-funnel conversion (sourced → screened → advanced), analyst time-to-rank a new pipeline, and inter-user weight variance (how differently do two people set the sliders — a proxy for how subjective the thesis really is).

## Roadmap — and where this actually goes

This is the *illustrative* version. The real one already exists internally (a live BizBuySell-fed Cronus sourcing tool). The productization path is exactly the one I'd argue for in any data product:
1. **Real data behind the same view** — swap fictional `data.json` for a live source.
2. **A real backend when — and only when — it's needed:** the move from flat JSON to Postgres/Supabase is justified the moment you need live edits, multi-user, or auth (broker → listings is a clean relational model). Not before — adding a backend to a single-author demo is infrastructure for a problem you don't have.
3. **Fit-score calibration against outcomes** — close the loop so the weights are tuned by what actually converted, not just what feels right.

## Why this write-up exists

This is a product-judgment artifact: identifying that the *hidden* thing (assumption-sensitivity) is the valuable thing, and building the tool that surfaces it. The document covers the problem, the user, the decisions and tradeoffs, the metrics, and the honest build-vs-cost path to a real backend. If you're reading it as a hiring signal — that's the point.

---

*Tech: vanilla HTML/CSS/JS, data/view split, live SVG radar + scoring engine, no dependencies. Part of a broader portfolio at [github.com/bakulbadwal](https://github.com/bakulbadwal).*
