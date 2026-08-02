# Project Status — Grocery $ Tracker Helper

Updated: 2026-08-01 (written for session-context handoff; read this first when resuming work)

## What this is
Single-file, mobile-first web app (`index.html`, no build step, no dependencies) that reads grocery order screenshots and splits the cost between **Collin / Steph / Shared**, producing one-tap copy rows for the "Grocery $ Tracker" Google Sheet.

- **Live:** https://cmr2334.github.io/grocery-tracker/ (GitHub Pages, repo `CMR2334/grocery-tracker`, main branch, legacy Pages build from root)
- **Local:** this folder is the git repo; every push to `main` redeploys in ~30–60s.

## Architecture
- Screenshot parsing: browser → Anthropic Messages API directly (`anthropic-dangerous-direct-browser-access` header), BYOK — the user enters an API key in ⚙️ Settings; stored in localStorage only. Structured outputs (`output_config.format` json_schema) guarantee parseable JSON. Default model `claude-opus-5`, option `claude-haiku-4-5`.
- The AI only extracts (items, qty, line totals, fees, tip, tax, promos, WI taxability guesses). **All split math is deterministic in-app** (`computeTotals`): fees/tip proportional to each person's pre-tax items; the receipt's actual tax spread across taxable items; promos default to Collin with redirect / split-amount / by-item modes; qty splits with remainder-to-primary; penny drift pinned so category totals always equal the computed total.
- Sheet contract: copy strings are tab-separated — Shared value+desc → cols A:B, Steph → C:D, "Full row" fills A→D in one paste. `$`-prefixed values; description ≤23 chars, defaults to **store name only (no date)**, editable. The contract is unchanged.
- Trips persist in localStorage (`gt_trips`, `gt_settings`); parsed screenshot previews are held in session memory keyed by trip id, not localStorage. Test hooks remain on `window.GT` (`buildTrip`, `computeTotals`, `rowStrings`, `addTrip`).

## State as of this update
- Today's run (`2026-08-01-grocery-tracker-next-steps`) completed in commits `498e01b`, `a89a271`, `94146dd`, `db5b406`, and `2d4a83e`. Live-browser verification passed, including `GT.rowStrings` byte-match against the pre-run baseline; the sheet contract is unchanged.
- Person selectors are ordered **Collin / Shared / Steph** everywhere: the `CATS` array, promo-mode buttons, and promo split rows. The trash action uses a cleaner outline icon.
- The whole New Trip screen accepts dragged screenshots. It uses a depth-counter highlight, filters to image MIME types with a toast for rejected files, and recovers on `window` `dragend`. A module `parsing` flag blocks adding/removing images and re-firing Analyze while a parse is running, closing the double-API-charge race.
- The item price editor is labeled **Price** and uses cents-first digit-buffer entry (`1234` → `$12.34`). Focus clears the field; empty blur restores the prior value; the buffer is re-derived from field text so select-all/retype, paste, and autofill work; input is capped at seven digits; explicit `0` commits `$0.00`.
- Screenshot lightbox is complete: scrim/X dismiss, iOS-safe body scroll lock, and safe-area handling. After parsing, screenshots persist in session memory by trip id and appear as a 52px tappable strip on the trip screen. They are deliberately not stored in localStorage, so the strip disappears after reload for quota safety.
- Theme refinement is complete: warm linen light (`#f5f1ea`), warm charcoal dark (`#1c1a17`), soft taupe `--primary` instead of stark ink-block buttons, desaturated status colors, and synchronized `meta` theme-color. All computed color combinations pass WCAG AA+; person colors are unchanged.
- Delivered analyses are recorded in the run checkpoint; decisions remain with Collin:
  - Per-item model bounding-box icons are estimated at ~27% more cost per parse; **NO-GO recommended** because receipt bbox accuracy is risky. Local category icons are the suggested alternative.
  - Store logos add $0 API cost; **GO recommended** using an inline SVG map with alias normalization, with an estimated ~30–120KB weight consideration. Not implemented.
  - `=SPLIT` paste research is complete, but whether a grid paste evaluates a formula on iOS is unconfirmed. An 8-step on-device test checklist exists; an HTML-clipboard route may be better because it pastes values, not formulas. No format change was made; the spec remains locked.
- **Not yet verified:** live parsing with a real API key (the user still needs to enter one on the live site).

## Environment notes
- The `codex exec` hang was reproduced and root-caused to STDIN, not the path: startup blocks when inherited stdin is an open non-TTY pipe. Always append `< /dev/null` (or detach stdin); with that, `workspace-write` works fine against this folder (`codex 1.0.4`).
- Orchestrator run checkpoint (steps, reviews, decisions): `/Users/collinrekowski/Automation/.claude/orchestrator/runs/2026-08-01-grocery-tracker-next-steps.md`.

## Next steps
Candidate next steps raised by Collin on 2026-08-01; none is decided yet:

1. Validate an optional second parse provider using an OpenAI key and GPT-5.6 Luna (max reasoning). Browser CORS and structured outputs make it feasible in principle, and the estimated cost is ~20–25× lower than Opus 5; a side-by-side accuracy test on real screenshots is still needed.
2. Decide whether to add cross-device desktop↔phone trip sync. Trips are per-browser localStorage today; the recommended fit for the single-file/no-backend architecture is BYOK GitHub Gist sync, with Cloudflare Worker+KV as the alternative.
3. If approved, implement the inline-SVG store-logo map and alias normalization.
4. Run the on-device `=SPLIT` checklist if mobile formula paste remains important; keep the current sheet format locked unless the test supports a change.
5. Complete live parsing verification with a real API key.
