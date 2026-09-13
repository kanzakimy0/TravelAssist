# TASK-058-B — WBS 7.2 Places / POI Provider Selection

## Status

Authorized / Ready for Codex execution.

## Tracking

- WBS: `7.2 Places / POI Provider 选型`
- Canonical Owner: **B**（explicit user reassignment; see `docs/project/WBS-7.2-owner-correction.md`）
- Priority: P0
- Dependency: `1.10` = 已完成
- Issue: `#361`
- Publication baseline: `develop@c8290b199fad0828245b355f231743b67d2eaad2`
- Spec branch: `task/b-wbs-7-2-poi-provider-selection`
- Planned implementation branch: `codex/b-wbs-7-2-poi-provider-selection`

## 1. Objective

Select a current, evidence-backed Places / POI provider strategy for TravelAssist, optimized for Japan-first Web MVP and compatible with future mobile clients.

This Task is a **provider research / architecture decision task**. It must not implement Places APIs, POI schema, adapters, scoring, Planner UI or persistence.

The final result must be one of:

- `RECOMMEND` — one primary provider and an explicit fallback strategy satisfy all hard gates;
- `CONDITIONAL` — a technically preferred provider exists but one or more commercial / rights gates require explicit owner confirmation;
- `BLOCKED` — no provider can currently be selected without unresolved material risk.

Do not force a provider selection when official evidence is incomplete.

## 2. Repository context to read first

Before external research, read the execution-time latest repository sources including:

- `docs/project/WBS-TravelAssist.md`;
- `docs/project/WBS-7.2-owner-correction.md`;
- WBS 1.10 display/tag rules and its final frozen design records;
- WBS 1.12 Map / Pin / Region / Route visual specification;
- current Mapbox integration / 7.1 / 7.12 records;
- current Planner / Detail POI usage and image/attribution boundaries;
- Planning public contracts / POI design documents if present;
- Route provider selection documentation for precedent on provider-independent boundaries and commercial gates;
- asset/image rights rules that may affect provider photos.

The purpose is to understand TravelAssist needs before comparing vendors.

## 3. Provider candidate discovery

Use **current official sources at execution time**. Do not assume the candidate list is exhaustive, but at minimum assess viable current offerings in these families when available:

- Google Maps Platform Places;
- Mapbox Search / Geocoding / Search Box / relevant Places offering;
- Foursquare Places;
- HERE Geocoding & Search / Places capabilities;
- TomTom Search;
- appropriate open-data options such as OpenStreetMap-based solutions where they are realistically usable within policy / operational constraints.

If another serious Japan-capable provider is discovered, include it.

Do not include a provider merely because its marketing page exists. Confirm the actual API/product relevant to POI search/details.

## 4. Source hierarchy and evidence rules

For decisive claims, prefer in this order:

1. official API/product documentation;
2. official pricing / SKU / quota documentation;
3. official terms, licensing, attribution and platform-policy pages;
4. official coverage / data / status documentation;
5. official support / FAQ pages.

Third-party articles may be used only as discovery aids, not as sole evidence for a hard gate.

Every matrix claim must record:

- provider;
- fact / capability;
- status: `confirmed | partial | unknown | not-supported`;
- official source URL;
- access date/time;
- short evidence note;
- confidence / limitation.

Do not reproduce long copyrighted passages. Store concise paraphrases and URLs.

## 5. Mandatory evaluation matrix

Evaluate each serious candidate on all of the following.

### A. Japan data / POI capability

- Japan POI / business coverage evidence;
- category breadth relevant to attractions, restaurants, hotels, shopping, stations, onsen, entertainment and local places;
- free-text search;
- autocomplete / suggestions;
- nearby / radius / bbox / category search;
- place details;
- stable provider place ID semantics;
- coordinates;
- Japanese and English / multilingual names and addresses;
- categories / types;
- opening hours / business status where supported;
- contact / website / rating fields where supported;
- photo/media capability and source/licensing boundary;
- update/freshness model where documented.

### B. TravelAssist architecture fit

- can results legally/technically be displayed on the existing Mapbox map;
- can TravelAssist normalize provider responses server-side;
- can provider IDs be retained for later refresh / lookup;
- what fields may be cached, stored, retained or derived;
- what fields must remain transient;
- whether photos require provider-specific display / attribution;
- whether a provider-independent future WBS 7.4 schema is practical;
- fallback / multi-provider feasibility without violating terms;
- vendor lock-in risk.

### C. Platform / product rights

- Web usage;
- future iOS usage;
- future Android usage;
- attribution obligations;
- map-display restrictions;
- caching / storage / retention restrictions;
- restrictions on creating a POI database or derived dataset;
- restrictions on mixing provider data with other map/providers;
- required branding / links.

Any unclear right must be marked `unknown`, never inferred.

### D. Commercial / operational

- pricing model / SKU or request model;
- field-based billing where relevant;
- documented free/trial allowance where current;
- quotas / rate limits where public;
- cost predictability for TravelAssist search/detail usage;
- status page / reliability resources;
- support model where public;
- credential / server-side security fit;
- regional availability / account restrictions if documented.

Do not invent a monthly bill without an explicit usage scenario. If cost examples are produced, state assumptions and formulas separately from official provider pricing facts.

## 6. Hard selection gates

A production-primary recommendation requires sufficient official evidence for all gates below:

1. **Japan capability** — credible POI/business search/detail capability for Japan.
2. **Core API fit** — supports the minimum search/detail workflow TravelAssist needs.
3. **Stable identity** — usable provider identity / refresh model.
4. **Multilingual fit** — workable Japanese-first data with international display path.
5. **Mapbox compatibility** — no unresolved material restriction on the intended display pattern.
6. **Retention / persistence fit** — rights are understood well enough for the intended server-side data lifecycle.
7. **Attribution compliance** — obligations are implementable.
8. **Web + future mobile path** — no known platform blocker for the stated roadmap.
9. **Commercial clarity** — pricing/quota model is sufficiently understood to estimate and control cost.
10. **Operational viability** — rate/security/service constraints are workable.

A provider may still be classified as `session-only`, `fallback`, or `evaluation-only` when it fails the persistence gate but remains useful in a narrower legally supported role.

## 7. Decision method

Do not decide solely by a weighted feature score.

Use a two-stage decision:

### Stage 1 — Hard-gate eligibility

For every provider, mark each hard gate:

- PASS
- CONDITIONAL
- FAIL
- UNKNOWN

A primary provider cannot receive plain PASS with material UNKNOWN hard gates.

### Stage 2 — Comparative fit

Among eligible candidates compare:

- Japan product fit;
- data richness;
- Mapbox integration simplicity;
- future mobile path;
- cost predictability;
- persistence flexibility;
- fallback architecture;
- engineering complexity;
- lock-in risk.

Document both the recommended provider and why the runner-up was not chosen.

## 8. Required decision outputs

Create:

- `docs/architecture/poi-provider-selection.md`
- `docs/qa/TASK-058/provider-matrix.json`
- `docs/qa/TASK-058/provider-decision-report.md`
- `docs/tasks/RESULT-TASK-058-b-wbs-7-2-poi-provider-selection.md`

### `provider-matrix.json`

Must be machine-readable and include at minimum:

- research timestamp;
- reviewed develop SHA;
- candidate list;
- official sources per provider;
- all matrix fields;
- hard-gate status and explanation;
- unresolved questions;
- pricing facts separated from scenario calculations;
- primary / fallback classification;
- recommended next actions.

### Architecture decision

`docs/architecture/poi-provider-selection.md` must describe:

- TravelAssist requirements;
- selected provider strategy or accurate blocker;
- primary provider;
- fallback / no-fallback decision;
- allowed data lifecycle concept;
- attribution concept;
- Mapbox interaction boundary;
- future Web/mobile implications;
- vendor-specific data that must not leak into future canonical POI contract;
- open commercial/legal questions;
- explicit downstream constraints for WBS 7.4 / 7.6 / 7.7 / 7.9.

Do not implement the downstream contract in this Task.

## 9. Optional cost scenarios

If official pricing is sufficiently clear, calculate transparent scenarios such as low / medium / high monthly usage. Keep these clearly separated from official facts.

Each scenario must show:

```text
assumed searches
assumed autocomplete sessions / requests
assumed details calls
assumed photos / media calls if billable
provider unit price / SKU reference
formula
estimated cost
excluded / unknown charges
```

If official pricing cannot support a reliable estimate, say so instead of inventing one.

## 10. No live-provider requirement

This Task does not require live API calls.

- Do not purchase a plan.
- Do not create billable traffic.
- Do not commit keys.
- Do not require a production account.

If existing legitimate non-production access is already available, do not use it unless explicitly necessary and clearly non-billable; official-source selection evidence remains the primary basis of this Task.

Empirical Japan quality benchmarking can be proposed as a separate later evaluation task if documentation is insufficient.

## 11. WBS tracking

`docs/project/WBS-7.2-owner-correction.md` is authoritative for Owner=B.

At actual execution start, read the complete latest Master WBS. If its 7.2 row still shows historical Owner=A, change **only** 7.2 to:

```text
| 7.2 | Places / POI Provider 选型 | B | P0 | 1.10 | 进行中（#361 / TASK-058-B） |
```

Do not overwrite unrelated A/B changes.

After research, evidence and Draft PR are complete:

```text
| 7.2 | Places / POI Provider 选型 | B | P0 | 1.10 | 待审查（#361 / TASK-058-B；Draft PR #<number>） |
```

Only explicit user acceptance + merge may set `已完成` and close Issue #361.

## 12. Validation / QA

This is primarily a research/documentation task, but repository integrity still matters.

At minimum:

- `npm ci`;
- verify no package / lock / runtime changes unless explicitly justified (normally zero);
- validate JSON evidence parses and has required fields;
- run repository canonical lint / typecheck / build if the current Quality Gate requires them;
- run relevant documentation / architecture validation if present;
- scoped Prettier for changed files;
- `git diff --check`;
- verify no real credentials or copied provider secrets exist in committed evidence;
- create Draft PR to `develop`;
- require exact final-head GitHub Quality Gate PASS when available for the final review candidate.

If a canonical repo gate has pre-existing debt, prove exact baseline equivalence; do not hide new failures as debt.

## 13. Out of scope

- WBS 7.4 POI standard schema;
- WBS 7.6 location search API / provider adapter;
- WBS 7.7 POI details API;
- WBS 7.9 recommendation scoring;
- POI mass ingestion;
- Master Code allocation changes;
- Planner / Map UI modifications;
- routing provider work;
- AI / Engine work;
- DB migrations;
- Personal Center work;
- purchasing / contract execution;
- external provider account administration.

## 14. Completion behavior

Create a Draft PR → `develop` and stop.

Do not auto-merge. Do not close Issue #361. Do not auto-start 7.4 / 7.6 / 7.7 / 7.9.

Return the complete `RESULT-TASK-058-B` for user review.
