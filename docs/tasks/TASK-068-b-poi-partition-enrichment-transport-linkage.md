# TASK-068-B — Full POI Corpus Registry / 43-Feature / Visit Profile / Transport Linkage

> Issue: #393  
> Owner: **B** — user-authorized full POI data-production owner  
> Stable ID scope: **00000–99999**  
> Processing scope: **occupied POIs only**  
> Batch size: **200 occupied POIs**  
> Mode: **continuous / auto-next / resumable / overnight-capable**  
> Execution branch: `codex/b-poi-partition-enrichment-transport-linkage`  
> Merge policy: **one Draft PR → develop / do not auto-merge**

## 1. Goal

B 负责本工作流里的全部 POI 数据，不再划分 A/B 号段。

```text
Canonical Registry / all assigned lists
↓
audit + merge missing assigned-ID sources
↓
lock occupied stable POI IDs 00000–99999
↓
200 POIs / batch
↓
43-key POIFeatureV1
↓
provenance / confidence
↓
Visit Profile
↓
transport access anchors / gateway hubs
↓
sparse neighbor graph
↓
batch QA + checksum + checkpoint
↓
auto next batch
↓
repeat until all occupied POIs complete
↓
aggregate QA
↓
one Draft PR → develop
↓
STOP
```

TASK-069-A / Issue #394 is superseded. Do not run a separate A pipeline.

## 2. Authoritative specs

Before processing, read execution-time latest `origin/develop`:

```text
docs/architecture/poi-feature-preference-codebook-v0.1.md
docs/architecture/poi-scoring-spec-v0.2.md
docs/architecture/poi-master-schema-v0.2.md
docs/architecture/itinerary-feasibility-spec-v0.1.md
docs/architecture/planning-fact-freshness-policy-v0.1.md
docs/project/WBS-TravelAssist.md
```

Also read TASK-038 / TASK-039 Pilot evidence and QA methods. Reuse semantics, not their pilot benchmark as objective truth.

## 3. Phase 0 — full Registry audit

Audit every repository source that may contain assigned POI IDs:

- canonical Registry on `origin/develop`;
- uploaded/master-registry derived artifacts already committed;
- remote POI branches;
- open/closed PRs;
- prior A/B POI list outputs;
- ID allocation / master code sources.

Report:

```text
canonical registry path/version
total occupied IDs
occupied IDs by range
min/max occupied ID
duplicate stable IDs
duplicate normalized identities
missing identity fields
alias/tombstone/reserved counts
assigned lists missing from canonical develop
```

If an assigned list exists outside canonical develop, integrate the newest valid source into the implementation branch **without renumbering IDs**.

If multiple sources conflict, compare base SHA, version, row count, source freshness, duplicate rate and schema compatibility. Preserve already-frozen stable IDs.

If identity conflicts cannot be resolved safely, checkpoint completed work and stop as `Blocked / Identity Conflict`.

## 4. Processing population

Process only rows that are:

```text
occupied
AND 00000 <= master_code_num <= 99999
AND not tombstoned/reserved/empty
```

Do not manufacture POIs for empty code slots.

Alias/child entities follow canonical entity rules; ambiguous cases go to review queue.

## 5. Continuous batch engine

### Batch size

```text
200 occupied POIs
```

Use stable deterministic ordering, preferably ascending stable ID.

### Auto-next

After every batch:

```text
validate
→ persist outputs
→ write QA
→ calculate checksums
→ persist resume checkpoint
→ commit checkpoint where appropriate
→ immediately start next pending batch
```

Do **not** wait for human confirmation between ordinary batches.

### Resume

Support repository-equivalent controls for:

```text
--resume
--batch
--from-id
--to-id
--dry-run
```

Checksum-identical completed batches are skipped.

### Non-blocking POI failures

These go to review queue and processing continues:

```text
PARTIAL
REVIEW_REQUIRED
SOURCE_UNAVAILABLE
low-confidence attribute
missing Visit Profile evidence
missing transport anchor evidence
```

Hard-stop only for:

- stable-ID corruption/collision;
- canonical schema contradiction;
- unsafe Git/Registry conflict;
- legal/rights/credential blocker preventing lawful work;
- unrecoverable deterministic/checkpoint failure;
- unrecoverable infrastructure failure.

## 6. POI master enrichment

Each occupied POI should retain verified data where available:

```text
master_code
canonical identity
name_ja
name_en
prefecture
municipality
region
entity_type
coordinates
parent/child relation
sourceRefs
sourceTier
lastVerifiedAt
confidence
```

Source priority:

1. operator/government/municipality official source;
2. official tourism/public agency;
3. verified repository evidence;
4. trustworthy secondary source as bounded supplement.

Prefer unknown over fabricated precision.

## 7. Complete POIFeatureV1

Every scorable POI must contain all 43 keys:

```text
01 scenery
02 history
03 architecture
04 photo
05 food
06 shopping
07 nature
08 night
09 onsen
10 art
11 entertainment
12 local
13 unique
14 hidden
15 iconic
16 family
17 senior
18 couple
19 solo
20 relax
21 adventure
22 educational
23 interactive
24 rest
25 walking
26 physical
27 crowd
28 queue
29 wheelchair
30 stroller
31 morning
32 daytime
33 sunrise
34 sunset
35 rain
36 heat
37 cold
38 snow
39 weather_sensitive
40 spring
41 summer
42 autumn
43 winter
```

Values:

```text
0 = known absent / completely unsuitable
1..9 = known strength/burden/suitability
null = unknown
```

Never convert:

```text
null → 0
null → 5
0 → null
```

Kinds:

```text
benefit:     01–15
suitability: 16–24,29–38,40–43
cost:        25–26
risk:        27–28,39
```

## 8. Provenance

Every non-null Feature must be traceable:

```text
featureCode
value
annotationMethod
sourceRefs
confidence
reasonCodes
```

Allowed annotation methods include:

```text
official_fact
derived_verified_fact
editorial_calibration
```

TravelAssist scoring annotations must not be represented as official external ratings.

## 9. Feature rubric

Create/reuse a single versioned rubric across the entire corpus.

At minimum define per feature:

```text
definition
0 / 3 / 5 / 7 / 9 anchors
evidence cues
counterexamples
null conditions
```

Run cross-region consistency checks for subjective/high-risk dimensions such as:

```text
unique
hidden
iconic
walking
physical
crowd
queue
wheelchair
stroller
season
weather
```

If systematic rubric bias is found, fix the rubric, invalidate affected batches and rerun those batches.

## 10. Visit Profile

For POIs with adequate evidence generate at least a standard/full visit profile:

```text
minimumDurationMinutes
recommendedDurationMinutes
maximumUsefulDurationMinutes
fixedWalkingLoad
variableWalkingLoad
fixedPhysicalLoad
variablePhysicalLoad
sourceRefs
confidence
```

Require:

```text
minimum <= recommended <= maximumUseful
```

`walking` / `physical` in the 43-feature master are standard recommended-visit burden summaries.

Actual itinerary load is dynamic:

```text
fixed POI load
+ duration-scaled variable POI load
+ route load
+ accumulated day fatigue
```

A 30-minute and 90-minute visit must not be treated as identical actual fatigue.

## 11. Transport linkage

Do **not** create an all-pairs POI transport matrix.

Use:

```text
POI
→ Access Anchor
→ Regional / Gateway Hub
→ Runtime Route Provider
```

Static anchors may include:

```text
rail/subway station
bus stop/terminal
airport
port/ferry
ropeway
trailhead
parking/road access
tourist gateway
```

Record where justified:

```text
poi_id
anchor_id
anchor_type
access_mode
distance/static estimate
last_mile_walk_level
barrier_free status/notes
bus/car dependency
sourceRefs
confidence
```

Dynamic Route Facts stay outside static master scoring:

```text
current traffic
departure-specific duration
current fare
current transfer count
last train feasibility
service disruption
live route feasibility
```

## 12. Sparse neighbor graph

Allow candidate-generation edges only, such as:

```text
same district
same attraction complex
walkable nearby
same access anchor
top-K nearby candidates
```

Default:

```text
K <= 20 per POI
```

No O(N²) generation path.

## 13. Data/output layout

Audit repository conventions first. Prefer partition/chunk-friendly machine-readable datasets rather than one giant JSON array.

Logical structure may be:

```text
data/poi/full/registry/
data/poi/full/features/
data/poi/full/visit-profiles/
data/poi/full/transport-anchors/
data/poi/full/neighbors/
data/poi/full/manifests/
```

or the repository's existing equivalent.

QA:

```text
docs/qa/TASK-068/
  registry-audit.json
  batch-manifest.json
  feature-coverage.json
  source-coverage.json
  null-coverage.json
  visit-profile-coverage.json
  transport-anchor-coverage.json
  duplicate-audit.json
  review-queue.json
  final-report.md
```

## 14. Per-batch QA

Every 200-POI batch must verify:

```text
IDs within 00000–99999
occupied-only
no duplicate master_code
stable IDs preserved
complete 43-key shape
values in 0..9|null
non-null provenance present
0/null distinction preserved
Visit Profile ordering valid
transport anchor refs valid
no self neighbor edge
no duplicate directional edge
neighbor K limit respected
no live/current route fact stored as static truth
no secrets/API keys
deterministic resume/checksum
```

Sampling per batch:

```text
min(20, 10% of batch), and >=10 when batch size permits
```

## 15. Checkpoint policy

Each batch must persist:

```text
batchId
ordered POI IDs/range
poiCount
schema/rubric/source versions
inputChecksum
outputChecksum
status
known/null coverage
visitProfileCoverage
transportAnchorCoverage
neighborEdgeCount
reviewRequiredCount
errorCount
started/completed metadata
```

Recommended: one checkpoint commit per completed batch or sensible group of batches, without creating a PR per batch.

## 16. External-source safety

Respect source terms, robots/rate limits and rights.

No paid API unless separately authorized. No uncontrolled scraping. No committed credentials.

LLM-assisted annotation is allowed only behind rubric + source evidence + schema validation + QA. It may not invent untraceable facts.

## 17. Tests

At minimum cover:

```text
full 00000–99999 boundary
occupied-only
stable ID preservation
43-key completeness
0/null semantics
feature kinds
provenance
Visit Profile ordering
200-item deterministic batching
auto-next transition
resume/checksum stability
anchor referential integrity
neighbor K limit
no O(N²) path
no live-route contamination
```

Run execution-time applicable repository gates:

```text
npm ci
relevant POI/Planning tests
routing tests
lint
typecheck
build
git diff --check
```

## 18. Git

Before work:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Execution branch:

```text
codex/b-poi-partition-enrichment-transport-linkage
```

## 19. Required Result

Create:

```text
docs/tasks/RESULT-TASK-068-b-poi-partition-enrichment-transport-linkage.md
```

Final report must include:

```text
Status
base SHA
canonical Registry source/version
external assigned lists integrated
total occupied POIs
processed/remaining
batch total/completed/partial
43-key shape complete count
feature known/null coverage
Visit Profile coverage
transport anchor coverage
neighbor edge count
review queue count
source tiers
duplicate/identity audit
stable-ID preservation proof
tests
branch/commits
Draft PR
remaining review work
```

## 20. Completion

Normal batches automatically continue.

When all occupied POIs are processed:

1. aggregate QA;
2. finalize Result;
3. push execution branch;
4. create **one Draft PR → develop**;
5. stop for review.

Do not auto-merge, modify the 43-feature Codebook, tune/freeze recommendation parameters, deploy production DB, or activate paid/live Route Provider calls.
