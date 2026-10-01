# TASK-086-B source and persistence decisions

## Admitted sources

- [福岡市営渡船 official open-data feed](https://data.bodik.jp/dataset/9938b52c-e54c-4d92-9975-a98c5f60e727): CC BY 4.0, attributed retained ZIP and derived stop/trip sequences. Source window 2026-01-01 through 2027-12-31. Four passenger routes; seven stop identities are independently admitted from the current feed, without using rejected v1 identities.
- [長崎県営バス official open-data feed](https://data.bodik.jp/dataset/420000_nagasakikeneibus): CC BY 4.0, attributed retained ZIP and derived stop/trip sequences. VER_20261001, window 2026-04-01 through 2027-04-01. Only route IDs 10, 20, 40, 45 and 50 are selected for highway, airport and tourism purposes, preserving every actual intermediate call. Agency identity comes from `agency.txt`; `feed_publisher_name=西日本鉄道株式会社` is not treated as the route operator.

The source windows are normalized only as source metadata. Original calendar exceptions and boarding restrictions remain traceable. TravelAssist transformations: purpose selection, exact stop admission, pattern grouping by direction and calling sequence, directed segments, explicit transfers, graph QA. Trip short names are not inferred to be express/local classes; missing service-class labels are explicit.

Retained hashes:

```text
Fukuoka ferry ZIP: b39a7590d454e37a400f724472e4969133c7b9f54b8600dce68bc47fa0da1b9e
Nagasaki bus ZIP: add5981eb3444be32570b26785c845be582b3458fac2b3ac9830351feb0148fc
Prior 084 Nagasaki ZIP: 69a20a9477a71af71921d71ea68b338122cddbdaa3fad7a2560baed7be655d4e
```

The current Nagasaki source differs from 084. It was independently acquired and parsed, with no reuse of 084 acceptance or batch receipts. [CC BY 4.0 terms](https://creativecommons.org/licenses/by/4.0/). Attribution and original URLs are included in every source package and manifest. No warranties or operator endorsement are implied.

## National source blockers, not fixpoint proofs

- [JR Central official timetables](https://global.jr-central.co.jp/en/info/timetable/) and [site policy](https://jr-central.co.jp/policy/index.html): schedules exist, but this run has no affirmative permission record for bulk retained and redistributed timetable-derived datasets. No restricted timetable payload was copied. A scoped factual extraction or another licensed static source remains work to evaluate.
- [ODPT catalogue](https://ckan.odpt.org/en/dataset/?res_format=JSON) and [Challenge Limited License](https://developer.odpt.org/challenge_license): the reviewed JR East listing is contest-only, regional and excludes Shinkansen. Contest purpose, reusable-data redistribution restrictions and termination/deletion requirements are not a perpetual national dataset permission. No key or registration is assumed to grant broader rights.
- [MLIT S12](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-S12-2024.html) is CC BY 4.0 identity/usage evidence. Its spatial station group and usage counts cannot prove stopping patterns or transfers. [N02](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-v3_0.html) describes physical infrastructure, which cannot replace local/express service patterns.
- The [GTFS data repository](https://gtfs-data.jp/) has further discoverable feeds. Their national bridge coverage and dataset-specific rights have not been exhausted. This run does not assert all alternatives have been checked.

These are conservative ingestion decisions for this repository, not conclusions that factual route information cannot lawfully be used. National acquisition, component review and alternative connection work remain open. Therefore `fixpoint-proofs.jsonl` is empty and `globalTopologyDiscoveryFixpoint=NOT_PROVEN`.

## Existing project boundaries

TASK-082 `GraphRef`, directed `transport_network` semantics and separate unresolved metrics are reused in the offline wrapper. No second public Planner contract is added. Route Schema WBS 7.5 uses contract v1.0; its unknown-value semantics and provider-independent boundary remain intact. Provider batch/cache/retention rights are not inferred from provider selection. No Google/駅すぱあと route payload was acquired or used to derive this offline graph. N03/GSI production joins were not executed. TASK-085 is not consumed.
