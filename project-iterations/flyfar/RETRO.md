# RETRO.md — flyfar v5

## Worked

- **P0s caught pre-merge**: EXPLORE found 7 gaps, VERIFY-B found 2 P0 bugs (csv.ts missing Leg column, indexOf ranking bug). Both fixed before iteration close — no shipped defect.
- **Sam corrected the process deviation**: When DO ran before formal 9-step SDD (subagents dispatched without Explore/Prototype/Spec/Usage/Tkt), Sam's instruction to restart caused the team to re-enter properly via task-ledger workflow. The deviation was caught and corrected within the same iteration.
- **Build passed**: After P0 fixes, `npm run build` exited 0.

---

## Failed

- **Process shortcut before Sam's correction**: Subagents dispatched into DO before Explore/Prototype/Spec/Usage/Tkt phases completed. This produced implementation work that had to be partially redone when the task-ledger workflow was re-entered. The extra cost was one round of rework on the 3-feature scope.
  - `promote ⭐ P1 S — subagent work against incomplete spec caused DO-redo; the rework is the evidence`

- **Quality gate arrived late**: Both P0 bugs (Leg column missing, indexOf ranking) were found by VERIFY-B after implementation was complete. Neither was caught by the DO-phase implementation step itself.
  - `promote ⭐ P1 M — quality gate post-DO instead of parallel-to-DO; VERIFY-B had to re-examine code it didn't author`

- **No spec review before dispatch**: The three features (multi-city CSV+table, deep link JSON, --recommend) were dispatched without a prior Spec + Usage step that would have surfaced the missing Leg column and ranking logic gap.
  - `park age 1/3 — trigger: next iteration enters DO with formal 9-step SDD, then this item retires or gets promoted`

---

## Process gap

**Subagents were dispatched against an underspecified brief.** The DO phase started before the 9-step SDD (Explore/Prototype/Spec/Usage) completed, causing subagent-impl to operate on a brief that didn't include the multi-leg column structure or ranking edge case. VERIFY-B subsequently surfaced both as P0 bugs — confirming they were spec gaps, not implementation typos. A Spec review step before dispatch would have caught the Leg column gap; the ranking bug would still have been caught by VERIFY-B but with the spec in hand, the fix would have been faster.

---

## Change next

- **Enforce Explore-to-Dispatch gate**: No subagent enters DO until Explore phase findings are written to the iteration doc and acknowledged by Sam. Dispatch without gate = process violation, retro entry required.
  - `promote ⭐ P1 M — next iteration has 3 features, dispatch gate applies from start`

- **Run VERIFY-B concurrently, not post-DO**: Quality verifier reads the same brief as the implementer so findings surface before implementation is closed, not after. Cost: sharing the brief file path with the verifier at dispatch time.
  - `park age 1/3 — trigger: if next iteration's verifier confirms concurrent-read works, this item retires`

---

## Next-round Focus preview

| # | Item | Source | Feature |
|---|------|--------|---------|
| 1 | Enforce Explore-to-Dispatch gate (no DO without Sam ack on EXPLORE) | Failed item #1 | workflow |
| 2 | Run quality verifier against the same brief as impl (concurrent) | Failed item #2 | workflow |

Promote count: 2 (cap = 3)
Park count: 2 (trigger conditions confirmed)
Drop count: 0
Re-promoted items: none