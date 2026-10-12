"""TASK-086 licensed GTFS extraction. No v1 node or edge is imported."""
import argparse
import csv
import hashlib
import io
import json
import shutil
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'data/transport/network/sources'

def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))

def sha(value):
    return hashlib.sha256(value if isinstance(value, bytes) else canonical(value).encode()).hexdigest()

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n', encoding='utf-8', newline='\n')

def extract(feed, archive_path, url, dataset_url, purposes, cross_pack_transfer_pairs=frozenset()):
    raw = archive_path.read_bytes()
    content_hash = sha(raw)
    source_id = 'gtfs:' + feed
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        def table(name):
            return list(csv.DictReader(io.StringIO(z.read(name).decode('utf-8-sig')))) if name in z.namelist() else []
        stops = {r['stop_id']: r for r in table('stops.txt')}
        routes = {r['route_id']: r for r in table('routes.txt')}
        agencies = {r['agency_id']: r for r in table('agency.txt')}
        info = table('feed_info.txt')[0]
        calendars = {r['service_id']: r for r in table('calendar.txt')}
        dates = defaultdict(list)
        for row in table('calendar_dates.txt'):
            dates[row['service_id']].append(row)
        calls = defaultdict(list)
        for row in table('stop_times.txt'):
            calls[row['trip_id']].append(row)
        transfers = table('transfers.txt')
        trips = table('trips.txt')
    evidence = []
    def ev(kind, locator, record):
        eid = source_id + ':' + kind + ':' + sha(record)[:24]
        evidence.append({'evidenceId': eid, 'sourceId': source_id, 'sourceSha256': content_hash, 'locator': locator, 'recordSha256': sha(record), 'record': record})
        return eid
    def anchor(stop_id):
        return source_id + ':stop:' + stop_id
    patterns = {}
    used = set()
    selected_routes = {}
    for trip in trips:
        route = routes[trip['route_id']]
        purpose = purposes.get(trip['route_id']) if purposes else 'island'
        if not purpose:
            continue
        ordered = sorted(calls[trip['trip_id']], key=lambda r: int(r['stop_sequence']))
        if len(ordered) < 2 or len({int(r['stop_sequence']) for r in ordered}) != len(ordered):
            raise ValueError('INVALID_TRIP_SEQUENCE:' + trip['trip_id'])
        if any(r['stop_id'] not in stops for r in ordered):
            raise ValueError('MISSING_STOP_IDENTITY:' + trip['trip_id'])
        service = trip['service_id']
        calendar = calendars.get(service)
        exceptions = dates[service]
        # Service existence within the published future window, not a realtime claim.
        active = (calendar and calendar['end_date'] >= '20261001' and any(calendar[d] == '1' for d in ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])) or any(d['date'] >= '20261001' and d['exception_type'] == '1' for d in exceptions)
        if not active:
            continue
        operator = agencies[route.get('agency_id') or next(iter(agencies))]['agency_name']
        mode = 'ferry' if route['route_type'] == '4' else 'airport_bus' if purpose == 'airport' else 'highway_bus' if purpose == 'highway' else 'local_bus'
        sequence = [{'identityAnchor': anchor(r['stop_id']), 'sequence': int(r['stop_sequence']), 'pickupType': r.get('pickup_type') or '0', 'dropOffType': r.get('drop_off_type') or '0'} for r in ordered]
        direction = trip.get('direction_id') or ('ordered:' + ordered[0]['stop_id'] + '>' + ordered[-1]['stop_id'])
        key = canonical([route['route_id'], direction, sequence])
        if key not in patterns:
            patterns[key] = {'sourcePatternKey': source_id + ':pattern:' + sha(key)[:24], 'lineRef': source_id + ':route:' + route['route_id'], 'operatorRef': operator, 'mode': mode, 'purpose': purpose, 'direction': direction, 'serviceClass': 'not_specified_by_feed', 'serviceClassEvidence': 'Route identity and exact stopping variants preserved; trip_short_name is not interpreted as express/local class', 'sequenceEvidence': 'GTFS_TRIP_STOP_SEQUENCE', 'serviceState': 'active', 'callingNodes': sequence, 'segmentOperators': [operator] * (len(sequence) - 1), 'sourceRefs': [dataset_url, url], 'evidenceRefs': [], 'calendarRecords': {}, 'sourceTripIds': []}
        pattern = patterns[key]
        pattern['sourceTripIds'].append(trip['trip_id'])
        pattern['calendarRecords'][service] = {'calendar': calendar, 'exceptions': exceptions}
        # Keep original calls, including boarding restrictions and sequence numbers.
        ref = ev('trip', 'trips.txt:' + trip['trip_id'] + ';stop_times.txt', {'trip': trip, 'calls': ordered, 'calendar': calendar, 'exceptions': exceptions})
        pattern['evidenceRefs'].append(ref)
        used.update(r['stop_id'] for r in ordered)
        selected_routes[route['route_id']] = {'lineRef': pattern['lineRef'], 'operatorRef': operator, 'name': route['route_long_name'], 'mode': mode, 'purpose': purpose, 'sourceRoute': route, 'evidenceRefs': [ev('route', 'routes.txt:' + route['route_id'], route)], 'sourceRefs': [dataset_url, url]}
    nodes = []
    for stop_id in sorted(used):
        stop = stops[stop_id]
        record = {k: stop.get(k, '') for k in ['stop_id','stop_name','stop_lat','stop_lon','location_type','parent_station','platform_code']}
        refs = [ev('stop', 'stops.txt:' + stop_id, record)]
        relevant = [p for p in patterns.values() if any(c['identityAnchor'] == anchor(stop_id) for c in p['callingNodes'])]
        nodes.append({'identityAnchor': anchor(stop_id), 'canonicalNameJa': stop['stop_name'], 'nodeKind': 'ferry_port' if feed == 'fukuoka-ferry' else 'bus_stop', 'nodeLevel': 'T2', 'latitude': float(stop['stop_lat']), 'longitude': float(stop['stop_lon']), 'operatorRefs': sorted({p['operatorRef'] for p in relevant}), 'lineRefs': sorted({p['lineRef'] for p in relevant}), 'sourceRefs': [dataset_url, url], 'evidenceRefs': refs, 'identityRecord': record, 'origin': 'TASK_086_INDEPENDENT_GTFS', 'hubSemantics': 'GTFS_STOP_POINT_NO_SAME_NAME_COLLAPSE', 'parentHubId': None, 'sourceParentStation': stop.get('parent_station') or None, 'independentReview': {'decision': 'ADMIT_TASK_086_TOPOLOGY', 'recordSha256': sha(record), 'method': 'EXACT_LICENSED_STOP_USED_IN_REAL_TRIP', 'duplicateCheck': 'EXACT_FEED_STOP_ID', 'componentRule': 'Distinct boarding points retained; parent group is not transfer evidence'}})
    transfer_inputs = []
    for t in transfers:
        pair = (t['from_stop_id'], t['to_stop_id'])
        # Preserve explicitly reviewed transfers whose other admitted endpoint is in a separate package.
        cross_pack = pair in cross_pack_transfer_pairs and pair[0] in used and pair[1] in stops
        if (not ({pair[0], pair[1]} <= used or cross_pack)) or pair[0] == pair[1] or t.get('transfer_type') == '3':
            continue
        # Route/trip-specific restrictions cannot be generalized to hub-wide transfer.
        if any(t.get(k) for k in ['from_route_id','to_route_id','from_trip_id','to_trip_id']):
            continue
        ref = ev('transfer', 'transfers.txt:' + t['from_stop_id'] + '>' + t['to_stop_id'], t)
        transfer_inputs.append({'transferId': source_id + ':transfer:' + sha(t)[:24], 'fromAnchor': anchor(t['from_stop_id']), 'toAnchor': anchor(t['to_stop_id']), 'hubRef': source_id + ':explicit-transfer:' + sha(sorted([t['from_stop_id'],t['to_stop_id']]))[:16], 'directed': True, 'evidenceKind': 'GTFS_TRANSFER', 'evidenceRefs': [ref], 'sourceRefs': [dataset_url, url], 'sourceTransfer': t})
    source = {'sourceId': source_id, 'url': url, 'datasetUrl': dataset_url, 'observedAt': '2026-10-01', 'contentSha256': content_hash, 'license': 'CC BY 4.0', 'rightsDecision': 'PASS_CC_BY_4_0_ATTRIBUTION', 'persistenceAllowed': True, 'derivedDataAllowed': True, 'redistributionAllowed': True, 'freshnessClass': 'SCHEDULED_SOURCE_SNAPSHOT', 'validFrom': info['feed_start_date'], 'validTo': info['feed_end_date'], 'feedInfo': info, 'agencies': list(agencies.values()), 'attribution': ('福岡市営渡船' if feed == 'fukuoka-ferry' else '長崎県交通局 / 長崎県') + '; CC BY 4.0; TASK-086 derived stop-sequence topology', 'licenseUrl': 'https://creativecommons.org/licenses/by/4.0/', 'retainedArchive': 'sources/raw/' + feed + '.zip', 'publisherIsOperator': info['feed_publisher_name'] in [a['agency_name'] for a in agencies.values()]}
    output = {'source': source, 'nodes': nodes, 'lines': list(selected_routes.values()), 'patterns': [patterns[k] for k in sorted(patterns)], 'transfers': transfer_inputs, 'evidence': list({e['evidenceId']:e for e in evidence}.values()), 'selection': {'totalRoutes':len(routes), 'selectedRouteIds':sorted(selected_routes), 'purposeByRoute':purposes or 'Passenger island ferry routes', 'excludedRouteCount':len(routes)-len(selected_routes)}}
    write(OUT / (feed + '.json'), output)
    (OUT / 'raw').mkdir(parents=True, exist_ok=True)
    if archive_path.resolve() != (OUT / 'raw' / (feed + '.zip')).resolve():
        shutil.copyfile(archive_path, OUT / 'raw' / (feed + '.zip'))
    print(json.dumps({'feed':feed,'sha256':content_hash,'nodes':len(nodes),'patterns':len(patterns),'transfers':len(transfer_inputs)},ensure_ascii=False))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-dir', type=Path, default=OUT / 'raw')
    parser.add_argument('--output', type=Path, default=OUT)
    args = parser.parse_args()
    OUT = args.output
    extract('fukuoka-ferry', args.input_dir / 'fukuoka-ferry.zip', 'https://data.bodik.jp/dataset/9938b52c-e54c-4d92-9975-a98c5f60e727/resource/499f5b3d-093e-4c32-9636-2b91b227e6c2/download/data.zip', 'https://data.bodik.jp/dataset/9938b52c-e54c-4d92-9975-a98c5f60e727', {})
    extract('nagasaki-bus', args.input_dir / 'nagasaki-bus.zip', 'https://data.bodik.jp/dataset/420000_nagasakikeneibus/resource/97f91f64-2124-4bf1-b3e3-422de17fc080/download', 'https://data.bodik.jp/dataset/420000_nagasakikeneibus', {'10':'highway','20':'airport','40':'highway','45':'highway','50':'tourism'}, {('886085_04', '886085_01')})
