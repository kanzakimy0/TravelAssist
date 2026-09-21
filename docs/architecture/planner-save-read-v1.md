# Planner Save / Read v1

WBS 4.19 makes a selected Canonical Trip editable in the Planner. The route is opt-in through `?tripId=<Canonical Trip UUID>`; without it, the existing browser-only demo remains unchanged.

## Ownership and flow

```text
authenticated browser
  → GET /api/planner/trips/{tripId}
  → verifiedPrivateRequest
  → existing createTripRepository.read
  → Canonical parser
  → Planner adapter
  → Planner Store editable working copy

explicit Save
  → Planner supported-subset adapter
  → Canonical parser
  → PUT /api/planner/trips/{tripId}
  → existing createTripRepository.replace
  → existing Auth/RLS/transaction/root-and-plan CAS
  → actual Canonical read result
  → exact Store acknowledgement and browser recovery cache
```

`src/server/trips/**` remains the only Trip repository, schema, transaction and revision authority. The new private Route Handler is a narrow transport boundary and introduces neither a table nor a second revision counter.

## Read and browser precedence

The server response is parsed twice: once at the HTTP boundary and again by the browser-safe client. The Planner adapter then produces the compatible editable working model while retaining the validated Canonical source in Store memory.

When a `tripId` is present, a clean Store accepts the server snapshot as Canonical truth. A browser cache is only a recovery cache. If a read returns after local edits have made the Store dirty, it is reported but not hydrated. A Canonical snapshot without a plan is shown as an empty state and never replaced with a fabricated plan.

## Save and reconcile

Save is explicit. Planner-to-Detail navigation has no remote write path. A successful save returns the actual persisted Canonical tree and revision. The Store hydrates only when the in-flight snapshot is still exact; only then is that exact projection marked clean. A later acknowledgement leaves newer local edits dirty.

The existing `travelassist.saved-workspace.v1` browser record is updated after a confirmed server response. A localStorage failure cannot roll back a server write or discard the working copy.

## Supported projection

The adapter preserves every unchanged Canonical field. It maps supported Planner plan title, day date, item title, place, schedule, booking status, lock state, scheduled/alternative placement, deletion and UUID-backed addition. Edits to a schedule are serialized with the Canonical day timezone and validated by `parseTripPlanSnapshot`; invalid local DST wall times fail without a write.

Planner UI selection, range, inspections, overlays, map coordinates synthesized only for presentation, Detail draft/preparation state, provider data and browser-only notices are excluded from Canonical persistence. Existing Canonical booking evidence is preserved; the Planner cannot invent a confirmation reference or verification timestamp.

## Failure contract

Authentication, owner-only absence, malformed payload, network failure, Canonical parser failure, localStorage failure and stale Trip/Plan CAS all retain the current working copy. Route responses are `private, no-store`, use verified Bearer or Cookie authentication, and map foreign/unknown Trip reads to the same 404 response.

No autosave, Engine audit/outbox change, preference live wiring, AI/POI/provider call, Booking/Payment operation or visual redesign is part of this boundary.
