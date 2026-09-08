# Trip Plan / Planner Contract v1.0

## Review status

Proposed / 待集成审查 — **not yet a frozen dependency**. TASK-WBS-4.17-A / #215; Producer A; Consumers B TASK-017 (#207), future Trip Library 5.18/5.19 and Engine #201. User authorized implementation and merge after the review gate; that authorization is not a completed review of this newly authored contract.

Canonical source: `src/shared/contracts/trips/index.ts`. Its parsers define the wire shape and infer TypeScript types; `validation.ts` is the dependency-free JSON validator. `fixtures.ts` supplies synthetic examples, not real trip/provider facts. No separate schema copy in B, no imports of React, Planner private Store, Mapbox, Provider SDK or DB clients.

This is an additive initial contract. Existing browser persistence and UI are unchanged. WBS 4.15/4.16 remain partial local implementations; 8.5 is not implemented. Passing these parsers proves structure, not authenticated ownership, real booking, schedule feasibility, server persistence or review acceptance.

## 1. Public domains

| Domain                                 | Producer                         | Purpose                                                                   | Excluded                                                          |
| -------------------------------------- | -------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `TripDraftFactsV1`                     | A input semantics; B persistence | Current-trip title, destination/date/party/budget/constraint/anchor facts | Long-term Preference, profile, UI state, actual bookings          |
| `WizardProgressV1`                     | A flow semantics; B persistence  | Which of five views to resume                                             | Percent animation, timer, generated fixture payload               |
| `TripPlanSnapshotV1`                   | A                                | Savable/readable Trip → candidate Plans → dated Days → Items              | SQL table layout, provider raw responses, runtime execution state |
| `PlannerResumeV1`                      | A                                | Trip/Plan identity and observed revisions                                 | Arbitrary URL, owner ID, private Store snapshot                   |
| Snapshot/Override/Effective Preference | B TASK-017, later 5.14           | Immutable per-trip baseline + sparse override                             | Not defined or copied into A contract                             |

The domain name `TripPlanSnapshotV1` means an exported plan-content snapshot, **not** a Trip Preference Snapshot. They cannot share one unversioned JSON payload. Public snapshot exchange does not prescribe storing itinerary content as a single database blob; A 8.5 retains structured SQL ownership.

## 2. Common wire semantics

- Version is exactly `contractVersion: "1.0"`. Unknown versions are rejected; never silently downgrade and save a payload with lost fields. New versions need documented migration and Consumer tests before adoption.
- IDs are nonblank opaque stable strings (maximum 160 characters, no whitespace/control characters). Never parse them for dates or ownership. Allocate durable IDs at the responsible authenticated service; do not promote an array index or Provider ID. IDs within each entity domain are unique across a snapshot, including alternatives and other plans; copied plans need new item/day IDs.
- Every declared key is required; unknown value is represented explicitly by `null`. Empty arrays mean no entries currently supplied. Blank labels, missing keys, extra keys and coercions are rejected. Unknown object fields are not copied back during save. Free-text notes are plain content, never executable markup or authorization.
- Local dates are Gregorian `YYYY-MM-DD`, validated without rollover. Instants are ISO 8601 date/time with seconds and explicit `Z` or offset; optional three-digit milliseconds. A schedule also names IANA start/end zones; offsets must match each zone at that instant (including DST). Future API timezone support is limited by the runtime's IANA database; unknown zones fail validation.
- Amounts are nonnegative safe integer minor units, paired with a three-uppercase-letter currency code. Currency support/exponent lookup is a future service concern; no exchange rates or arbitrary coercion from formatted price labels. `0` is an explicit zero amount, `null` is unknown.
- Coordinates are an object `{longitude, latitude}`, not an ambiguous array. Finite WGS84 bounds are checked. Missing geocoding remains `null`; never use map/city centroid as a fabricated venue position.
- Contract lists/text have safety caps for parsing, not new pricing or membership limits. Endpoints must additionally enforce body-size/rate/auth limits; this task creates no endpoint.
- Codes for plan/item status, kind, assessment and lock are lower_snake_case strings. Read-side `knownCode` gives `unknown` for future values. Unknown never means normal/unlocked/confirmed or authorizes a write. Closed input enums and versions reject unsupported values.
- Parsers return a detached value or `{ok:false, issue:{path,code}}`; errors do not echo raw input, tokens or notes. Structural validity is not authorization or evidence verification.

## 3. Draft input / Step mapping

`TripDraftFactsV1` has no durable draft ID, owner or revision: it is a typed **facts input**, not a server row or service request. B's versioned persistence envelope in TASK-017 owns authenticated owner, durable draft ID, autosave idempotency, revision, timestamps and Preference snapshot/override association. Updates must validate merged facts before commit; omitted sparse-patch fields differ from explicit `null`/`false`/`0`. Do not use whole-UI-state replacement.

| Current Step field                                | Contract / handoff                              | Rule                                                                                                                                       |
| ------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Step 1 familiarity                                | B Preference mapping review                     | A does not invent a new Preference master ID; do not put familiarity in dates/party                                                        |
| Step 2 likes/dislikes/interestDetails/travelStyle | B Snapshot + Overrides                          | Current-trip edits never implicitly update long-term defaults                                                                              |
| Step 3 destinations/selectedPrefectures           | `destinations` references/names                 | Canonical resolver ID when known; unresolved user label with null ID otherwise. No guessed coordinate/provider ID                          |
| dateMode / exact dates / durationDays             | `dates.mode`, departure/returning, durationDays | Partial exact input may contain nulls; inclusive duration checked when both dates supplied                                                 |
| plannedDeparture / plannedReturn                  | `plannedDeparture` / `plannedReturn`            | Structured year + month/part or season; no localized display label enum and no invented exact date                                         |
| adult/child/infant/senior counts                  | `participants`                                  | Trip-only counts, not Companion Master writes; zero allowed while drafting                                                                 |
| actual budget amounts                             | `budget`                                        | Total/per-person/lodging-per-night/dining-per-day minor units; no long-term writeback                                                      |
| transport soft inclinations / budget level        | B Preference Snapshot/Overrides                 | Rail/walking preference is distinct from a hard mobility constraint                                                                        |
| traveler needs / trip hard limits                 | `constraints`                                   | Explicit trip-only kind and note; structured domain-specific subfields may need a reviewed future extension, not a shadow Companion Schema |
| flight/hotel/activity anchors                     | `fixedArrangements`                             | Known date/time/location or null; manual entry is not confirmed ticket/booking evidence                                                    |
| UI indices 0/1/2                                  | `familiarity` / `preferences` / `trip_basics`   | Resume phase codes, not public numeric UI indices                                                                                          |
| UI index 3 generating/results                     | `generating` / `plan_selection`                 | Still top progress 4/4; results is not a fifth top progress item                                                                           |
| generationStatus.activeStage/runId/generatedPlans | Not persisted through facts/progress            | Timer/fixtures are not durable server job records; future generation service owns resume/retry                                             |

### Approximate dates

Current UI has `2026年9月上旬`, `中旬`, `下旬`, `整月`, `2027年春季`, `夏季`. Adapter mappings are explicit: early/middle/late/whole with a known month, or spring/summer/autumn/winter with month=null. Seasons do **not** imply hemispheric/date boundaries here. The pure opt-in producer adapter `src/features/start-flow/model/trip-contract-adapter.ts` implements these mappings and rejects unsupported labels without rewriting the source. Only the active date mode is exported; inactive UI selections must not leak as contradictory facts. The adapter is tested against the real `createTripWizardDraft` but not wired to the active UI or a server endpoint.

The producer adapter requires callers to supply durable anchor-ID mappings and resolved destination IDs (null if unresolved); it does not allocate IDs or geocode. It also requires explicit currency and minor-unit exponent because the existing budget fields do not record a currency. Decimal conversion is exact and rejects excess precision/formatted text instead of guessing or rounding. Legacy migration must obtain that currency information before saving; no silent JPY/USD assumption. Participant needs and manual anchor source/address survive the projection. Step 1/2 soft preferences and soft transport/budget options remain B-owned; `constraints` starts empty because there is no separately rendered generic hard-constraint input in the active Step UI. A future explicit constraint editor can populate the typed contract, not scrape legacy inactive components.

`fixedArrangements` preserves input method (manual/lookup/poi/paste/AI as applicable), airport labels, dates/times, hotel name/city/address/location and activity name/fixed/cancellation flags. Input method is not proof of a provider query or reservation. `participantNeeds` preserves trip-local age input text, seat/stroller/crib, walking/stair/rest requirements without treating free-text ages as verified numbers or creating a Companion Master. Legacy migration must validate, not guess missing IDs, zones or coordinates; no automatic migration runs in this task.

## 4. Public plan snapshot

Root: version, provenance (`user`, `ai`, `import`, `fixture`), trip, updatedAt and plans. `fixture` remains explicitly synthetic; changing provenance is not a validator-backed proof of authenticity. Trusted services must enforce provenance and booking evidence access. No raw confirmation codes, user accounts or Provider payloads cross this contract.

Trip: opaque id, title, status, defaultTimezone, activePlanId (null or a plan present in this snapshot), revision ≥1. Candidate plans remain independent; activePlanId is the sole selector. Empty plans/null activePlanId is valid for a draft. Revision is an optimistic concurrency observation, not permission; restoring history creates a new revision rather than decrementing it.

Plan: id, title, revision and ordered days. Day numbers are contiguous 1..N; each day has stable id, actual localDate, timezone, items and alternatives. Item/day IDs must not duplicate across plans. Dates may repeat or decrease across international date-line travel; array/dayNumber gives planning order. A consumer must not renumber IDs or derive ID from date. Schedule feasibility checks belong to Engine, not serialization.

Item: stable id, kind, title, optional place/schedule, lockLevel, assessment and separate booking summary. The published `ITEM_KINDS` match the architecture's place/activity/transport/meal/hotel/check-in/out/flight/train/car-rental/ferry/free-time/custom concepts. Array order is deliberate order, not inferred from UI x-position. Alternative items never inflate the scheduled item count. Promoting an alternative preserves identity; copied plans receive new identity. A null schedule is not a fake 00:00 booking. Scheduled starts belong to the day's date/timezone; end may cross date/timezone. No duration feasibility judgement is implied by a valid positive interval.

Booking: status, opaque normalized referenceId, verifiedAt. `confirmed` structurally requires both reference and verification time, but only a future trusted booking service can prove those values; fixture examples cannot establish real reservations. Locks are none/soft/user/booking/payment/system-hard, unknown fails safe in Consumers. Assessment unknown/ok/info/warning/critical is independent: a confirmed ticket can still have a critical timing conflict. No payment/cancellation operation is exposed.

## 5. Consumer summary / resume

`summarizeTrip(unknown)` first validates the snapshot, then projects title, status with fallback, active day/item counts, attention/unconfirmed counts and a minimal resume descriptor. It is an executable Consumer example, not B's private TripCardViewModel or a deployed UI integration. Alternatives are excluded; unknown assessments/bookings count as attention, never as all-clear.

`PlannerResumeV1`: version, tripId, planId, tripRevision, planRevision. No redirect URL or serialized Planner Store. Future A resume service must authenticate, reload these IDs, confirm plan belongs to trip, and compare current revisions. A mismatch produces explicit reload/conflict; never overwrite newer state. No service is deployed here, no current `/planner` query interpretation is changed.

The existing browser `trip-model.ts` and Trip Library fixtures remain private. A future 4.19 adapter must allocate/resolve durable identities and normalize only known facts; never copy local Mock booking badges as verified booking evidence. Existing saved browser drafts remain untouched. B 5.19 API remains separate from this A-owned payload contract.

## 6. Compatibility / review matrix

| Evidence                                                   | Test/example                       | Gate                                     |
| ---------------------------------------------------------- | ---------------------------------- | ---------------------------------------- |
| Minimum null/empty facts and plan                          | minimal fixture factories          | Structural pass required                 |
| Full Step facts / three-day multi-plan                     | full fixture factories             | Structural pass required                 |
| Malformed date, reversed range, wrong offset, DST gap/fold | contract negative tests            | Reject invalid values without coercion   |
| Duplicate IDs, dangling activePlanId, unknown version      | negative tests                     | Fail closed                              |
| Future status/kind/lock                                    | unknown fallback tests             | Remain readable, not permission to act   |
| Consumer summary and revisioned resume                     | JSON round-trip test               | Canonical imports, not a duplicate model |
| Producer-to-real Consumer runtime                          | Deferred to 4.19 / 5.19            | Not claimed as deployed                  |
| TASK-017 Consumer completeness                             | B or designated integration review | **Required before freeze**               |

Breaking changes include rename/removal, optional-to-required, date/ID/unit/null changes. Publish a new version and fixtures; migrate Consumers explicitly before retiring old reader support. Initial release has no old public contract to delete; legacy private stores remain untouched. Do not silently rewrite old saved drafts on page load.

## 7. Review questions / remaining gate

The proposed subset is ready to inspect, not automatically sufficient just because files now exist. B or the designated reviewer must confirm: (1) the documented Step mapping, typed participant needs and anchor input-method/address semantics are usable by its adapter, (2) Preference versus factual constraints is acceptable without a second schema, (3) public snapshot/resume semantics align with future 5.18/5.19, (4) partial 4.15/4.16 runtime is explicitly separated from this first public contract. Record requested additions before approving; never convert open questions into a false frozen gate.

After changes/review/tests, merge the contract PR and record reviewer/commit/fixture evidence in WBS4.17 and Result. Only then rerun #207 on latest develop. SQL tables (8.5), B Engine 4.20+, Auth, Provider and AI remain outside this task.
