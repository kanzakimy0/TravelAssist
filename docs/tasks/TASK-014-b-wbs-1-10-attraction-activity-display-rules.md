# TASK-014-B — WBS 1.10 景点与活动标签 / 主系统展示规则

## Metadata

- Task ID: `TASK-014-B`
- WBS ID: `1.10`
- Owner: `B`
- Responsibility: `Main Travel System / Design Specification`
- Priority: `P1`
- Status: `进行中`
- Dependency: `1.5 Planner 主画面冻结 v1`
- Dependency State: `已完成`
- Repository: `https://github.com/kanzakimy0/TravelAssist.git`
- Base Branch: `develop`
- Base Commit at task creation: `efd4661867b239ef2f87a417b95fc7dab856822f`
- Branch: `feature/b-wbs-1-10-attraction-activity-display-rules`
- Issue: `#158`
- Task File: `docs/tasks/TASK-014-b-wbs-1-10-attraction-activity-display-rules.md`
- Result File: `docs/tasks/RESULT-TASK-014-b-wbs-1-10-attraction-activity-display-rules.md`
- Primary Design Deliverable: `docs/ui/attraction-activity-tag-display-rules.md`

> Owner exception: WBS v0.4 normally assigns Main Travel System work to A. The user explicitly reassigned WBS 1.10 to B on 2026-09-07. This explicit assignment is authoritative for this Task only and must be recorded in WBS/Result without rewriting the global v0.4 boundary.

---

# 1. Goal

Freeze one coherent attraction/activity taxonomy and presentation rule set for the main travel system so that the following surfaces use the same semantics:

- Planner map pins and POI details;
- bottom timeline attraction/activity items;
- recommendation-plan summaries;
- itinerary/detail workspace;
- later Places / POI Provider and POI Schema work;
- later preference-to-Planner mapping.

This is a **design/specification Task**, not a Provider/API implementation Task.

The final specification must answer both:

```text
What kind of place/activity is this?
```

and:

```text
Which labels are actually shown to the traveler on each UI surface?
```

Do not solve this by showing every raw Provider category.

---

# 2. Source of Truth

Before editing, read the latest versions of at least:

```text
docs/project/WBS-TravelAssist.md
docs/ui/trip-planner.md
docs/ui/planner-right-panel-secondary-tabs.md
docs/ui/planner-map-interaction-booking-mapbox.md
docs/ui/trip-detail.md
docs/ui/preference-center.md
docs/preferences/preference-system.md
docs/tasks/TASK-WBS-5.8-b-attraction-activity-preference-ui.md
docs/tasks/RESULT-WBS-5.8-b-attraction-activity-preference-ui.md
```

Also inspect current Planner/Trip fixture/model names that carry POI/activity/category/tag-like fields. Search rather than guessing paths.

Priority when sources conflict:

```text
latest explicit user decision
>
latest merged/frozen main-system UI specification
>
WBS 1.10 goal
>
existing merged code/fixtures
>
older preference UI wording
>
Codex inference
```

Important boundary:

- WBS 5.8 describes **long-term user preference dimensions**.
- WBS 1.10 describes **main-system POI/activity classification and display labels**.
- They may map to each other, but they are not the same schema.

---

# 3. Preflight

Run and record:

```bash
git status --short --untracked-files=all
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Then make sure the task branch exists locally from the remote branch:

```bash
git switch --track origin/feature/b-wbs-1-10-attraction-activity-display-rules
```

If already present locally:

```bash
git switch feature/b-wbs-1-10-attraction-activity-display-rules
git pull --ff-only origin feature/b-wbs-1-10-attraction-activity-display-rules
```

Do not use:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Do not delete or overwrite another owner's untracked work.

If `origin/develop` advanced after task creation, integrate it safely before final delivery and record the integrated commit. Do not silently rebase away other people's work.

---

# 4. Mandatory WBS Start Update

Before drafting the design spec, update the latest `docs/project/WBS-TravelAssist.md` on this Task branch:

1. Change WBS `1.10` Owner from `A` to `B`.
2. Change WBS `1.10` Status from `未开始` to `进行中`.
3. Keep Priority `P1` and Dependency `1.5` unchanged.
4. Add a current-task tracking row:

```text
TASK-014-B | 1.10 | B | 进行中 | #158 | docs/tasks/TASK-014-b-wbs-1-10-attraction-activity-display-rules.md | feature/b-wbs-1-10-attraction-activity-display-rules | ... | ...
```

5. Add a short note that the user explicitly reassigned only WBS 1.10 to B; do not globally rewrite v0.4 Main Travel System ownership.

This WBS update is mandatory before returning any final Task result.

---

# 5. Required Design Deliverable

Create:

```text
docs/ui/attraction-activity-tag-display-rules.md
```

The document must be implementable and must include all sections below.

## 5.1 Vocabulary and layers

Define distinct layers and prohibit mixing them:

1. `primary_category` — stable top-level semantic classification used by TravelAssist.
2. `secondary_category` — more specific normalized subtype.
3. `experience_tags` — traveler-facing qualities/experiences.
4. `operational_tags` — planning-relevant state such as reservation/time/weather/access constraints.
5. `provider_categories` — raw external taxonomy, preserved for mapping/audit but not shown directly by default.
6. `preference_dimensions` — mapping targets for WBS 5.8 / future 5.14, not POI categories themselves.

For every layer, define:

- purpose;
- whether it is stable or Provider-dependent;
- whether it is persisted later;
- whether it may be shown to users;
- maximum number displayed on each surface;
- fallback behavior.

## 5.2 Top-level attraction/activity taxonomy

Define a compact TravelAssist-owned top-level taxonomy suitable for global use.

At minimum reconcile these already-used preference concepts without mechanically copying them:

- 自然;
- 历史;
- 人文 / 文化;
- 艺术;
- 摄影;
- 活动 / 体验.

The main-system taxonomy may add or reorganize categories when required for actual POIs, for example entertainment, family, shopping/market, viewpoint, wellness, nightlife, sports, seasonal/event, etc., but every addition must have a reason and mapping rule.

Requirements:

- no city-specific taxonomy;
- no Provider-specific names as canonical IDs;
- canonical IDs should be stable English `snake_case` identifiers;
- user-visible labels should support localization;
- avoid excessive top-level categories;
- define `other` / unknown fallback explicitly.

## 5.3 Secondary categories

Provide a normalized secondary-category table with representative examples.

The table must cover enough globally common cases for later POI Provider selection, such as:

- landmark / observation / viewpoint;
- museum / gallery;
- temple / shrine / church / religious site;
- castle / palace / historic building / heritage district;
- park / garden / mountain / beach / lake / waterfall / nature reserve;
- zoo / aquarium;
- theme park / entertainment venue;
- market / shopping street;
- workshop / food experience / cultural performance / guided activity;
- seasonal event / festival;
- outdoor / adventure / sport activity.

Do not claim the list is a final Provider schema if WBS 7.2 / 7.4 has not been executed. Mark the appropriate extension point.

## 5.4 Experience tags

Define traveler-facing tags that explain *why* a stop fits, not merely what the place type is.

Examples to evaluate and normalize:

- 适合拍照;
- 亲子友好;
- 雨天可选;
- 室内 / 室外;
- 夜景;
- 日落;
- 轻松散步;
- 深度文化;
- 当地特色;
- 小众;
- 高人气;
- 季节限定;
- 无障碍友好.

For each, define whether it is:

- semantic/curated;
- derived later from data;
- contextual/dynamic;
- allowed to display when confidence is unknown.

Do not freeze dynamic facts such as current weather, live crowding, current price, opening hours, availability, or travel time as static taxonomy tags.

## 5.5 Operational/planning tags

Specify planning-relevant badges separately from experience tags, e.g.:

- 预约建议 / 预约必需;
- 指定时段;
- 门票;
- 受天气影响;
- 季节开放;
- 需要较多步行;
- 无障碍信息待确认.

Clearly mark which tags need authoritative live/provider data before they may be shown as factual claims.

## 5.6 Surface-by-surface display rules

For each surface below, define:

- which label layer is shown;
- display priority;
- maximum visible count;
- overflow behavior;
- truncation/localization behavior;
- icon/color use;
- loading/unknown/fallback state;
- what must never be shown.

Required surfaces:

1. Map pin default state.
2. Map pin selected state.
3. POI mini popup/card.
4. POI detail panel.
5. Bottom timeline compact item.
6. Bottom timeline expanded/detail item.
7. Recommendation Plan 1/2/3 summary.
8. Trip Detail / itinerary workspace.
9. Search results / candidate POI list if the current specs expose one.

Keep the current Planner layout geometry and recommendation-card geometry frozen unless the source specs already permit a label slot. This Task defines rules; it does not redesign the page.

## 5.7 Priority algorithm

Define a deterministic display selection rule, for example conceptually:

```text
critical operational badge
> canonical primary/secondary label
> strongest preference-matching experience tag
> contextual highlight
> lower-confidence/decorative tags
```

But derive the final rule from the actual current UI constraints.

Include tie-breaking and deduplication rules:

- same meaning from multiple Providers;
- primary/secondary label duplicates;
- preference tag overlaps;
- unavailable localization;
- more tags than slots;
- conflicting tags;
- missing confidence/provenance.

## 5.8 Preference mapping boundary

Provide an explicit mapping section between WBS 1.10 and Personal Center preference dimensions.

The document must state:

```text
Preference = what the user tends to like.
POI taxonomy = what the place/activity is.
Display tag = what is useful to show now.
```

A POI may map to multiple preference dimensions; a preference dimension must not be used as the sole POI category.

Define a future-facing mapping shape suitable for WBS 5.14 / 7.9 without implementing either.

## 5.9 Provider / POI Schema handoff

Prepare implementation guidance for WBS 7.2 and 7.4:

- stable canonical IDs;
- raw provider category preservation;
- normalized mapping table location recommendation;
- confidence/provenance recommendation;
- localization key recommendation;
- unknown category handling;
- versioning/migration considerations.

Do not select or integrate a real Provider in this Task.

## 5.10 Accessibility and localization

Freeze rules for:

- no category meaning conveyed by color alone;
- icon + text where meaning is material;
- screen-reader names;
- CJK and longer English/German/French labels;
- single-line versus multi-line slots;
- ellipsis/tooltips only where appropriate;
- reduced cognitive load on map/timeline surfaces.

## 5.11 Examples

Include at least 12 normalized examples across regions and types. Use well-known POI types to demonstrate classification, but avoid inventing dynamic facts.

Each example should show at least:

```text
primary_category
secondary_category
experience_tags
operational_tags (if safely knowable / otherwise unknown)
preference mapping
surface label example
```

Examples should cover a mix of nature, heritage, museum/art, viewpoint, family attraction, market, activity/experience, seasonal/event, and entertainment.

---

# 6. Non-Goals / Explicitly Out of Scope

Do not implement:

- WBS 7.2 Places / POI Provider selection;
- WBS 7.4 POI Schema production code;
- WBS 7.6 / 7.7 APIs;
- WBS 7.9 recommendation scoring;
- WBS 5.14 Preference Contract;
- route/transit logic;
- AI itinerary generation;
- booking integration;
- Auth / DB / persistence;
- new package/dependency;
- Planner visual redesign;
- new production imagery.

Do not change Personal Center UI behavior under WBS 5.8.

---

# 7. Validation

Because this is a design/specification Task, validation focuses on consistency and repository hygiene.

At minimum:

1. Verify every current Planner surface named in the document actually exists in current merged specs/code, or mark it as future/conditional.
2. Search for conflicting category/tag terminology and list reconciliations.
3. Check that no dynamic fact is incorrectly frozen as a static taxonomy fact.
4. Check that the spec does not require a real Provider before WBS 7.2.
5. Check that the spec does not equate WBS 5.8 preference dimensions with POI taxonomy.
6. Run Markdown formatting/lint commands already supported by the repository when available; do not add a dependency merely for this Task.
7. Run project tests only if repository rules require them for docs-only changes; record exactly what ran.

---

# 8. Deliverables

Mandatory files:

```text
docs/ui/attraction-activity-tag-display-rules.md
docs/tasks/RESULT-TASK-014-b-wbs-1-10-attraction-activity-display-rules.md
docs/project/WBS-TravelAssist.md
```

Update this Task file only if factual execution metadata changes.

Result must include:

- Status;
- Base / integrated develop commit;
- Owner exception confirmation;
- files changed;
- taxonomy summary;
- unresolved decisions, if any;
- validation performed;
- Issue / branch / commit / PR;
- WBS update confirmation;
- next dependencies unlocked (`7.2`, later `7.4`) without automatically starting them.

---

# 9. Git / PR Rules

- Work only on `feature/b-wbs-1-10-attraction-activity-display-rules`.
- Do not push directly to `develop`.
- Preserve other owners' work.
- No force push.
- Commit Task work and push the branch.
- Create a Draft PR to `develop` after the specification is complete.
- Use `Relates to #158`; do not auto-close the Issue until merge + acceptance.
- Do not auto-merge.
- Do not start another WBS after finishing.

Suggested commit prefix:

```text
docs(TASK-014-B): freeze attraction activity display rules
```

---

# 10. Status Mapping

Use the project rules exactly:

- execution started: `进行中`;
- spec complete / PR open but not merged: `待审查`;
- blocked by a real dependency/decision: `阻塞`;
- only after PR is merged into `develop` and user acceptance passes: `已完成`.

If blocked, do not invent a decision to claim completion. Document the blocker, update WBS/Issue, push the record, and stop.
