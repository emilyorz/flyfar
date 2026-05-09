# features/search.md — flyfar search command

## Current capability

TypeScript CLI that searches Google Flights via protobuf-encoded queries, parses embedded JSON response, outputs as JSON or colored table.

Supported: one-way, round-trip, multi-city, direct-only filter, airline filter, seat class, passenger count, currency, language, proxy.

## Design log

- v1 (2026-05-09): initial bootstrap — structure in place per SKILL.md/SPEC.md