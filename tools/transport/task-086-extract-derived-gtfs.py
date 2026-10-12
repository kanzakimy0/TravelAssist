"""Audit private Tokachi airport/local GTFS into reviewed minimum route-guidance facts.

The output is not a raw GTFS distribution. Native bytes remain private; clean
rebuilds validate the reviewed, versioned projection rather than reproduce ZIPs.
"""
import argparse
import csv
from datetime import datetime
import hashlib
import html
import io
import json
from pathlib import Path
import re
import zipfile

GRANT_URL = 'https://www.tokachibus.jp/rosenbus/opendata/'
SOURCE_ID = 'gtfs:tokachi-airport'
SCHEMA = 'TASK086_DERIVED_GTFS_STATIC_V1'
STOP_FIELDS = ('stop_id', 'stop_name', 'stop_lat', 'stop_lon', 'location_type', 'parent_station', 'platform_code')
TRIP_FIELDS = ('trip_id', 'route_id', 'service_id', 'direction_id')
CALL_FIELDS = ('trip_id', 'stop_id', 'stop_sequence', 'pickup_type', 'drop_off_type')
CAL_FIELDS = ('service_id', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'start_date', 'end_date')


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def sha(value):
    return hashlib.sha256(value if isinstance(value, bytes) else canonical(value).encode()).hexdigest()


def require(condition, code):
    if not condition:
        raise ValueError('DERIVED_GTFS_' + code)


def project(row, fields):
    return {k: row.get(k, '') for k in fields}


def extract(raw, grant_raw, request):
    digest, grant_hash = sha(raw), sha(grant_raw)
    review = request['grantReview']
    url, date = request['sourceUrl'], request['serviceDate']
    require(digest == request['archiveSha256'], 'ARCHIVE_HASH_MISMATCH')
    source_match = re.fullmatch(r'https://www\.tokachibus\.jp/download/\d{8}GTFS-(airport|dia)\.zip', url)
    require(source_match, 'SOURCE_SCOPE')
    source_id = SOURCE_ID if source_match.group(1) == 'airport' else 'gtfs:tokachi-city'
    require(review['termsUrl'] == GRANT_URL and review['observedResponseSha256'] == grant_hash
            and review['usage'] == 'ROUTE_GUIDANCE' and review['validFrom'] <= date <= review['validTo']
            and review['reviewedAt'] and review['reason'] and request['sourceActionId']
            and request['observedAt'] and request['attribution'], 'GRANT_REVIEW')
    page = grant_raw.decode('utf-8-sig')
    text = html.unescape(re.sub('<[^>]+>', '', page))
    require('乗換案内提供事業者様におかれましてはご自由にお使いいただければと存じます。' in text
            and url in html.unescape(page) and GRANT_URL in page, 'GRANT_CURRENT_ARCHIVE_BINDING')
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        def table(name):
            return list(csv.DictReader(io.StringIO(z.read(name + '.txt').decode('utf-8-sig')))) if name + '.txt' in z.namelist() else []
        def keyed(name, key):
            data = table(name)
            require(len({r[key] for r in data}) == len(data), 'DUPLICATE_NATIVE_ID')
            return {r[key]: r for r in data}
        agencies, stops = keyed('agency', 'agency_id'), keyed('stops', 'stop_id')
        trips, routes, calendars = keyed('trips', 'trip_id'), keyed('routes', 'route_id'), keyed('calendar', 'service_id')
        feed, exceptions, times = table('feed_info'), table('calendar_dates'), table('stop_times')
    require(len(feed) == 1 and len(agencies) == 1, 'FEED_IDENTITY')
    feed, agency = feed[0], next(iter(agencies.values()))
    require(agency['agency_name'].strip() == '十勝バス株式会社' and agency['agency_url'].rstrip('/') == 'https://www.tokachibus.jp', 'PROVIDER_IDENTITY')
    require(feed['feed_start_date'] <= date <= feed['feed_end_date'], 'FEED_EXPIRED')
    weekday = datetime.strptime(date, '%Y%m%d').strftime('%A').lower()
    used, selected_routes, parents, sections, native_hashes = set(), {}, {}, [], {}
    for spec in request['trips']:
        trip = trips[spec['sourceTripId']]
        route = routes[trip['route_id']]
        require(route['agency_id'] == agency['agency_id'] and route['route_type'] == '3'
                and route['route_id'] == spec['routeId'] and route['route_long_name'] == spec['publishedLineName'], 'TRIP_IDENTITY')
        calls = sorted([c for c in times if c['trip_id'] == trip['trip_id']], key=lambda c: int(c['stop_sequence']))
        require(len(calls) >= 2 and len({int(c['stop_sequence']) for c in calls}) == len(calls)
                and all(int(c['stop_sequence']) >= 0 for c in calls), 'CALL_SEQUENCE')
        cal = calendars.get(trip['service_id'])
        overrides = [e for e in exceptions if e['service_id'] == trip['service_id'] and e['date'] == date]
        require(len(overrides) <= 1 and all(e['exception_type'] in ('1', '2') for e in overrides), 'CALENDAR_EXCEPTIONS')
        active = bool(cal and cal['start_date'] <= date <= cal['end_date'] and cal[weekday] == '1')
        if overrides:
            active = overrides[0]['exception_type'] == '1'
        require(active, 'INACTIVE_SERVICE')
        native_hashes[trip['trip_id']] = sha(calls)
        direction = trip.get('direction_id') or 'ordered:' + calls[0]['stop_id'] + '>' + calls[-1]['stop_id']
        section = spec['section']
        require(section['fullParentCallsSha256'] == sha(calls) and section['expectedDirectionId'] == direction
                and type(section['fromStopSequence']) is int and type(section['toStopSequence']) is int, 'SECTION_REVIEW')
        indexes = {int(c['stop_sequence']): i for i, c in enumerate(calls)}
        start, end = indexes.get(section['fromStopSequence']), indexes.get(section['toStopSequence'])
        require(start is not None and end is not None and start < end, 'SECTION_ENDPOINTS')
        selected = calls[start:end + 1]
        require([c['stop_id'] for c in selected] == spec['reviewedStopIds'], 'NONCONTIGUOUS_SECTION')
        # Keep explicit native restrictions. Unknown/conditional values are not
        # generalized, including in the full-parent static proof.
        require(all((c.get(k) or '0') in ('0', '1') for c in calls for k in ('pickup_type', 'drop_off_type')), 'CONDITIONAL_RESTRICTIONS')
        static_calls = [project(c, CALL_FIELDS) for c in calls]
        for c in static_calls:
            c['pickup_type'], c['drop_off_type'] = c['pickup_type'] or '0', c['drop_off_type'] or '0'
        parents[trip['trip_id']] = dict(trip=project(trip, TRIP_FIELDS), calls=static_calls,
            calendar=project(cal, CAL_FIELDS) if cal else None,
            exceptions=[project(e, ('service_id', 'date', 'exception_type')) for e in overrides], serviceDate=date)
        sections.append(dict(tripId=trip['trip_id'], fromStopSequence=section['fromStopSequence'], toStopSequence=section['toStopSequence'],
            reviewedStopIds=spec['reviewedStopIds'], expectedDirectionId=direction, parentStaticCallsSha256=sha(static_calls)))
        used.update(c['stop_id'] for c in selected)
        selected_routes[route['route_id']] = project(route, ('route_id', 'agency_id', 'route_long_name', 'route_type'))
    require(sections and len({(s['tripId'], s['fromStopSequence'], s['toStopSequence']) for s in sections}) == len(sections), 'DUPLICATE_SECTION')
    selected_stops = [project(stops[s], STOP_FIELDS) for s in sorted(used)]
    require(all(s['location_type'] in ('', '0') and 20 <= float(s['stop_lat']) <= 46 and 122 <= float(s['stop_lon']) <= 154 for s in selected_stops), 'STOP_IDENTITY')
    projection = dict(serviceDate=date, stops=selected_stops, routes=list(selected_routes.values()), parents=list(parents.values()), sections=sections)
    source = dict(sourceId=source_id, url=url, datasetUrl=GRANT_URL, contentSha256=digest, observedAt=request['observedAt'],
        validFrom=feed['feed_start_date'], validTo=feed['feed_end_date'], feedVersion=feed['feed_version'],
        agency=project(agency, ('agency_id', 'agency_name')), attribution=request['attribution'],
        license='Tokachi Bus static GTFS route-guidance use grant', rightsClass='DERIVED_STATIC_FACTS_ALLOWED',
        rightsDecision='PASS_OPERATOR_ROUTE_GUIDANCE_STATIC_FACTS', rawPayloadRetained=False, persistenceAllowed=False,
        rawPersistenceAllowed=False, rawRedistributionAllowed=False, derivedDataAllowed=True, derivedPersistenceAllowed=True,
        redistributionAllowed=True, derivedRedistributionScope='ROUTE_GUIDANCE_MINIMAL_STATIC_FACTS',
        rebuildBasis='REVIEWED_DERIVED_STATIC_INPUT', rawByteReproductionAvailable=False,
        derivedProjectionSha256=sha(projection),
        rightsReview=dict(scope='MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS', termsUrl=GRANT_URL,
            observedResponseSha256=grant_hash, reviewedAt=review['reviewedAt'], validFrom=review['validFrom'], validTo=review['validTo'],
            reason=review['reason'], usage='ROUTE_GUIDANCE', sourceUrl=url, sourceSha256=digest))
    payload = dict(schemaVersion=1, kind=SCHEMA, source=source, projection=projection)
    audit = dict(schemaVersion=1, method='NATIVE_GTFS_MINIMAL_PROJECTION_CHECKED', extractorSha256=sha(Path(__file__).read_bytes()),
        nativeArchiveSha256=digest, grantResponseSha256=grant_hash, derivedInputSha256=sha(payload),
        parentNativeCallsSha256=native_hashes, reviewedAt=review['reviewedAt'], sourceActionId=request['sourceActionId'])
    return dict(payload, nativeAudit=audit)


def verify(raw, grant_raw, request, document):
    expected = extract(raw, grant_raw, request)
    require(canonical(expected) == canonical(document), 'NATIVE_PROJECTION_MISMATCH')
    return expected['nativeAudit']


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('request', type=Path)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--grant-page', type=Path, required=True)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--verify-input', type=Path)
    args = parser.parse_args()
    request = json.loads(args.request.read_text(encoding='utf8'))
    if args.verify_input:
        audit = verify(args.archive.read_bytes(), args.grant_page.read_bytes(), request, json.loads(args.verify_input.read_text(encoding='utf8')))
        print(json.dumps(dict(status='NATIVE_MINIMAL_PROJECTION_VERIFIED', nativeAuditSha256=sha(audit))))
        raise SystemExit(0)
    if not args.output:
        parser.error('--output or --verify-input is required')
    document = extract(args.archive.read_bytes(), args.grant_page.read_bytes(), request)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(document, ensure_ascii=False, sort_keys=True, indent=2) + '\n', encoding='utf8', newline='\n')
    print(json.dumps(dict(derivedInputSha256=document['nativeAudit']['derivedInputSha256'], nativeAuditSha256=sha(document['nativeAudit']), packageSha256=sha(document), rebuildBasis='REVIEWED_DERIVED_STATIC_INPUT', rawByteReproductionAvailable=False)))
