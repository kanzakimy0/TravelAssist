# N03 2026 / GSI source-rights gate

**Decision: `APPROVAL_REQUIRED` as an internal fail-closed gate.** This does not assert that the proposed operation legally always needs approval. A written GSI determination has not been obtained, so the production point-in-polygon join is not authorized. The machine-readable [decision](../../../data/transport/n03-2026-source-rights-decision.json) is enforced by the master assembler.

## Exact operation reviewed

Use MLIT N03 2026 polygons, whose administrative reference date is **2026-01-01**, locally to point-in-polygon join all 244 accepted TransportNode representative coordinates to prefecture and municipality names/codes. Persist only the derived assignments with N03 version, source, method and exception provenance. Do not distribute polygons. The proposed service is commercial and publishes coordinate-bearing node records.

## Evidence and interpretation

- The [MLIT N03 2026 listing](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html) declares CC BY 4.0, identifies GSI base-map derivation and reproduction approval `R 7JHf 351`, and says a GSI application may be necessary for secondary use. Some boundaries are provisional.
- [GSI map-use procedure](https://www.gsi.go.jp/LAW/2930-index.html) and [GSI Q&A](https://www.gsi.go.jp/LAW/2930-qa.html) distinguish reproduction from use approval and discuss downstream use of previously approved products. The N03 notice refers to reproduction approval; it does not give a clear exemption for this specific derived attribute product.
- The [GSI navigator](https://service.gsi.go.jp/onestop/navi/nav1/) asks about the product, [public distribution](https://service.gsi.go.jp/onestop/navi/nav5-2/), and [coordinates/accuracy](https://service.gsi.go.jp/onestop/navi/nav5-3/). The [application branch](https://service.gsi.go.jp/onestop/navi/nav5-5/) is potentially relevant to a public coordinate-bearing node catalog. The navigator does not explicitly resolve the described N03 polygon-to-attribute join.

The CC BY 4.0 notice and no-polygon-redistribution design reduce some rights questions but do not answer the separate GSI survey-product condition. We therefore need a formal response for the precise operation in the decision record. Once that response or a separately reviewed alternative source is available, update the rights decision before implementing any N03 join. Until then, prefecture and municipality assignment remain **0/244**, and the 47-prefecture audit cannot pass.

## Assignment preparation (disabled until rights PASS)

The planned deterministic assignment covers the existing 244 nodes only. For each node, retain the prefecture and municipality name/code, source and version, administrative reference date, join algorithm version, and boundary/exception status alongside the assignment evidence. A point on an uncertain or provisional boundary requires an explicit review result; it must not receive an unreviewed nearest-area fallback.

Before execution, record the written rights determination and its evidence reference in the machine-readable decision. A PASS authorizes a reproducible join and then the 47-prefecture coverage audit. A determination that prohibits this use changes the gate to `BLOCKED` or `ALTERNATIVE_SOURCE_REQUIRED`. While the gate is `APPROVAL_REQUIRED`, no production polygon join or persisted administrative assignment runs.
