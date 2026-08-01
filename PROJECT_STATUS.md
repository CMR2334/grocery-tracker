# Project Status — Grocery $ Tracker Helper

Updated: 2026-08-01 (written for session-context handoff; read this first when resuming work)

## What this is
Single-file, mobile-first web app (`index.html`, no build step, no dependencies) that reads grocery order screenshots and splits the cost between **Collin / Steph / Shared**, producing one-tap copy rows for the "Grocery $ Tracker" Google Sheet.

- **Live:** https://cmr2334.github.io/grocery-tracker/ (GitHub Pages, repo `CMR2334/grocery-tracker`, main branch, legacy Pages build from root)
- **Local:** this folder is the git repo; every push to `main` redeploys in ~30–60s.

## Architecture
- Screenshot parsing: browser → Anthropic Messages API directly (`anthropic-dangerous-direct-browser-access` header), BYOK — the user enters an API key in ⚙️ Settings; stored in localStorage only. Structured outputs (`output_config.format` json_schema) guarantee parseable JSON. Default model `claude-opus-5`, option `claude-haiku-4-5`.
- The AI only extracts (items, qty, line totals, fees, tip, tax, promos, WI taxability guesses). **All split math is deterministic in-app** (`computeTotals`): fees/tip proportional to each person's pre-tax items; the receipt's actual tax spread across taxable items; promos default to Collin with redirect / split-amount / by-item modes; qty splits with remainder-to-primary; penny drift pinned so category totals always equal the computed total.
- Sheet contract: copy strings are tab-separated — Shared value+desc → cols A:B, Steph → C:D, "Full row" fills A→D in one paste. `$`-prefixed values; description ≤23 chars, defaults to **store name only (no date)**, editable.
- Trips persist in localStorage (`gt_trips`, `gt_settings`); test hooks on `window.GT` (buildTrip, computeTotals, rowStrings, addTrip).

## State as of this update
- Deployed and verified: served file byte-identical to commit `8637cbd`.
- Design refinement pass done: emoji removed in favor of inline stroke SVG icons (`IC` map in the script), quieter copy, hairline borders, ink primary buttons, tinted capsule copy-buttons, 600-weight typography.
- iPhone 16 Pro pass done: 402×874 verified, safe-area top/bottom, ≥44px touch targets everywhere, no horizontal overflow, light+dark themes.
- Math verified against a real Aldi/Instacart order ($25.02 subtotal, $2.99 service, $5 tip, −$10 promo → $23.01) through assignment, qty-split, and promo-redirect scenarios.
- **Not yet verified:** live parsing with a real API key (blocked on the user entering their key on the live site).

## Environment notes
- `codex exec --sandbox workspace-write` **hangs indefinitely** when run against this folder path (the `$`/`:`/spaces in `Tools:Web Apps/Grocery $ Tracker Helper`); read-only mode works. For orchestrated runs, either rename the folder or route execution to Claude tiers.
- Orchestrator run checkpoint (steps, reviews, decisions): `/Users/collinrekowski/Automation/.claude/orchestrator/runs/2026-08-01-grocery-tracker-mobile-polish.md`.
- Session auto-memory holds the locked spec and constraints; it loads automatically in new sessions.

## Next steps (user's list, verbatim — 2026-08-01)
1. Put "Shared" in the middle, and "Steph" selector on the right.
2. Allow for drag and drop of screenshots/images into tool vs having to click to select only.
3. Determine the cost increase that would result if symmetrical square icons of each item were clipped and placed to the left of each item description where they're designated.
4. Determine the cost increase if store logos were used at the top.
5. Set the manual input of Line price to automatically input the period and overwrite what exists upon entry, not adding to it. If 4 digits are typed it would be a 2 digit whole dollar price and 2 digit cents, if 5 digits then 3 digit whole dollar price and 2 digit cents, etc. Also change to "Price", removing "Line".
6. Use a less weird looking garbage can icon.
7. Determine if the "=SPLIT(..." formula can be embedded into what's copied, or whatever is necessary to allow for automatic splitting of the inputs to their respective adjacent cells on mobile, being that the split function isn't natively embedded into the mobile version of Sheets.
8. The button colors for "Collin", etc. are good but revamp the overall theme colors to be less AI-typical and a little lighter, with less intense colors used.
9. If possible to have the images show as small clickable and expandable icons after uploading to re-reference within-app that would be a good addition.
