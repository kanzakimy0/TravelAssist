# Planner State Store v1

## Scope

`TASK-051-A` closes the client-side Planner state boundary. It does not add a
server save path, a Preference API call, a canonical Trip schema, or Mutation
Engine behavior.

## Single working-copy boundary

`PlannerStoreState` is the only mounted writable Planner state root:

```text
PlannerStoreState
  working   -> local editable TripState fields, excluding UI
  ui        -> Planner selection, range, overlays and focus
  draft     -> Detail-only local additions, completion and preparation
  meta      -> local revision, persisted projection fingerprint, hydrate origin
```

`trip-model.ts` remains the existing local working-copy reducer. The Store
combines its `working` and `ui` slices only when legacy Planner components need
a `TripState` view. That compatibility view is derived and cannot become an
independent writable store. `planner-state.ts` remains a compatibility reducer
for old UI controls and does not own Planner business facts.

## Ownership

| State                                                                     | Owner           | Writable through                      | Persisted                  |
| ------------------------------------------------------------------------- | --------------- | ------------------------------------- | -------------------------- |
| Plans, arrangements, settings, local configuration, working plan          | `working`       | `trip.apply` → existing `tripReducer` | Yes, projection only       |
| Range, selected item, inspection, panels, focus, local notice             | `ui`            | `trip.apply` UI actions               | No                         |
| Detail additions, checklist/completion, preparation, rail responses       | `draft`         | `draft.replace`                       | Yes, projection only       |
| Revision, fingerprint, source and canonical revision observed locally     | `meta`          | Store reducer only                    | Fingerprint only in memory |
| Dialogs, DOM triggers, map pick, animation/progress and viewport collapse | Component       | local React state                     | No                         |
| URL `view`, `day`, `scope`                                                | Router          | route query                           | No                         |
| Canonical Trip revision and durable ChangeSet audit                       | Mutation Engine | server boundary                       | External authority         |

No material business field exists at two independently writable authoritative
locations. `TripState` is a client working copy, while the shared contracts in
`src/shared/contracts/trips/` remain the public canonical contract.

## Persistence and restore

```text
Planner Store
  → projectPlannerStore / tripSnapshot
  → one browser key: travelassist.saved-workspace.v1

browser payload
  → parsePlannerStoreSnapshot / parseSavedTrip validation
  → Store hydrate
```

The snapshot excludes UI, DOM values, map controls, route/provider response
objects and component-local state. Snapshot validation occurs before hydrate
and repeats at the Store reducer boundary. Corrupt records are rejected without
changing the Store. Browser write errors and stale-tab checks leave the working
copy intact. A normal hydrate cannot overwrite locally dirty work; only an
explicit discard/save path passes `force` for the exact snapshot chosen by the
user.

Working-draft archive/switch keeps using `travelassist.working-drafts.v1` as a
directory of validated snapshots. It is not a second current-trip truth.

## Dirty and replay semantics

Dirty compares the canonicalized persistence projection fingerprint. UI-only
actions do not increment `localRevision` and do not make an itinerary dirty.
Business or Detail-draft changes increment the local revision. A late save
acknowledgement is ignored unless it matches the current projection.

The reducer is pure and uses no module-global mutable Store. An equal initial
state plus an equal action sequence produces an equal Store state. `hydrate`
supports a higher observed canonical revision as a future reconcile fixture;
it does not mint an Engine revision, ChangeSet, audit event, permission, outbox
record or idempotency key.

## Future durable path

```text
Planner Store intent
  → ChangeSet builder
  → Mutation Engine
  → authoritative canonical revision
  → validated Store reconcile/hydrate
```

That path is documentation only in this task. No API, DB migration, remote
Trip save/read/history or Preference integration was added.
