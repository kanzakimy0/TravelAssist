# AMENDMENT — TASK-072-B Identity Resolution / Second-Pass Policy v1

## User intent

The 6,049 `TARGET_IDENTITY_UNRESOLVED` records are a broad frozen backlog. They are not 6,049 confirmed duplicate-name conflicts.

TASK-072-B must actively search and make a candidate-level identity judgement, then project the judgement into the candidate enrichment state when the evidence is reasonably sufficient.

Only candidates that still cannot be safely assigned after active search should remain for a dedicated second pass.

This amendment supersedes any overly conservative interpretation that requires a perfect retained official full-text page before a candidate-level enrichment identity may be resolved.

It does **not** authorize formal Master Code allocation, Registry rebind, old-code reassignment, or silent candidate merging.

## Identity resolution objective

For each `TARGET_IDENTITY_UNRESOLVED` candidate:

```text
search
→ collect candidate identity signals
→ compare signals
→ judge target identity
→ resolve for enrichment when sufficiently supported
→ immediately run 43D / Visit / Access extraction
→ otherwise write SECOND_PASS_REQUIRED
```

Do not leave a candidate unresolved merely because one preferred official page is unavailable, unreadable, JavaScript-only, archived, or blocked, when the target identity can be reasonably established from the total evidence.

## Resolution levels

Every unresolved candidate must receive exactly one identity disposition:

### RESOLVED_HIGH

Use when identity is strongly supported.

Examples of sufficient patterns include:

- official/owner/government/tourism source matches target name **and** matching municipality/address/location;
- official source matches canonical/alias name plus matching operator/organization and geographic scope;
- multiple authoritative sources independently converge on the same target;
- source identity, address/locality and coordinates/map context are mutually consistent.

A RESOLVED_HIGH candidate may immediately receive evidence-backed 43D / Visit / Access enrichment.

### RESOLVED_MEDIUM

Use for candidate-level enrichment only when there is no material contradiction and the identity is reasonably more likely than alternatives.

Minimum rule:

- at least two independent identity signals must agree; and
- at least one signal must be geographic, organizational, address/coordinate, or otherwise discriminative beyond the bare name; and
- no credible competing target fits the same evidence.

Examples:

- exact Japanese name + correct prefecture/municipality + matching category/operator;
- alias name + matching address/locality from two independent sources;
- search result/secondary discovery identifies a likely target and another authoritative or target-owned source corroborates location/ownership.

RESOLVED_MEDIUM is **not** a formal Registry identity. It is only a candidate-level `resolved-for-enrichment` disposition.

All enrichment produced under RESOLVED_MEDIUM must preserve the identity confidence and source evidence so it can later be upgraded/reviewed.

### SECOND_PASS_REQUIRED

Use only after reasonable identity search was actually performed and the candidate still cannot be assigned safely.

Examples:

- multiple same-name targets remain plausible;
- location/address evidence is too weak or contradictory;
- only generic directory/search-snippet evidence exists;
- likely target is found but no discriminative signal ties it to this candidate;
- candidate may be historical/relocated/renamed but current mapping cannot be established.

### IDENTITY_CONFLICT_HOLD

Use where evidence materially conflicts and assigning one target would risk contaminating the candidate.

This stays separate from ordinary unresolved identity.

## Evidence weighting

Identity judgement may use the total evidence, not only perfect official retained text.

Preferred evidence order:

1. target-owned official website;
2. government / prefecture / municipality / cultural-property / official tourism;
3. official owner/operator;
4. official SNS with ownership established;
5. reliable maps/directories/reference sources;
6. reputable secondary sources.

Search snippets may be used as **discovery signals**, but not as the sole basis of RESOLVED_HIGH.

A candidate may be RESOLVED_MEDIUM using mixed evidence only when the minimum multi-signal rule is satisfied.

## Required identity signals

For each candidate record the signals actually considered:

- names / aliases / romanization;
- prefecture;
- municipality;
- locality/address;
- coordinates/map context where available;
- category/type;
- owner/operator/organization;
- official domain;
- official SNS ownership;
- historical/renamed/relocated relationship;
- competing targets considered;
- contradictions found.

## Candidate-level projection

When identity is RESOLVED_HIGH or RESOLVED_MEDIUM:

- update candidate-level disposition to `RESOLVED_FOR_ENRICHMENT`;
- keep `candidateKey` unchanged;
- do not allocate formal Master Code;
- do not rebind Registry;
- do not delete competing historical observations;
- record identity confidence;
- record source refs and rationale;
- immediately continue 43D / Visit / Access extraction for that same candidate.

## Second-pass output

Candidates that remain unresolved must be written to a dedicated visible second-pass list, for example:

`docs/qa/TASK-072-B/identity-second-pass.md`

and a machine-readable equivalent under:

`docs/qa/TASK-072-B/identity-second-pass.jsonl`

Every second-pass record must contain:

- candidateKey;
- names / aliases;
- prefecture / municipality if known;
- current address/coordinate evidence;
- queries attempted;
- sources opened;
- best matching candidate target(s);
- competing target(s);
- reason automatic judgement was not safe;
- missing discriminative signal;
- recommended next source/action;
- current identity confidence;
- existing 43D values preserved;
- whether enrichment is blocked.

The second-pass list is for targeted follow-up. It must not contain candidates already reasonably resolved for enrichment.

## Unattended behavior

Phase A must not stop for normal ambiguous candidates.

For each candidate:

- resolve HIGH/MEDIUM and continue, or
- write SECOND_PASS_REQUIRED and continue.

Only systemic corruption, Registry/candidate checksum damage, schema/rubric contradiction, or infrastructure failure may stop unattended execution.

## Batch telemetry additions

Each batch must additionally report:

- identityResolvedHighCount;
- identityResolvedMediumCount;
- secondPassRequiredCount;
- identityConflictHoldCount;
- identitySignalsEvaluatedCount;
- competingTargetsDetectedCount;
- candidatesResolvedThenEnrichedCount.

## Final acceptance additions

The final Result Markdown must report:

- TARGET_IDENTITY_UNRESOLVED before = 6,049;
- RESOLVED_HIGH;
- RESOLVED_MEDIUM;
- SECOND_PASS_REQUIRED;
- IDENTITY_CONFLICT_HOLD;
- candidates resolved then enriched;
- second-pass list path and count;
- reconciliation proving the 6,049 population is fully dispositioned.

The expected equation is:

```text
6049
= RESOLVED_HIGH
+ RESOLVED_MEDIUM
+ SECOND_PASS_REQUIRED
+ IDENTITY_CONFLICT_HOLD
```

No candidate may silently remain in the old broad `TARGET_IDENTITY_UNRESOLVED` bucket after TASK-072 Phase A completes.
