# 駅すぱあと Evaluation Routing

## Decision

駅すぱあと Webサービス is the provisional Japan public-transit provider for
development and evaluation. It is not the frozen production provider.

The adapter uses the official JSON endpoint:

`GET https://api.ekispert.jp/v1/json/search/course/extreme`

Verified request parameters are `key`, `viaList`, `date`, `time`,
`searchType`, `sort`, `answerCount`, and
`resultDetail=addCorporation`. `viaList` keeps colon separators while each
individual location is UTF-8 percent encoded. The request asks for JSON through
the Accept header.

Official references:

- [Extreme course search](https://docs.ekispert.com/v1/api/search/course/extreme.html)
- [API overview and endpoint](https://docs.ekispert.com/v1/api/)
- [JSON object/array compatibility notes](https://docs.ekispert.com/v1/get-started/attention/)
- [Evaluation, usage, attribution, and licensing FAQ](https://docs.ekispert.com/v1/faq/)
- [Web service terms](https://docs.ekispert.com/v1/WebService_TOS.pdf)

## Normalization

Provider JSON can change a one-item node between object and array. The adapter
normalizes both forms for Course, Price, Line, Point, and Error. It pairs
`Route.Line[n]` with `Route.Point[n]` and
`Route.Point[n+1]`, maps provider minutes to seconds and 100-metre units to
metres, converts documented Japanese datetimes to
`Asia/Tokyo`, and maps Fare/Charge summaries to JPY minor units.

Provider mode names map to the public modes. Unknown modes become `other`
with a safe source label. `SerializeData` is never exposed; when useful for
deduplication it contributes only to a one-way short fingerprint.

## Server and secret boundary

The implementation lives under `src/server/routing` and imports
`server-only`. Required environment names are documented as empty
placeholders:

- `ROUTING_PROVIDER_MODE`
- `EKIWORLD_ACCESS_KEY`
- `ROUTING_EKIWORLD_PRODUCTION_APPROVED`

No `NEXT_PUBLIC_` routing credential exists. Requests and errors never log or
return the access key or the credential-bearing URL.

Evaluation mode fails closed when `NODE_ENV=production`. Production mode also
fails closed unless an explicit entitlement approval flag is present. The flag
is a technical guard, not proof of a contract; deployment approval must verify
commercial evidence separately.

## Reliability and cache boundary

The service composes an external AbortSignal with a bounded timeout. It retries
only explicitly retryable network, 5xx, timeout, or 429 failures, at most two
times. Authentication, validation, no-route, malformed payload, and contract
errors are not retried.

The cache capability records canonical key inputs, but the default policy is
`persistence: none` and `ttlSeconds: null`. TASK-022-A does not implement
WBS 7.10 and does not store provider raw responses.

## Production gates still open

Before any production release, product/legal/engineering must confirm:

1. production price and expected monthly volume;
2. save and redisplay rights for user trips;
3. Mapbox mixed-display and geometry rights;
4. Web, iOS, and Android entitlement;
5. cache TTL, retention, deletion, SLA, support, and final attribution.

Until then the adapter is Evaluation/development-ready only. Planner route
replacement, Mapbox overlay, provider failover, POI, AI, Engine, and booking
integration are out of scope.
