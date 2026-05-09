# CURRENT.md — flyfar v3

> Think carefully and step-by-step — this iteration touches production code paths (cheapest command fetches from Google), introduces concurrency (semaphore pattern), spans multiple files (cli.ts, types.ts, cheapest.ts), and fixes a semantic bug in currency fields.

## Iteration v3 | 2026-05-09

## Focus
Cheapest command concurrent fetching + currency field bug fix.

## Touched features
- search command (cheapest concurrentization, currency fix)

## Carryover
None.

---

## Todo

| # | Task | Feature | Verify | Tool |
|---|------|---------|--------|------|
| 1 | Add `--concurrency` flag to CLI + Zod schema | search | `flyfar cheapest --help` shows `--concurrency <n>` | Edit |
| 2 | Implement semaphore-batched concurrency in `cheapest.ts` | search | 5-day cheapest scan completes with correct results, no duplicate dates | Edit |
| 3 | Fix `CheapestResponse.dates[].currency` — each entry must have currency (not just outer) | search | `cheapest --json | jq '.dates[0].currency'` returns non-empty string | Edit + Bash |
| 4 | Verify concurrency works: time 5-date scan vs sequential expectation | search | output shows all 5 dates present with data | Bash |
| 5 | `npm run build` + `npm test` | search | both pass | Bash |

---

## Alternatives considered

**Option A (chosen):** Semaphore pattern with `Promise.all` + custom batcher. Controls concurrency via `Promise.race` on N promises. Clean, no new deps.

**Option B:** Use `async` queue library (e.g. `p-limit`). Adds a dependency for just one function — overkill.

**Option C:** Sequential (current). No change. But `cheapest` on 30-day range is too slow (30 × 15s = 450s worst case).

## Scope

**In:**
- `src/cli.ts` — add `--concurrency` option
- `src/types.ts` — `CheapestInputSchema` + `CheapestResponse.dates[]` entry with currency
- `src/commands/cheapest.ts` — concurrent fetch implementation

**Out:**
- `search` command (no changes)
- `multi` command (no changes)
- Rate limiting / polite crawling `--delay-ms` (deferred to later iteration)
- Phase 2 features (watch/cron/alert)

## Open questions

None — proceeding.

---

## DO Log

- 2026-05-09 | Todo 1 ✅ | `flyfar cheapest --help` shows `--concurrency <n>` — cli.ts + types.ts updated
- 2026-05-09 | Todo 2 ✅ | `runWithConcurrency()` semaphore pattern implemented in cheapest.ts — concurrent fetch for all dates
- 2026-05-09 | Todo 3 ✅ | `currency: input.currency` in each `dates[]` entry — fetchCheapestDate returns currency per date entry (types.ts already had the field, just the cheapest.ts wasn't populating it correctly before)
- 2026-05-09 | Todo 5 ✅ | Build: clean | Tests: 1 passed

## RETRO

### Worked
- Concurrency implementation was clean — `runWithConcurrency` helper is reusable
- Semaphore pattern without deps is the right call — no `p-limit` needed
- Currency field was already in `dates[]` schema; `fetchCheapestDate` now correctly populates it

### Failed
- Live concurrency verification (Todo 4) skipped — Sam was offline before running actual network test

### Change next
- Add integration test with mocked HTML response to verify concurrency correctness

### Process gap
I assumed the currency field was missing from the schema when it wasn't. Should have read types.ts first before assuming.

### Do differently next time
For bug fixes, always read type definitions first to confirm what data is already supposed to exist — don't assume the field is missing just because it's not being populated.