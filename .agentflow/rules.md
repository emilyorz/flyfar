# AgentFlow v9 engineering-result review rule

Apply one exact-version independent review to each changed engineering result. The reviewer must be from a different model family than the implementer. If an independent reviewer is unavailable, stop with an explicit owner reconciliation; ordinary host fallback is not allowed. This rule does not create review stages for Q&A, read-only investigations, or non-engineering artifacts, and it does not recreate the v8 pipeline/cross-check/full-suite ceremony.

Owner reconciliation required before apply: confirm the project rule destination, reviewer family/identity, unavailable-reviewer stop behavior, and preservation of existing Ask/Reply, owner/lease/receipt lineage, immutable evidence, and HOLDs.
