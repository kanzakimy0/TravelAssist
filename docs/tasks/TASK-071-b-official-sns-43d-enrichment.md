# TASK-071-B — POI Official / SNS Evidence Expansion + 43D Completion

## Status

Authorized by the user on 2026-09-20.

- Issue: #407
- Owner: B
- Upstream authoritative review: PR #398
- Upstream head: `df6d253ecba58e28afa12b79751c72414315acb2`
- Upstream final-head Quality Gate: run `35493660927` = SUCCESS
- Publication branch: `task/b-task-071-official-sns-43d-enrichment`
- Planned execution branch: `codex/b-task-071-official-sns-43d-enrichment`

## Goal

Actively expand evidence for the full 10,097 pending candidates using official websites and official SNS first, then additional trustworthy sources where necessary.

The objective is to maximize **evidence-backed** completion of:

- the frozen 43-feature POI contract;
- Visit Profile;
- Access Anchor / static access relations;
- candidate-level identity disposition.

This Task must not manufacture completeness. Unsupported facts remain `null`.

## Frozen priority order

Process exactly in this order:

1. **6,049 — TARGET_IDENTITY_UNRESOLVED**
2. **165 — IDENTITY_CONFLICT**
3. **1,422 — REVIEWED_TARGET_NO_SUPPORTED_FACT**
4. **2,461 — UNSUPPORTED_FIELDS_REMAIN_NULL**

The sum is 10,097.

Do not skip ahead to a lower-priority group while higher-priority work remains.

## Phase A — 6,049 TARGET_IDENTITY_UNRESOLVED

Primary purpose: resolve target identity, then immediately enrich the same candidate if resolved.

For each candidate search:

- Japanese/local-language canonical name;
- alternate name / historical name / romanization;
- prefecture, municipality, locality;
- street address;
- coordinates or map context where published;
- facility owner/operator;
- official phone/domain if public;
- official site cross-links;
- official SNS links and profile identity.

Preferred identity sources:

1. target-owned official site;
2. local/national government;
3. prefectural/city tourism or DMO;
4. cultural-property / museum / park / religious institution official source;
5. official operator/rail/transit source;
6. official SNS tied to the target or owner;
7. authoritative secondary corroboration.

Do not resolve identity from name similarity alone.

Once identity is sufficiently supported:
- record the identity evidence;
- do not allocate a formal Master Code;
- immediately review available sources for all 43 dimensions;
- add Visit / Access facts when supported.

If identity remains unresolved, retain that status with a complete search trail and do not score the candidate.

## Phase B — 165 IDENTITY_CONFLICT

Resolve conflicts conservatively.

Required checks should include, where applicable:

- same-name/different-location collision;
- old vs current address;
- relocation;
- merged/renamed institution;
- facility vs associated sub-facility;
- historical site vs present museum/park;
- operator change;
- coordinate mismatch;
- multiple official sources disagreeing.

A conflict may be resolved only with explicit evidence strong enough to identify the candidate target.

Never auto-link because:
- names are similar;
- coordinates are merely nearby;
- one secondary source claims equivalence;
- a search snippet appears plausible.

If unresolved, keep quarantine/conflict status and all unsupported fields null.

## Phase C — 1,422 REVIEWED_TARGET_NO_SUPPORTED_FACT

Identity is known, but prior retained evidence yielded no supported structured fact.

For each candidate actively search beyond the retained cache:

- official target website;
- official government/tourism/cultural pages;
- official operator pages;
- official SNS;
- responsible organization press/news/archive pages;
- high-quality reference sources where needed.

Do not treat the prior `REVIEWED_TARGET_NO_SUPPORTED_FACT` result as proof no evidence exists online.

## Phase D — 2,461 UNSUPPORTED_FIELDS_REMAIN_NULL

Preserve existing values and provenance.

Search specifically for remaining null fields and missing Visit/Access facts.

Existing supported values may only change when:
- a stronger source contradicts them;
- the original source was mis-scoped;
- the value was based on outdated/temporary information;
- a documented supersession decision is recorded.

No silent rewrites.

## Batch policy

Batch size: **200 candidates maximum**.

Do not mix priority groups in a single batch.

Expected deterministic phase batches:

- Phase A: 31 batches = 30 × 200 + 49
- Phase B: 1 batch = 165
- Phase C: 8 batches = 7 × 200 + 22
- Phase D: 13 batches = 12 × 200 + 61
- Total: 53 batches

Within each phase, freeze candidate membership and ordering before execution.

Flow:

```text
batch
→ source discovery
→ page/account/post open
→ full target-scoped reading
→ identity decision
→ 43D evidence extraction
→ Visit / Access extraction
→ QA
→ checkpoint / receipt
→ auto-next
```

After a normal batch passes QA, automatically start the next batch.

No human confirmation between batches.

## Source hierarchy

### Tier A — Primary / official

Highest priority:

- official target site;
- official institution/owner/operator site;
- national/prefectural/municipal site;
- official tourism / DMO;
- official cultural-property database;
- official museum/park/shrine/temple/church/castle/garden/attraction source;
- official transit/rail/bus/ferry/operator source.

### Tier B — Official SNS

Examples:
- Instagram
- X
- Facebook
- YouTube
- other public official social accounts

An SNS account may be treated as official only when ownership can be established through one or more of:
- linked from official website;
- official website linked from the account;
- verified organization identity plus matching name/location/domain;
- authoritative government/tourism page identifies the account.

For every SNS fact preserve:
- platform;
- account/handle;
- account URL;
- ownership evidence;
- post URL;
- post date;
- observation/retrieval date;
- target scope.

Do not turn temporary posts into timeless facts.

Examples that generally remain time-scoped:
- temporary closure;
- current timetable;
- limited event;
- seasonal campaign;
- current crowd/queue;
- weather;
- one-day access restriction.

### Tier C — Authoritative secondary / reference

May be used for discovery/corroboration, subject to existing rubric/source rules.

Wikipedia/Wikidata may help identify aliases/location/history references, but by themselves must not create:
- strong comparative scores;
- current operational claims;
- formal identity rebind;
- unsupported 43D values.

Search snippets are never evidence.

## Search depth

A candidate may remain unresolved or null only after reasonable source-family coverage is recorded.

For each candidate retain at minimum:

- query families attempted;
- search strings or normalized query intent;
- domains/accounts opened;
- source pages/posts actually read;
- source tier;
- accepted evidence;
- rejected evidence and reason;
- remaining unresolved identity reason;
- remaining null reason.

Do not stop after the first weak/no-result query if another relevant official source family has not been attempted.

## Frozen 43D semantics

Reuse the existing rubric exactly.

Do not change:
- feature codes;
- names;
- kind;
- 0/3/5/7/9 anchors;
- null semantics;
- rubricVersion;
- scoring policy.

Rules:

- `null` = unknown / not sufficiently supported.
- `0` = evidence supports absence in assessed scope.
- Never default to `5`.
- Name/category/fame alone is insufficient.
- A nearby attraction is not evidence for the target.
- An event is not necessarily a permanent target attribute.
- A source describing an owner/collection is not automatically evidence that the target visitor can experience it.

Every new non-null value must retain:

- feature code;
- score;
- kind;
- rubricVersion;
- annotation method;
- sourceRefs;
- confidence;
- concise rationale;
- exact locator/hash or equivalent preserved evidence pointer;
- observation date where temporal relevance matters.

Goal: **as much supported coverage as possible**, not forced 43/43.

## Comparative dimensions

Features such as:
- unique;
- hidden;
- iconic;
- similar comparative concepts;

require suitable comparative/calibration evidence under the frozen rubric.

An official site calling itself “famous”, “popular” or “must-see” does not automatically justify the maximum score.

## Visit Profile

Populate only when supported.

Examples:
- official recommended stay duration;
- explicit tour duration;
- clearly defined visit course duration;
- supported physical/walking burden descriptors allowed by the existing contract.

Do not reinterpret:
- one transport leg;
- hiking route segment;
- event runtime;
- guide duration;
- opening hours;

as generic whole-visit duration unless the source actually supports that interpretation.

## Access Anchor / static transport

May capture:
- named official nearest station/stop/port;
- official access relation;
- official shuttle/access point;
- regional/gateway anchor under current contracts.

Do not store as static truth:
- current departure time;
- live fare;
- current delays;
- current transfer sequence;
- current road time;
- real-time accessibility;
- crowd/queue.

These remain runtime/provider concerns.

## Identity / Registry protection

This Task may produce candidate-level identity resolution evidence.

It must not:
- allocate new formal Master Codes;
- release unknown number ranges;
- change canonical Registry allocation;
- rebind old codes;
- silently merge candidateKeys;
- delete conflicting source observations.

Existing protected checksums are acceptance invariants unless the task explicitly stops for review.

## Batch QA

Every batch must verify:

- exact phase and frozen candidate membership;
- no duplicates;
- full candidate disposition count;
- candidate identity input integrity;
- source cache / archive integrity;
- source ownership classification;
- official-SNS ownership evidence where used;
- full 43-key shape;
- valid score range;
- complete provenance for every new non-null value;
- locator/hash integrity;
- no unsupported default scores;
- Visit semantics;
- Access semantics;
- no formal-code/Registry mutation;
- deterministic output;
- resumable checkpoint;
- incomplete/corrupt receipt rejection.

Receipt is written last.

## Required telemetry

Per batch record at least:

- phase;
- batch ID;
- model;
- reasoning configuration;
- start/end/elapsed;
- candidate count;
- source-query candidate count;
- total queries;
- official target pages opened;
- government/tourism/cultural pages opened;
- official operator pages opened;
- official SNS accounts opened;
- official SNS posts opened;
- authoritative secondary pages opened;
- full-text/page/post review count;
- identity resolved count;
- conflict resolved count;
- unresolved/conflict retained count;
- candidates gaining at least one feature;
- new non-null feature count;
- provenance count;
- locator/hash validation count;
- Visit Profile additions;
- Access Anchor additions;
- static access link additions;
- rejected-evidence count;
- error/review queue count;
- input checksum;
- source archive checksum;
- output checksum;
- Registry checksum before/after;
- candidate identity checksum before/after.

## Final report

After all 10,097 candidates complete, report:

### Identity
- TARGET_IDENTITY_UNRESOLVED before/after;
- IDENTITY_CONFLICT before/after;
- newly resolved identity count;
- unresolved reason distribution.

### 43D
- scored POIs before/after;
- total non-null feature positions before/after;
- feature additions;
- null positions remaining;
- per-feature coverage;
- POI coverage bands:
  - >=1 feature;
  - >=10;
  - >=20;
  - >=30;
  - 43/43.

### Sources
- candidates with official-site evidence;
- candidates with government/tourism/cultural evidence;
- candidates with official-SNS evidence;
- source mix by tier/domain/platform;
- rejected secondary/source counts.

### Visit / transport
- Visit Profiles before/after;
- Access Anchors before/after;
- static access links before/after.

### Integrity
- formal Master Code changes = 0;
- Registry rebinds = 0;
- protected checksum before/after;
- errors/review queue;
- deterministic final check;
- exact final-head GitHub Quality Gate.

## Git / stacked PR

PR #398 is upstream and remains Draft/Open unless separately accepted by the user.

While #398 is unmerged:

- base TASK-071 execution from this task publication branch;
- open TASK-071 Draft PR against:
  `codex/b-poi-remaining-10097-evidence-review`;
- do not modify #398;
- do not auto-merge.

If #398 is later accepted and merged:
- normally merge latest `origin/develop` into TASK-071;
- do not rebase a published branch;
- do not force push;
- retarget the TASK-071 Draft PR to `develop`;
- rerun all exact-head gates.

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

## Required deliverables

At minimum:

- frozen manifests for all four phases;
- 53 batch receipts/checkpoints if populations remain unchanged;
- source discovery / evidence archive manifests;
- official-SNS ownership/evidence records where applicable;
- updated candidate sidecars;
- identity-resolution dispositions;
- per-batch QA;
- final aggregate QA;
- `docs/qa/TASK-071-B/README.md`;
- machine-readable QA under `docs/qa/TASK-071-B/`;
- `docs/tasks/RESULT-TASK-071-b-official-sns-43d-enrichment.md`;
- one Draft PR;
- exact final-head Quality Gate PASS.

## Completion

Task completion requires all 10,097 candidates to receive a source-expansion disposition in the frozen priority order.

A candidate may still contain nulls or remain unresolved after the Task, but only with documented search coverage and reason.

Do not claim:
- forced 43/43 completeness;
- production import;
- formal Master Code completion;
- independent Human Gold.

Stop after final Draft PR / QA and return the full Result for user acceptance.
