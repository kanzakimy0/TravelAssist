# WBS 5.12 Companion Schema v1 — Freeze Record

> Date: 2026-09-11\
> WBS: 5.12 — Companion Schema\
> Owner: B / Personal Center / Companion Data\
> Status: **Frozen Implementation Baseline for TASK-044-B**

The user explicitly confirmed the full field/boundary review of `docs/architecture/companion-schema-v1.md` and authorized generation of the implementation Task.

The approved design content is the v0.1 candidate document stored at:

```text
docs/architecture/companion-schema-v1.md
blob: d7db47d6991e88e9cb520c43e1e7ae493dec9bd3
```

This Freeze Record changes **no product semantics**. For TASK-044-B, the candidate document must be treated as frozen v1.0 implementation input together with the explicit rules in the Task.

Confirmed decisions include:

1. no self Companion DB row; self is a Profile/Preference/Trip projection;
2. group self membership uses `includes_owner`;
3. DOB and fallback age group are mutually exclusive facts;
4. planning bands: 0–2 infant, 3–17 child, 18–64 adult, 65+ senior;
5. gender is optional display metadata and is not a recommendation signal;
6. six stable mobility codes;
7. five dining codes with no specific sensitive free-text allergen/medical persistence in v1;
8. five positive activity-interest codes;
9. `diningNote` / `privateNote` are deferred;
10. Trip Companion Snapshot is a frozen boundary only, not a 5.12 table/runtime deliverable;
11. deleting Companion Master must not alter historical Trip snapshots;
12. no cross-account Companion sharing/invitation in v1.

Implementation tracking:

- Task: `TASK-044-B`
- Issue: `#312`
- Spec branch: `task/b-wbs-5-12-companion-schema`
- Implementation branch: `codex/b-account-wbs-5-12-companion-schema`

Task publication does not start implementation. Master WBS 5.12 remains `未开始` until Codex actually begins work.
