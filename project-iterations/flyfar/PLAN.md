# PLAN.md — flyfar v5 iteration

> Think carefully and step-by-step — this iteration spans multiple files and introduces URL encoding logic for flight result links, a ranking/recommendation layer, and multi-city output wiring.

## Use-case gate (all 4 features)

### Feature 1: Multi-city command completion

- **具體場景**: User runs `flyfar multi --route TPE,NRT,ICN,TPE --dates 2026-05-01,2026-05-05,2026-05-10` for a 3-leg trip. The CLI accepts the input, sends the protobuf-encoded request, receives results — but the table renderer may misalign columns because `formatSearchTable` was designed for 1-2 segment layouts, and the parse layer may drop legs beyond leg 2.
- **既有方案 gap**: `multiCityCommand` already exists as a scaffold, but: (a) `parseFlightsHtml` may not handle 3+ leg results in the response, (b) `formatSearchTable` has hardcoded column assumptions (first segment / last segment) that break for 3+ legs, (c) CSV output is not wired for multi-city at all.
- **做 vs 不做成本**: Not doing = multi-city is half-baked and silently gives wrong/missing data for real 3-leg trips. Fixing is a bounded parse+output change. Maintenance cost of not doing is silent data loss; cost of doing is <1 day.

### Feature 2: Recommended flight (best pick)

- **具體場景**: User runs `flyfar search --from TPE --to NRT --date 2026-06-01` and gets a 20-row table. They want a one-line "best" answer: earliest reasonable departure under median price. CLI outputs a short summary block instead of a full table.
- **既有方案 gap**: `sortFlights` sorts by a single key but has no composite scoring (price + time + stops). There is no `--recommend` flag or equivalent.
- **做 vs 不做成本**: Not doing = user always gets full table even when they just want guidance. No workaround in existing tool. Cost of doing is a new output mode with a simple ranking formula.

### Feature 3: Result link

- **具體場景**: User searches and wants to open the result in Google Flights. Currently they would need to manually construct the URL. CLI should print a shareable deep link per flight (or one per search).
- **既有方案 gap**: `buildFlightsUrl` already exists in `query.ts` but is never called in `searchCommand` output. No URL is printed.
- **做 vs 不做成本**: Not doing = no deep link, users manually reconstruct. Cost of doing is one function call wired into output; low risk.

### Feature 4: Multi-leg prototype (pre-research)

- **具體場景**: User runs `flyfar multi --route TPE,NRT,ICN,TPE --dates ...` and we need to know if Google Flights backend accepts 3+ leg protobuf payloads at all, or if it silently falls back / errors.
- **既有方案 gap**: We don't know if the current protobuf schema + URL encoding actually works for 3+ legs on Google's backend. This is an unknown risk.
- **做 vs 不做成本**: Not doing = ship Feature 1 on guessed behavior. Doing = run the prototype first and get a definitive answer. Cost is 30 min of testing; benefit is avoiding shipping broken multi-city.

---

## Focus

Wire multi-city output pipeline (Feature 1), add best-flight recommendation mode (Feature 2), emit Google Flights deep links (Feature 3), and run multi-leg prototype to validate 3+ leg support (Feature 4).

## Touched features

- `features/multi-city.md` — full output pipeline wiring + parse validation
- `features/recommend.md` — new recommendation output mode
- `features/result-link.md` — new deep link emission

## Promote Verification

- Carryover from v4: none — v5 just opened.

## Alternatives considered

### Feature 1 — Multi-city parse approach

- **A. Extend `parseFlightsHtml` to return per-leg results**: Parse returns `legs[].flights[]` and renderer iterates legs. Correct semantics but requires changing `SearchResponse` type significantly.
- **B. Flatten multi-leg results into existing `FlightResult[]` with a `leg` field**: Minimal type churn; parse tags each result with which leg it belongs to. Downside is existing consumers need to handle the new field.
- **C. Keep parse unchanged, fix only `formatSearchTable` and `formatSearchCsv`**: Assume parse already handles multi-leg but just formats badly. Fastest but riskiest if parse has hidden bugs.

### Feature 2 — Recommendation ranking

- **A. Simple weighted score**: `score = price_rank * 0.4 + duration_rank * 0.3 + stops_rank * 0.3`. Easy to implement, transparent.
- **B. Rule-based**: "Cheapest flight that departs before 2pm and has <= 1 stop". Hard-codes user preferences.
- **C. Subagent `general-purpose`**: Use a general-purpose subagent to rank results. Overkill for this use case; adds latency.

### Feature 3 — Link placement

- **A. One link per search** (after the table). Easy, matches existing UX pattern.
- **B. One link per flight row** (append column or footnote). More actionable but breaks table layout for CSV/JSON.
- **C. Only in JSON output**. Most correct since URL is structured data; table output stays clean.

---

## Scope

**In:**
- `src/commands/search.ts`: wire CSV output for multi-city; add `--recommend` flag to `search` command
- `src/core/parse.ts`: validate 3+ leg response handling (no structural changes unless prototype shows breakage)
- `src/output/table.ts`: add `formatRecommendTable`; fix multi-leg column rendering
- `src/output/csv.ts`: wire multi-city CSV output
- `src/output/json.ts`: add deep link field to JSON output
- `proto/flights.proto`: (read-only for research; no changes)
- New `src/output/recommend.ts` (optional if logic is simple enough to live in `table.ts`)
- Prototype script for Feature 4

**Out:**
- No changes to `buildTfsParam` / protobuf encoding (Feature 4 is read-only research)
- No changes to `cheapest` command
- No changes to `types.ts` data model (add fields via intersection types if needed)

---

## Open questions

1. **Feature 4 (multi-leg prototype)**: Does Google Flights backend accept and return valid results for 3+ leg `tfs` payloads? If it returns 400/500 or silently drops legs, Feature 1's scope changes significantly. Running prototype first is required before finalizing Feature 1.
2. **Feature 2 (recommend threshold)**: What constitutes "best"? A simple composite score (price + duration + stops) is the baseline, but Sam may prefer a different weighting. Recommend asking for a preference before shipping.
3. **Feature 3 (URL pattern)**: The current `buildFlightsUrl` uses `/travel/flights/search` with `tfs` param. Is this the correct pattern for deep-linking to a specific flight result, or does Google Flights use a different URL schema for pre-filled searches? Need a quick WebFetch to verify.

---

## Todo

| # | Item | Tool | Verify |
|---|------|------|--------|
| 1 | **Feature 4 — Multi-leg prototype**: Run `flyfar multi --route TPE,NRT,ICN,TPE --dates 2026-05-01,2026-05-05,2026-05-10` and capture response. Categorize as: (a) valid 3-leg results returned, (b) fallback to partial results, (c) error/empty. | `Edit + Bash` (test script) | Exit code 0 + JSON output with 3+ distinct `leg` groups OR categorized failure written to `memory/flyfar-v5-prototype.md` |
| 2 | **Feature 1 — Wire multi-city CSV + fix table multi-leg columns**: In `src/commands/search.ts` `multiCityCommand`, add `formatSearchCsv` branch. In `src/output/table.ts`, detect multi-leg results and render per-leg sub-tables or annotate rows with leg number. | `Edit + Read` | `grep -c "formatSearchCsv" src/commands/search.ts` returns >=1; `grep -c "leg" src/output/table.ts` returns >=1 |
| 3 | **Feature 3 — Deep link in JSON output**: Call `buildFlightsUrl` from `searchCommand` after `buildTfsParam`, pass URL string into `formatJson` response, add `deepLink` field to JSON output. | `Edit + Read` | `grep "deepLink\|buildFlightsUrl" src/output/json.ts` returns >=2 occurrences |
| 4 | **Feature 2 — Recommend mode**: Add `--recommend` boolean flag to `search` command. In `searchCommand`, when flag is set, compute composite score (price 40% + duration 30% + stops 30%), pick top-1, output via new `formatRecommendTable` in `table.ts`. | `Edit` | `grep -c "recommend" src/commands/search.ts` returns >=1; `grep "formatRecommendTable" src/output/table.ts` returns 1 |
| 5 | **Cross-file verification**: After all edits, run `npm run build` and confirm exit code 0. | `Bash` | `npm run build` exits with code 0 |

**Dispatch round**:
- Todos 1-4 are independent and can run in parallel (subagent dispatch possible for each feature block)
- Todo 5 is sequential gate after all others complete
- Bounded context: each subagent gets this PLAN.md excerpt plus the specific file paths and the relevant code sections above

---

## Commit strategy

Each feature (1-4) is one commit:

```
feat(multi-city): wire CSV output and fix table multi-leg column rendering
feat(result-link): emit Google Flights deep link in JSON output
feat(recommend): add --recommend flag with composite score best pick
fix(multi-leg-prototype): record 3+ leg backend behavior for v5
```

Commit after each completed feature, per Sam's standing permission on atomic commits.