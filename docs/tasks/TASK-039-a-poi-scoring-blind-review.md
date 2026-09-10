# TASK-039-A — 100 POI Scoring Independent Blind Human Review

> Issue: #301  
> WBS: **7.9 — POI Recommendation Scoring / Calibration**  
> Owner: **A — Main Travel System / Planning Engine QA**  
> Priority: **P0 Validation**  
> Publication base: `fede48bb2a4916bcc6070be325ec5b450fa6fbd1`  
> Upstream Pilot: **TASK-038-A / Issue #299 / Draft PR #300**  
> Status at publication: **Ready for blind-review preparation; human judgments required for final completion**

---

## 1. Goal

TASK-038 proved that the current scoring formula is internally consistent with the Pilot's machine-authored editorial benchmark, but that benchmark and the POI Feature annotations share the same archetype system. TASK-039 must therefore test **external validity** with an independent human blind-review layer.

The core principle is:

```text
TASK-038 machine labels / candidate-0457
            ↓ hidden from reviewer
Neutral POI identity + plain-language scenario
            ↓
Independent Human Reviewer R1 / R2
            ↓
Frozen human judgments
            ↓
Agreement / adjudication
            ↓
Human Gold checksum frozen
            ↓ only now
One-time candidate-0457 evaluation
            ↓
Supported / Not Supported / Insufficient Evidence
```

**Codex must never act as the human reviewer.**

---

## 2. Dependency / branch rule

At Task publication:

- TASK-036 and TASK-037 are already merged to `develop`.
- TASK-038 Draft PR #300 is Open / Draft / mergeable and contains the 100-POI sample, 12 scenarios, machine benchmark and `candidate-0457`.

Execution rule:

### If PR #300 is still unmerged

1. Create implementation branch `codex/a-poi-scoring-blind-review` from latest `origin/codex/a-100-poi-scoring-pilot`.
2. Merge latest `origin/develop` normally into the implementation branch.
3. Preserve TASK-038 files unchanged except where TASK-039 needs new adjacent tooling/evidence.
4. TASK-039 Draft PR must target `codex/a-100-poi-scoring-pilot`.
5. Do not retarget, merge, close, force-push or rewrite PR #300.

### If PR #300 is merged before execution

Create TASK-039 from latest `origin/develop` and target `develop`.

Never force-push.

---

## 3. What this Task must and must not prove

### TASK-039 may prove

- two or more real human reviewers independently prefer the same POIs for the same traveler scenarios;
- `candidate-0457` agrees with a human-frozen benchmark at an acceptable level;
- machine-authored TASK-038 benchmark bias can be measured;
- tie / near-tie behavior is understood;
- reviewer consistency and inter-rater agreement are measurable.

### TASK-039 does not prove

- final production scoring parameters are frozen;
- 100 POIs represent all Japan POIs;
- current POIFeature annotations are production-quality Master data;
- Visit Profile numeric facts are complete;
- live weather/route/booking/runtime feasibility is validated;
- one or two reviewers represent all market users.

---

## 4. Non-negotiable human boundary

Codex / AI / scripts may:

- select and randomize review items;
- build reviewer-facing packs;
- build neutral identity cards;
- perform leakage audits;
- validate submitted response files;
- normalize A/B orientation;
- compute agreement and statistics;
- generate adjudication packs;
- compute candidate agreement **after** human gold is frozen.

Codex / AI / scripts must **not**:

- choose `A`, `B`, `TIE`, or `INSUFFICIENT_INFO` on behalf of a reviewer;
- infer missing human labels;
- auto-adjudicate disagreements;
- use TASK-038 machine benchmark as human ground truth;
- call an LLM to generate substitute reviewer answers;
- modify reviewer answers to improve candidate metrics;
- retune candidate parameters after seeing human results.

If real human labels are not available, the correct final state is:

```text
Prepared / Awaiting Human Review
```

This is not a failure.

---

## 5. Reviewer blindness contract

Reviewer-facing files must not contain or reveal, directly or indirectly:

```text
candidate-0457
candidate parameter values
gamma / benefit / suitability / cost / risk weights
coverage exponent
confidence adjustment
engine score
candidate rank
score gap
machine expected answer
TASK-038 machine reasonCodes
archetypeTags used to build POIFeature values
POIFeature numeric values
calibration / holdout partition
TASK-038 failure-case label
```

Reviewer-facing information may include only what is needed to make a human travel-preference judgment:

```text
blindItemId
scenario title
plain-language traveler intent
POI A neutral identity card
POI B neutral identity card
region / prefecture
broad factual category/type
identity/evidence URL(s)
answer options
confidence options
optional reviewer note
```

Do not show machine-authored feature claims such as `iconic=9`, `hidden=9`, `walking=8`, etc.

A reviewer may consult the provided neutral source links if necessary, but must not be directed to repository files containing scores/features/benchmark answers.

---

## 6. Review item design

Generate exactly **144 reviewer items** before human review.

### 6.1 Primary validation — 96 items

12 scenarios × 8 pairwise items each.

Selection must be deterministic and must **not** use:

- candidate-0457 score;
- TASK-038 expected result;
- machine benchmark confidence;
- score gap.

Use only stable POI identity, geography and neutral category/type information plus deterministic seeded sampling.

Primary pairs are the only group used for the main candidate pass/fail agreement gate.

### 6.2 Near-score stress — 24 items

12 scenarios × 2 pairs each.

These may use `candidate-0457` score gap solely to intentionally select difficult close-score pairs.

Rules:

- reviewer never sees the score or gap;
- these rows are marked internally as `near_score_diagnostic`;
- they are excluded from the main pass/fail agreement percentage;
- report tie recall, disagreement pattern and score-gap bands separately.

### 6.3 Machine-benchmark audit — 12 items

Select 12 TASK-038 machine benchmark pairs across multiple scenarios and confidence bands.

The machine expected answer must remain hidden until human labels are frozen.

These are secondary diagnostics used to estimate machine-benchmark bias.

### 6.4 Hidden repeat consistency — 12 items

Select 12 items from the other sets and repeat them later with:

- a different blind item ID;
- randomized order;
- A/B orientation swapped where deterministic seed says so.

Reviewers must not be told which rows are repeats.

Repeat items are excluded from candidate primary accuracy but used for intra-rater consistency.

### 6.5 Reuse / dominance controls

- avoid excessive reuse of the same POI;
- avoid a single prefecture dominating the primary set;
- preserve all 12 scenario coverage;
- do not generate duplicate canonical pairs except the explicit hidden repeats;
- do not create logically identical pairs with only A/B reversal unless designated repeat.

---

## 7. Reviewer packs

Prepare at least two reviewer packs:

```text
docs/qa/TASK-039/reviewer-pack-r1.json
docs/qa/TASK-039/reviewer-pack-r2.json
```

Each pack must contain the same canonical review task set but use independent deterministic:

- row order;
- A/B orientation;
- blind item identifiers where appropriate.

Also create human-readable guidance:

```text
docs/qa/TASK-039/reviewer-guidance.md
```

Reviewer response options:

```text
choice:
A
B
TIE
INSUFFICIENT_INFO

confidence:
high
medium
low
```

Reviewer may optionally include a short note or choose neutral reviewer reason tags, but reason text is not required for every row.

Do not collect reviewer names, email addresses or other unnecessary personal information. Use reviewer codes such as `R1`, `R2`, `R3`.

---

## 8. Internal mapping / leakage audit

Create an internal canonical mapping separated from reviewer packs, for example:

```text
docs/qa/TASK-039/internal-review-map.json
```

It may contain canonical POI IDs, original orientation, review group and hidden machine/candidate references required for later analysis.

It must be clearly marked:

```text
INTERNAL — DO NOT PROVIDE TO REVIEWERS BEFORE RESPONSE FREEZE
```

Because the repository is not a cryptographic secret store, this Task relies on **procedural blinding**: reviewers receive only reviewer pack + guidance and are instructed not to inspect internal files or TASK-038 output before submitting.

Create:

```text
docs/qa/TASK-039/leakage-audit.json
```

The audit must prove reviewer-facing packs contain none of the forbidden keys/values listed in §5.

---

## 9. Human response files

Create empty/template response files only, e.g.:

```text
docs/qa/TASK-039/reviewer-response-template.json
```

Do **not** commit fabricated completed reviewer responses.

Expected human response shape:

```json
{
  "reviewVersion": "task-039-v1",
  "reviewerCode": "R1",
  "submittedAt": "...",
  "responses": [
    {
      "blindItemId": "...",
      "choice": "A",
      "confidence": "high",
      "note": null
    }
  ]
}
```

Once a real reviewer finishes, their response file may be added unchanged except for format normalization that does not alter choices/confidence.

Response checksum must be recorded before analysis.

---

## 10. Minimum reviewer requirement

A complete blind review requires **at least 2 independent human reviewers**.

Rules:

```text
0 reviewers
→ Prepared / Awaiting Human Review

1 complete reviewer
→ Partial / Awaiting second independent reviewer

2+ reviewers but unresolved primary disagreements
→ Partial / Awaiting adjudication

2+ reviewers + consensus/adjudication complete
→ Human Gold may be frozen
```

Reviewers must not see each other's answers before both are frozen.

---

## 11. Agreement analysis

Build deterministic tooling to normalize each reviewer pack back to canonical pair orientation.

Measure at least:

### Intra-rater consistency

For 12 hidden repeated rows:

```text
same canonical choice after A/B normalization
```

Report per reviewer and aggregate.

### Inter-rater agreement

For non-repeat review rows:

- raw exact agreement;
- agreement excluding `INSUFFICIENT_INFO`;
- Cohen's kappa for R1/R2 where computable;
- per-scenario agreement;
- `A/B` vs `TIE` disagreement counts;
- insufficient-information rate.

Suggested review-quality gates:

```text
repeat consistency >= 85%
raw inter-rater agreement >= 70%
Cohen's kappa >= 0.55 where computable
```

These are validation gates, not production constants.

If review-quality gates fail, do not evaluate candidate as if the human labels were reliable. Report:

```text
insufficient_human_agreement
```

---

## 12. Adjudication

For unresolved **primary** disagreements, generate:

```text
docs/qa/TASK-039/adjudication-pack.json
```

The adjudicator must remain blind to:

- R1/R2 identities and answers;
- candidate score/result;
- machine benchmark answer;
- POIFeature values/archetype tags.

Codex cannot adjudicate.

A third independent reviewer is preferred. If no adjudicator is available, retain unresolved rows as `UNRESOLVED` rather than inventing a gold label.

---

## 13. Human Gold freeze

Only after reviewer agreement/adjudication is finished, build:

```text
docs/qa/TASK-039/human-gold-v1.json
```

Rules:

- include only resolvable canonical review items;
- retain confidence derivation and reviewer provenance codes;
- mark unresolved / insufficient rows explicitly rather than forcing A/B/TIE;
- calculate SHA-256 checksum;
- write the checksum into analysis metadata **before** candidate evaluation.

Once checksum is frozen, do not rewrite the human gold merely because candidate results are poor.

---

## 14. One-time candidate-0457 evaluation

After Human Gold freeze, evaluate TASK-038 `candidate-0457` exactly once.

Primary metrics use only the 96 primary validation rows with usable human gold.

Report:

- primary high-confidence agreement;
- primary high+medium agreement;
- overall primary agreement;
- per-scenario agreement;
- A/B directional accuracy;
- human TIE precision/recall where meaningful;
- `INSUFFICIENT_INFO` coverage;
- near-score diagnostic results separately;
- machine-audit results separately.

Suggested candidate validation gates:

```text
primary high-confidence agreement >= 80%
primary high+medium agreement >= 75%
semantic directionality invariants = 100%
```

Also require enough usable gold coverage to make the metric meaningful. If fewer than 60 of the 96 primary rows are resolved to usable human gold, return `insufficient_human_coverage` regardless of percentage.

### Critical rule

After candidate evaluation:

```text
NO PARAMETER RETUNING IN TASK-039
```

If it fails, failure is a valid result. A future separately authorized Task may decide whether to revise labels, collect more evidence or calibrate a new candidate.

---

## 15. Machine benchmark bias analysis

After human labels are frozen, compare human gold against TASK-038 machine-authored benchmark.

Measure at least:

- agreement by machine confidence band;
- A/B vs TIE disagreement;
- scenario bias;
- whether machine benchmark systematically favors iconic/hidden/high-feature archetypes;
- whether machine benchmark is more decisive than humans;
- overlap between candidate failures and machine-vs-human disagreement.

This analysis exists specifically to answer:

> Did TASK-038's ~99–100% agreement primarily measure self-consistency with its own machine-authored benchmark?

Do not rewrite TASK-038 historical evidence; produce a new independent comparison.

---

## 16. Required tooling and files

Suggested implementation additions:

```text
tools/qa/poi-scoring-blind-review.mjs
tests/task-039-poi-scoring-blind-review.test.mjs

docs/qa/TASK-039/blind-review-protocol.md
docs/qa/TASK-039/reviewer-guidance.md
docs/qa/TASK-039/reviewer-pack-r1.json
docs/qa/TASK-039/reviewer-pack-r2.json
docs/qa/TASK-039/reviewer-response-template.json
docs/qa/TASK-039/internal-review-map.json
docs/qa/TASK-039/leakage-audit.json
```

After real human responses are supplied, additionally generate as applicable:

```text
docs/qa/TASK-039/reviewer-r1-response.json
docs/qa/TASK-039/reviewer-r2-response.json
docs/qa/TASK-039/agreement-report.json
docs/qa/TASK-039/adjudication-pack.json
docs/qa/TASK-039/human-gold-v1.json
docs/qa/TASK-039/candidate-0457-human-evaluation.json
docs/qa/TASK-039/machine-vs-human-benchmark.json
docs/qa/TASK-039/blind-review-report.md
```

Do not create fake reviewer response files merely to satisfy a filename checklist.

---

## 17. Tests

Focused tests must verify at least:

- exactly 144 reviewer items;
- 96 primary / 24 near-score / 12 machine-audit / 12 repeat composition;
- all 12 scenarios represented in primary;
- repeat rows map back to the same canonical pair;
- no accidental canonical duplicates outside repeat set;
- deterministic pack generation;
- R1/R2 order/orientation differ but canonical task set matches;
- reviewer pack contains no forbidden scoring/feature/benchmark fields;
- response validator rejects missing/duplicate/unknown blind IDs;
- A/B orientation normalization works;
- agreement math is deterministic;
- Human Gold cannot be generated before required reviewer/adjudication conditions;
- candidate evaluation refuses to run before human-gold checksum exists;
- candidate evaluation does not mutate TASK-038 config.

Also rerun relevant upstream suites:

```text
npm ci
npm run test:planning-contracts
npm run test:planning-soak
npm run test:routing
npm run lint
npm run typecheck
npm run build
```

Run current Trip / Route / Engine contract suites and full Node regression discovered at execution time.

TASK-owned files must pass Prettier and `git diff --check`.

---

## 18. No-network / safety boundary

TASK-039 preparation must not require:

- OpenAI / LLM API;
- paid Provider APIs;
- live route/weather/booking/inventory calls;
- production DB;
- production deployment.

Neutral identity links may point to evidence already recorded by TASK-038. The implementation must not silently scrape third-party sites to create reviewer opinions.

Do not modify:

- canonical Trip Contract;
- canonical Route Contract;
- Trip Mutation Engine semantics;
- Planner UI;
- production POI Master;
- TASK-038 candidate parameters.

---

## 19. Acceptance states

### A. Preparation-only acceptance

TASK-039 implementation can be accepted as:

```text
Prepared / Awaiting Human Review
```

when:

- blind packs are generated;
- leakage audit passes;
- response/analyzer tooling is tested;
- no reviewer answers were fabricated;
- Draft PR exists;
- WBS 7.9 remains pending human validation.

### B. Final human-review acceptance

Only after real reviewer responses:

```text
Completed / candidate supported for next-stage review
```

or

```text
Completed / candidate not supported
```

or

```text
Partial / insufficient human agreement or coverage
```

No outcome automatically freezes production parameters.

---

## 20. WBS tracking

Do not create a second scoring WBS. Continue under 7.9.

Tracking language:

```text
TASK-038-A
→ 100 POI internal calibration candidate

TASK-039-A
→ independent blind human validation

WBS 7.9
→ not production-complete until human review is accepted and a later explicit production-freeze decision is made
```

Implementation start → `进行中`.

Blind pack/tooling complete but human review absent → `待人工盲审`.

Human evidence complete but PR unmerged → `待审查`.

Do not mark production scoring Frozen/Complete from this Task alone.

---

## 21. Required Result

Create:

```text
docs/tasks/RESULT-TASK-039-a-poi-scoring-blind-review.md
```

At preparation stage include:

```text
Status
Base / TASK-038 dependency
Issue
Branch / commits
Draft PR
144-item composition
scenario coverage
reviewer pack checksums
leakage audit
response template/tooling
focused tests
upstream regression
human judgments fabricated = No
current completion state = Prepared / Awaiting Human Review
WBS status
next human action
```

After human review, update the same Result with:

```text
reviewer count
response checksums
repeat consistency
inter-rater agreement
kappa
adjudication status
human-gold checksum
usable primary count
candidate one-time evaluation
machine-vs-human benchmark comparison
final validation outcome
```

---

## 22. Completion boundary

After generating blind-review infrastructure and Draft PR, **stop** if real human responses have not been supplied.

Do not:

- impersonate reviewers;
- use another AI as reviewer;
- start parameter retuning;
- freeze candidate-0457;
- start larger POI/Region/AI/production shadow Pilots automatically.
