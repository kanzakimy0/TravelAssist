# TASK-073-B — POI Identity Deep Resolution + Null-Targeted 43D Expansion

## Status

Authorized for unattended execution after stabilization and dual-canary PASS.

- Issue: #411
- Owner: B
- Upstream: TASK-072-B / Issue #409 / Draft PR #410
- Upstream execution head at publication: `d199cc93354a6232ff0ab2f9fdc516b17e3c1915`
- Publication branch: `task/b-task-073-identity-deep-null-targeted-43d`
- Planned execution branch: `codex/b-task-073-identity-deep-null-targeted-43d`

## Purpose

Finish the remaining POI enrichment work by doing two things that must happen together:

1. actively resolve the 6,014 remaining identity-blocked candidates;
2. actively search for evidence to reduce the remaining null 43D fields for the 4,083 enrichment-ready candidates.

This task is not a mechanical decision-generation pass. It must search, read, annotate semantically, project supported facts with provenance, and preserve unsupported fields as null.

## Authoritative upstream baseline

Use the corrected TASK-072 current-candidate view as the starting point.

Expected baseline at task start:

- global population: 10,369
- pending population: 10,097
- global scored POIs: 2,515
- global non-null 43D fields: 6,111
- identity second-pass: 5,849
- identity conflicts: 165
- enrichment-ready: 4,083
- authoritative Visit Profiles: 23
- authoritative Access/static links: 1,538

The task must never regress these supported values silently.

## Gate 0 — Upstream stabilization

The current upstream head has one failing repository test:

`tests/poi-remaining-review.test.mjs:181`

Observed failure:

`minimumDurationMinutes: null !== 60`

Before any bulk production:

1. reproduce the failure locally;
2. trace the candidate and authoritative Visit evidence;
3. determine whether:
   - the 60-minute minimum is still supported and projection lost it; or
   - the test is stale because the authoritative evidence no longer supports 60;
4. fix the data/projection/test only according to evidence and existing contracts;
5. run targeted Visit tests;
6. run the full repository Node test suite;
7. do not proceed until the local suite is green.

Do not change expected 60 to null merely to make CI pass.

## Track A — Identity Deep Resolution

Frozen population:

- 5,849 `SECOND_PASS_REQUIRED`
- 165 `IDENTITY_CONFLICT`
- total: 6,014

Freeze deterministic membership/order before execution.

### Required search

For every candidate actively search and compare, where applicable:

- canonical Japanese/local name;
- English / romanization;
- aliases / historical names;
- prefecture;
- municipality;
- locality / address;
- coordinates / map context;
- owner / operator;
- official domain;
- government / tourism / cultural source;
- official operator;
- official SNS;
- authoritative secondary corroboration.

### Allowed outcomes

Every Track A candidate must end in exactly one:

- `RESOLVED_HIGH`
- `RESOLVED_MEDIUM`
- `DEEP_RESEARCH_REQUIRED`
- `IDENTITY_CONFLICT_HOLD`

### Evidence thresholds

`RESOLVED_HIGH` requires strong identity evidence such as:

- target-owned/official/government source plus discriminative geographic or organizational match; or
- multiple strong independent authoritative sources converge.

`RESOLVED_MEDIUM` requires all:

- >=2 independent identity signals;
- at least one discriminative signal beyond bare name;
- retained source/evidence refs;
- no unresolved credible competing target.

Discriminative signals include:

- address / locality / municipality;
- coordinates/map context;
- owner/operator;
- official domain;
- verified official account;
- documented rename/relocation relationship.

Otherwise use `DEEP_RESEARCH_REQUIRED` or `IDENTITY_CONFLICT_HOLD`.

### Immediate enrichment after resolution

When a candidate becomes HIGH or MEDIUM:

1. retain identity evidence;
2. mark candidate-level resolved-for-enrichment;
3. immediately continue 43D null-targeted enrichment;
4. attempt Visit Profile;
5. attempt Access Anchor/static access.

Do not wait for all identity work to finish before enrichment.

### Deep research queue

Candidates still unresolved/held must be written to:

- `docs/qa/TASK-073-B/identity-deep-research.md`
- `docs/qa/TASK-073-B/identity-deep-research.jsonl`

Each row must contain:

- candidateKey;
- names / aliases;
- known locality/address/coordinates;
- searches attempted;
- official/secondary sources opened;
- best target candidates;
- competing targets;
- missing discriminative evidence;
- reason not resolved;
- recommended next action;
- confidence;
- whether enrichment remains blocked.

## Track B — Null-Targeted 43D Expansion

Frozen population: 4,083 enrichment-ready candidates from TASK-072.

For every candidate:

1. load current authoritative 43D values/provenance;
2. preserve supported current values;
3. enumerate remaining null feature codes;
4. actively search evidence specifically useful for those nulls;
5. perform semantic annotation;
6. apply frozen rubric;
7. project supported new values with provenance;
8. leave unsupported fields null with explicit reason;
9. attempt Visit and Access.

### Search by feature families

Do not run 43 blind searches per POI. Group search intent efficiently while still deciding all 43 fields.

Suggested families:

- history / architecture / art / local / educational;
- scenery / nature / photo / seasonality;
- food / shopping / entertainment / night / onsen;
- family / senior / couple / solo / relax / adventure;
- walking / physical / indoor-outdoor / weather sensitivity;
- cost / reservation / visit duration / access;
- unique / iconic / hidden only with comparative evidence.

## Source hierarchy

Preferred order:

1. target-owned official site;
2. government / prefecture / municipality;
3. official tourism / DMO;
4. official cultural-property / museum / park / religious source;
5. official operator / rail / transit;
6. verified official SNS;
7. authoritative secondary/reference;
8. general secondary only when source quality and target scope are explicit.

Search snippets are discovery only, never evidence.

For official SNS retain:

- platform;
- account/handle;
- ownership evidence;
- post URL;
- post date;
- observation date;
- target scope;
- retained text/hash/locator.

Do not promote temporary current facts into timeless static master data.

## Frozen rubric / feature rules

Reuse the existing 43-feature rubric unchanged.

- `null` = unknown / unsupported.
- `0` = evidenced absence within assessed scope.
- never default to `5`.
- name/category/fame alone is not enough.
- nearby attractions are not target evidence.
- comparative dimensions require comparative/calibration support.

Every ADD/SUPERSEDE must contain:

- featureCode;
- value;
- sourceRefs;
- sourceTier;
- confidence;
- rationale;
- rubricVersion;
- annotationMethod;
- content hash;
- locator/hash.

## Batch model

Freeze memberships before execution.

Batch size = 200 maximum.

Expected:

- Track A: 6,014 → 31 batches (30 × 200 + 14)
- Track B: 4,083 → 21 batches (20 × 200 + 83)
- total: 52 batches

Do not mix Track A and Track B in one batch.

Normal batch sequence:

`active search → retain source text → semantic annotation → identity decision → 43D/Visit/Access projection → QA → checkpoint → ordinary push → auto-next`

No normal human confirmation.

## Mandatory dual canary

Bulk execution is forbidden until stabilization and both canaries pass.

### Canary A — Identity

Use >=30 Track A candidates stratified across:

- same-name ambiguity;
- historical/renamed;
- address mismatch;
- coordinate mismatch;
- likely official site match;
- official SNS corroboration.

PASS requires:

- search trace for every candidate;
- identity signals stored;
- source refs stored;
- MEDIUM/HIGH threshold enforced;
- ambiguous cases can remain deep research;
- resolved candidates immediately run enrichment;
- deterministic output;
- Registry/Master Code/candidateKey unchanged.

### Canary B — Null-targeted enrichment

Use >=30 Track B candidates selected intentionally for meaningful nulls and likely public official sources across multiple POI types.

PASS requires:

- semantic annotation actually reads target-scoped evidence;
- >=15 candidates gain >=1 `ADD_SUPPORTED`;
- >=25 total new non-null 43D values;
- >=5 distinct feature codes gain new values;
- provenanceWritten >= added/superseded non-null;
- all pre-existing supported values preserved or explicitly superseded;
- deterministic projection PASS.

If Canary B fails, repair search/annotation strategy. Do not lower the thresholds merely to proceed.

## Per-batch requirements

Every candidate must receive:

- complete identity/enrichment disposition;
- current values loaded;
- semantic annotation attempt unless identity-blocked;
- exactly 43 field decisions;
- Visit extraction attempt;
- Access extraction attempt.

Required batch telemetry:

- track / batchId;
- model / reasoning configuration;
- candidateCount;
- queryCount;
- officialSitePages;
- governmentTourismPages;
- officialSNSAccounts/posts;
- authoritativeSecondaryPages;
- retainedTextCount;
- semanticAnnotationAttemptedCount;
- identityResolvedHighCount;
- identityResolvedMediumCount;
- deepResearchRequiredCount;
- identityConflictHoldCount;
- candidatesResolvedThenEnriched;
- existingNonNullLoaded;
- preservedNonNull;
- newNonNull;
- supersededNonNull;
- provenanceWritten;
- featureDecisionCount;
- visitAttempted / added;
- accessAttempted / added;
- remainingNullDecisionCount;
- rejectedEvidenceCount;
- reviewErrorQueueCount;
- input/evidence/output checksums;
- elapsed time.

## Hard batch gates

Batch FAIL if any:

- frozen membership/count mismatch;
- candidate lost;
- unresolved candidate lacks explicit Track A outcome;
- resolved identity lacks qualifying evidence;
- current supported feature disappears silently;
- ADD/SUPERSEDE lacks provenance;
- semantic annotation skipped for an enrichment-ready candidate;
- search snippet used as evidence;
- featureDecisionCount != candidateCount × 43;
- Registry/Master Code/candidateKey changes;
- non-deterministic result;
- output/checkpoint ordering invalid;
- corruption/resume test fails.

## Full-run acceptance

### Track A

Must report exact reconciliation:

```text
6014
= RESOLVED_HIGH
+ RESOLVED_MEDIUM
+ DEEP_RESEARCH_REQUIRED
+ IDENTITY_CONFLICT_HOLD
```

Resolved candidates must show same-pass enrichment.

Unresolved/held candidates must be present in deep-research outputs.

### Track B

All 4,083 must receive null-targeted semantic annotation.

Existing values must reconcile exactly.

New non-null > 0 and provenance > 0 are necessary but not sufficient; final per-feature before/after coverage must be reported.

### Global

Final candidate view must not regress below TASK-072 corrected baseline.

Report:

- scored POIs before/after;
- non-null 43D before/after;
- per-feature before/after;
- coverage bands >=1 / >=10 / >=20 / >=30 / 43/43;
- identity outcomes;
- Visit before/after;
- Access before/after;
- source mix;
- remaining null reason distribution;
- deep research queue;
- exact checksums;
- exact final-head GitHub Quality Gate PASS.

## Result Markdown

The visible Result file exists from publication:

`docs/tasks/RESULT-TASK-073-b-identity-deep-resolution-null-targeted-43d.md`

Update it at least at:

1. stabilization PASS/BLOCKED;
2. dual-canary PASS/BLOCKED;
3. Track A completion;
4. Track B completion;
5. final QA;
6. exact-head GitHub Quality Gate receipt.

No complete Result Markdown = task failure.

## Unattended authorization

After stabilization + dual-canary PASS, user explicitly authorizes TASK-073-B unattended execution.

Allowed:

- create/recreate one TASK-073 heartbeat automation;
- auto-next after normal batch QA PASS;
- ordinary non-force push to TASK-073 execution branch;
- checksum resume;
- delete heartbeat on completion or hard blocker.

Forbidden:

- force push;
- merge;
- push develop/main;
- create unrelated task;
- Master Code allocation;
- Registry rebind;
- production import;
- issue closure.

A non-fast-forward/divergence/auth failure requiring destructive action is a hard blocker.

## Git / stacked PR

While PR #410 remains unmerged:

- task branch: `task/b-task-073-identity-deep-null-targeted-43d`
- execution branch: `codex/b-task-073-identity-deep-null-targeted-43d`
- Draft PR base: `codex/b-task-072-evidence-to-43d-projection`

Do not auto-merge.
