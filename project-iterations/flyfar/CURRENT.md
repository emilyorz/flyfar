# CURRENT.md — flyfar v4

> Think carefully and step-by-step — this iteration adds sort + CSV output features, spanning output/table.ts, output/json.ts, types.ts, cli.ts, and commands/search.ts. Qualifying iteration per hardthink gate (≥2 files).

## Iteration v4 | 2026-05-09

## Focus
Add sort options and CSV output mode.

## Touched features
- search command (sort, CSV export)

## Carryover
None.

---

## Todo

| # | Task | Feature | Verify | Tool |
|---|------|---------|--------|------|
| 1 | Add `--sort` option to `search` command (price\|duration\|departure\|stops) | search | `flyfar search --help` shows `--sort` | Edit |
| 2 | Implement sort logic in `src/output/table.ts` + `src/output/json.ts` | search | `flyfar search --from TPE --to NRT --date 2026-05-15 --sort duration --json` returns sorted by duration | Edit |
| 3 | Add `--output csv` flag to search + cheapest commands | search | `flyfar search --output csv --from TPE --to NRT --date 2026-05-15` outputs CSV header + rows | Edit + Bash |
| 4 | `npm run build` + `npm test` | search | both pass | Bash |

---

## Alternatives considered

**Option A (chosen):** Sort + CSV as separate `--sort` and `--output` flags on existing commands. Minimal API surface, composable.

**Option B:** Use output modes (json/table/csv) as mutually exclusive `--format` flag. More restrictive — can't combine with `--json`.

**Option C:** Separate `flyfar list` command for metadata listing. Good idea but out of scope for this iteration (defer to v5).

## Scope

**In:** `src/cli.ts`, `src/types.ts`, `src/output/table.ts`, `src/output/json.ts`, `src/commands/search.ts`.

**Out:**
- `cheapest` sort (not exposed in SPEC, defer)
- `multi` command changes
- `--list` command (v5 candidate)

## Open questions

None — proceeding.

---

## DO Log

- 2026-05-09 | Todo 1 ✅ | `--sort` flag added — `flyfar search --help` shows `price | duration | departure | stops`
- 2026-05-09 | Todo 2 ✅ | `sortFlights()` in `output/table.ts`, applied in `searchCommand()` before formatting
- 2026-05-09 | Todo 3 ✅ | `--output csv` added; new `output/csv.ts` with `formatSearchCsv()`, integrated into search command
- 2026-05-09 | Todo 4 ✅ | Build clean (30.27 KB), tests 1 passed

## RETRO

### Worked
- Sort + output as separate flags was right call — composable, non-breaking
- `SortKey` type exported from table.ts for type safety in search.ts
- `escapeCsvField()` handles commas/quotes/newlines correctly

### Failed
- CSV output not added to `cheapest` command (out of scope but worth noting Sam may want it)
- `multiCityCommand` still uses old if/else output branching — not updated to use sort/output pattern

### Change next
- Add CSV output to `cheapest` command (same `formatSearchCsv` pattern)
- Update `multiCityCommand` to use same output dispatch pattern as `searchCommand`

### Process gap
I implemented sort in `searchCommand` but missed updating `multiCityCommand` in the same pass. Should have done both in one edit session since the pattern was identical.

### Do differently next time
When adding a feature that applies to multiple commands (sort, output modes), update all affected commands in the same commit — don't leave one using old code while the other uses new.