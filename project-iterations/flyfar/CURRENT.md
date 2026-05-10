# CURRENT.md — flyfar v5

> Think carefully and step-by-step — this iteration spans multiple files and introduces URL encoding logic for flight result links, a ranking/recommendation layer, and multi-city output wiring.

## Iteration v5 | 2026-05-10

## Focus
Wire multi-city output pipeline (Feature 1), add best-flight recommendation mode (Feature 2), emit Google Flights deep links (Feature 3). Multi-leg 3+ support confirmed not supported by Google backend → Feature 4 dropped.

## Touched features
- `features/multi-city.md` — full output pipeline wiring + parse validation
- `features/recommend.md` — new recommendation output mode
- `features/result-link.md` — new deep link emission

## Carryover
None.

---

## Ack

`<!-- ack: 104 -->`

## DO Log

| When | What | Status |
|------|------|--------|
| 2026-05-10 | Enter DO — 3 features (multi-city CSV+table, deep link JSON, --recommend) | DONE |
| 2026-05-10 | EXPLORE phase + report | DONE |
| 2026-05-10 | VERIFY-B quality check — found 2 P0 | DONE |
| 2026-05-10 | P0 fixes: csv.ts Leg column, search.ts indexOf bug | DONE |
| 2026-05-10 | Build verification | DONE |
| 2026-05-10 | RETRO written | DONE |