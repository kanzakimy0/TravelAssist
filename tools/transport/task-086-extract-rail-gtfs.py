"""Extract reviewed rail GTFS trips; preserve actual calls, calendars and boarding rules."""
import argparse
import csv
from datetime import datetime
import hashlib
import io
import json
from pathlib import Path
import zipfile


def extract(raw, request):
    digest = hashlib.sha256(raw).hexdigest()
    if digest != request['archiveSha256']:
        raise ValueError('RAIL_GTFS_ARCHIVE_HASH_MISMATCH')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        def table(name):
            return list(csv.DictReader(io.StringIO(archive.read(name + '.txt').decode('utf-8-sig')))) if name + '.txt' in archive.namelist() else []
        stops = {r['stop_id']: r for r in table('stops')}
        routes = {r['route_id']: r for r in table('routes')}
        trips = {r['trip_id']: r for r in table('trips')}
        calendars = {r['service_id']: r for r in table('calendar')}
        exceptions = table('calendar_dates')
        times = table('stop_times')
        feed = table('feed_info')[0]
    date = request['serviceDate']
    weekday = datetime.strptime(date, '%Y%m%d').strftime('%A').lower()
    if not feed['feed_start_date'] <= date <= feed['feed_end_date']:
        raise ValueError('RAIL_GTFS_FEED_NOT_CURRENT')
    facts = []
    for spec in request['trips']:
        trip = trips[spec['sourceTripId']]
        route = routes[trip['route_id']]
        if trip['route_id'] != spec['routeId'] or trip['direction_id'] != spec['direction'] or route['route_long_name'] != spec['publishedLineName'] or route['agency_id'] != request['agencyId']:
            raise ValueError('RAIL_GTFS_TRIP_IDENTITY_MISMATCH')
        cal = calendars.get(trip['service_id'])
        active = bool(cal and cal['start_date'] <= date <= cal['end_date'] and cal[weekday] == '1')
        overrides = [e for e in exceptions if e['service_id'] == trip['service_id'] and e['date'] == date]
        if len(overrides) > 1:
            raise ValueError('RAIL_GTFS_AMBIGUOUS_CALENDAR')
        if overrides:
            active = overrides[0]['exception_type'] == '1'
        if not active:
            raise ValueError('RAIL_GTFS_TRIP_NOT_ACTIVE')
        calls = sorted([c for c in times if c['trip_id'] == trip['trip_id']], key=lambda c: int(c['stop_sequence']))
        sequences = [int(c['stop_sequence']) for c in calls]
        if len(calls) < 2 or len(sequences) != len(set(sequences)):
            raise ValueError('RAIL_GTFS_INVALID_CALL_SEQUENCE')
        names = [stops[c['stop_id']]['stop_name'] for c in calls]
        if [names[0], names[-1], len(names)] != spec['reviewedEndpointsAndCount']:
            raise ValueError('RAIL_GTFS_REVIEW_SCOPE_CHANGED')
        restrictions = [{'pickupType': c.get('pickup_type') or '0', 'dropOffType': c.get('drop_off_type') or '0'} for c in calls]
        if any(v not in ('0', '1') for r in restrictions for v in r.values()):
            raise ValueError('RAIL_GTFS_CONDITIONAL_BOARDING_REQUIRES_REVIEW')
        facts.append(dict(
            factId=spec['factId'], kind='service', sourceActionId=request['sourceActionId'], sourceUrl=request['sourceUrl'], observedResponseSha256=digest,
            locator='Licensed GTFS trips.txt trip_id=' + trip['trip_id'] + '; exact ordered stop_times.txt calls and calendar on ' + date + '. ' + request.get('scopeNote', 'Feed headsign beyond the Toei boundary does not add any call. Repeated Tochomae calls remain in their real sequence.'),
            line=spec['line'], operator=spec['operator'], mode=spec['mode'], serviceClass='GTFS exact trip; service class unspecified', direction=trip['direction_id'],
            callingStations=names, callingComponents=[dict(name=n, operator=spec['operator'], line=spec['line'], mode=spec['mode']) for n in names],
            callingRestrictions=restrictions, sourceStopIds=[c['stop_id'] for c in calls], sourceStopSequences=sequences, sourceTripId=trip['trip_id'],
            calendarReview=dict(serviceDate=date, calendar=cal, exceptions=overrides, feedVersion=feed['feed_version'], feedStart=feed['feed_start_date'], feedEnd=feed['feed_end_date']),
            reviewMethod='LICENSED_GTFS_ACTUAL_TRIP_CALENDAR_AND_RESTRICTIONS', serviceState='active', serviceStateScope='PUBLISHED_SERVICE_DATE_NOT_REALTIME',
            sourceAttribution='東京都交通局・公共交通オープンデータ協議会; CC BY 4.0; TravelAssist selected-trip topology extraction and S12 identity mapping; https://creativecommons.org/licenses/by/4.0/'))
    return {k: request[k] for k in ('phaseId', 'strategy', 'completedActionIds')} | {'facts': facts}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('request', type=Path)
    parser.add_argument('--archive', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    result = extract(args.archive.read_bytes(), json.loads(args.request.read_text(encoding='utf-8')))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({'trips': len(result['facts']), 'calls': sum(len(f['callingStations']) for f in result['facts'])}))
