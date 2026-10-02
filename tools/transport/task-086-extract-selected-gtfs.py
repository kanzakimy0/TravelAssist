"""Extract only explicitly reviewed, active bus GTFS trips and their exact stops."""
import argparse
import base64
import sys
import csv
from datetime import datetime
import hashlib
import io
import json
import re
from pathlib import Path
import zipfile


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def sha(value):
    return hashlib.sha256(value if isinstance(value, bytes) else canonical(value).encode()).hexdigest()



def review_cc_by_21(request, digest, feed, agencies):
    e = request.get('licenseEvidence')
    text = lambda v: isinstance(v, str) and bool(v.strip())
    def ref(v):
        return (isinstance(v, dict) and isinstance(v.get('url'), str)
                and v['url'].startswith('https://')
                and isinstance(v.get('observedResponseSha256'), str)
                and re.fullmatch(r'[a-f0-9]{64}', v['observedResponseSha256'])
                and text(v.get('locator')))
    if not isinstance(e, dict):
        raise ValueError('SELECTED_GTFS_CC_BY_21_EVIDENCE_REQUIRED')
    catalog, publisher = e.get('catalogEvidence'), e.get('publisherAuthorityEvidence')
    parties, notice = e.get('attributionParties'), e.get('modificationNotice')
    valid = (ref(e) and ref(catalog) and ref(publisher)
        and e.get('scope') == 'PREFECTURE_COMMISSIONED_GTFS_PORTAL_CC_BY_2_1_JP'
        and e.get('licenseUrl') == 'https://creativecommons.org/licenses/by/2.1/jp/'
        and e.get('reviewedDatasetUrl') == request['datasetUrl'] == catalog['url']
        and e.get('resourceUrl') == request['sourceUrl']
        and e.get('sourceArchiveSha256') == digest
        and text(e.get('publisher')) and e['publisher'] == feed.get('feed_publisher_name')
        and e.get('operator') == request['operator'] == agencies.get(request['agencyId'], {}).get('agency_name')
        and text(e.get('licensor'))
        and isinstance(parties, list) and all(text(v) for v in parties)
        and all(v in parties for v in [e['publisher'], e['operator'], e['licensor']])
        and text(notice) and isinstance(request.get('attribution'), str)
        and all(v in request['attribution'] for v in parties + [notice, e['licenseUrl']])
        and e.get('resourceExceptionReview', {}).get('status') == 'NO_DATASET_SPECIFIC_OVERRIDE_OBSERVED'
        and text(e.get('resourceExceptionReview', {}).get('locator')))
    if not valid:
        raise ValueError('SELECTED_GTFS_CC_BY_21_EVIDENCE_REQUIRED')

def extract(raw, request):
    license_name = request.get('license', 'CC BY 4.0')
    decisions = {'CC BY 2.1 Japan': 'PASS_CC_BY_2_1_JP_ATTRIBUTION', 'CC BY 4.0': 'PASS_CC_BY_4_0_ATTRIBUTION', 'CC0 1.0': 'PASS_CC0_1_0_PUBLIC_DOMAIN', 'Operator unrestricted-use terms': 'PASS_OPERATOR_UNRESTRICTED_USE'}
    if license_name not in decisions:
        raise ValueError('SELECTED_GTFS_LICENSE_UNREVIEWED')
    license_evidence = request.get('licenseEvidence')
    if isinstance(license_evidence, dict) and license_evidence.get('scope') == 'PREFECTURE_COMMISSIONED_GTFS_PORTAL_CC_BY_2_1_JP' and license_name != 'CC BY 2.1 Japan':
        raise ValueError('SELECTED_GTFS_LICENSE_VERSION_MISMATCH')
    if license_name == 'CC0 1.0' and (not isinstance(license_evidence, dict) or license_evidence.get('url') != request['datasetUrl'] or not re.fullmatch(r'[a-f0-9]{64}', license_evidence.get('observedResponseSha256', ''))):
        raise ValueError('SELECTED_GTFS_LICENSE_EVIDENCE_REQUIRED')
    if license_name == 'Operator unrestricted-use terms' and (
        not isinstance(license_evidence, dict)
        or not isinstance(license_evidence.get('url'), str)
        or not license_evidence['url'].startswith('https://')
        or not re.fullmatch(r'[a-f0-9]{64}', license_evidence.get('observedResponseSha256', ''))
        or license_evidence.get('reviewedDatasetUrl') != request['datasetUrl']
        or license_evidence.get('publisher') != request['operator']
        or license_evidence.get('scope') != 'EXPLICIT_OPERATOR_GTFS_UNRESTRICTED_USE'
    ):
        raise ValueError('SELECTED_GTFS_OPERATOR_TERMS_EVIDENCE_REQUIRED')
    digest = sha(raw)
    if digest != request['archiveSha256']:
        raise ValueError('SELECTED_GTFS_ARCHIVE_HASH_MISMATCH')
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        def table(name):
            return list(csv.DictReader(io.StringIO(z.read(name + '.txt').decode('utf-8-sig')))) if name + '.txt' in z.namelist() else []
        def keyed(name, field):
            rows = table(name)
            if len(rows) != len({r[field] for r in rows}):
                raise ValueError('SELECTED_GTFS_DUPLICATE_ID:' + name)
            return {r[field]: r for r in rows}
        stops, routes, trips = keyed('stops', 'stop_id'), keyed('routes', 'route_id'), keyed('trips', 'trip_id')
        agencies, calendars = keyed('agency', 'agency_id'), keyed('calendar', 'service_id')
        feeds, exceptions, times = table('feed_info'), table('calendar_dates'), table('stop_times')
    if len(feeds) != 1:
        raise ValueError('SELECTED_GTFS_FEED_AMBIGUOUS')
    feed, date = feeds[0], request['serviceDate']
    if license_name == 'CC BY 2.1 Japan':
        review_cc_by_21(request, digest, feed, agencies)
    if not feed['feed_start_date'] <= date <= feed['feed_end_date']:
        raise ValueError('SELECTED_GTFS_FEED_NOT_CURRENT')
    if request['mode'] not in ('airport_bus', 'local_bus', 'highway_bus') or not request['attribution']:
        raise ValueError('SELECTED_GTFS_REVIEW_REQUIRED')
    weekday = datetime.strptime(date, '%Y%m%d').strftime('%A').lower()
    source_id = request['sourceId']
    evidence, patterns, selected_routes, used = [], [], {}, set()
    def ev(kind, locator, record):
        eid = source_id + ':' + kind + ':' + sha(record)[:24]
        evidence.append(dict(evidenceId=eid, sourceId=source_id, sourceSha256=digest, locator=locator, record=record, recordSha256=sha(record)))
        return eid
    if len(request['trips']) != len({(r['sourceTripId'], canonical(r.get('section'))) for r in request['trips']}):
        raise ValueError('SELECTED_GTFS_DUPLICATE_TRIP')
    for spec in request['trips']:
        trip = trips[spec['sourceTripId']]
        route = routes[trip['route_id']]
        agency = agencies[route['agency_id']]
        if trip['route_id'] != spec['routeId'] or route['route_type'] != '3' or route['route_long_name'] != spec['publishedLineName'] or agency['agency_id'] != request['agencyId'] or agency['agency_name'] != request['operator']:
            raise ValueError('SELECTED_GTFS_TRIP_IDENTITY_MISMATCH')
        cal = calendars.get(trip['service_id'])
        active = bool(cal and cal['start_date'] <= date <= cal['end_date'] and cal[weekday] == '1')
        overrides = [e for e in exceptions if e['service_id'] == trip['service_id'] and e['date'] == date]
        if len(overrides) > 1 or any(e['exception_type'] not in ('1', '2') for e in overrides):
            raise ValueError('SELECTED_GTFS_AMBIGUOUS_CALENDAR')
        if overrides:
            active = overrides[0]['exception_type'] == '1'
        if not active:
            raise ValueError('SELECTED_GTFS_TRIP_NOT_ACTIVE')
        calls = sorted([c for c in times if c['trip_id'] == trip['trip_id']], key=lambda c: int(c['stop_sequence']))
        if len(calls) < 2 or len(calls) != len({int(c['stop_sequence']) for c in calls}):
            raise ValueError('SELECTED_GTFS_INVALID_CALL_SEQUENCE')
        parent_calls = calls
        direction = trip.get('direction_id') or 'ordered:' + calls[0]['stop_id'] + '>' + calls[-1]['stop_id']
        section = spec.get('section')
        parent_ref = None
        if section is not None:
            if (set(section) != {'fromStopSequence', 'toStopSequence', 'fullParentCallsSha256', 'expectedDirectionId'}
                or type(section['fromStopSequence']) is not int or type(section['toStopSequence']) is not int
                or section['fullParentCallsSha256'] != sha(parent_calls)
                or section['expectedDirectionId'] != direction):
                raise ValueError('SELECTED_GTFS_SECTION_REVIEW_MISMATCH')
            indexes = {int(c['stop_sequence']): i for i, c in enumerate(parent_calls)}
            start, end = indexes.get(section['fromStopSequence']), indexes.get(section['toStopSequence'])
            if start is None or end is None or start >= end:
                raise ValueError('SELECTED_GTFS_SECTION_ENDPOINT_MISMATCH')
            calls = parent_calls[start:end + 1]
            parent_ref = ev('trip', 'trips.txt:' + trip['trip_id'] + ';stop_times.txt', dict(trip=trip, calls=parent_calls, calendar=cal, exceptions=overrides, serviceDate=date))
        if [c['stop_id'] for c in calls] != spec['reviewedStopIds']:
            raise ValueError('SELECTED_GTFS_REVIEW_SCOPE_CHANGED')
        if any((c.get(k) or '0') not in ('0', '1') for c in calls for k in ('pickup_type', 'drop_off_type')):
            raise ValueError('SELECTED_GTFS_CONDITIONAL_BOARDING_REQUIRES_REVIEW')
        line = source_id + ':route:' + route['route_id']
        sequence = [dict(identityAnchor=source_id + ':stop:' + c['stop_id'], sequence=int(c['stop_sequence']), pickupType=c.get('pickup_type') or '0', dropOffType=c.get('drop_off_type') or '0') for c in calls]
        record = dict(trip=trip, calls=calls, calendar=cal, exceptions=overrides, serviceDate=date)
        if section is not None:
            record['section'] = dict(section, parentEvidenceRef=parent_ref)
        ref = ev('section' if section is not None else 'trip', 'trips.txt:' + trip['trip_id'] + ';stop_times.txt', record)
        patterns.append(dict(sourcePatternKey=source_id + ':selected-trip:' + trip['trip_id'], lineRef=line, operatorRef=request['operator'], mode=request['mode'], purpose=request['purpose'], direction=direction, serviceClass='not_specified_by_feed', sequenceEvidence='GTFS_TRIP_STOP_SEQUENCE', serviceState='active', callingNodes=sequence, segmentOperators=[request['operator']] * (len(calls)-1), sourceRefs=[request['datasetUrl'], request['sourceUrl']], evidenceRefs=[ref], sourceTripIds=[trip['trip_id']], calendarRecords={trip['service_id']:dict(calendar=cal, exceptions=overrides, serviceDate=date)}))
        if section is not None:
            patterns[-1]['gtfsSection'] = record['section']
            patterns[-1]['sourcePatternKey'] += ':section:' + str(section['fromStopSequence']) + ':' + str(section['toStopSequence']) + ':' + sha(calls)[:24]
        selected_routes[line] = dict(lineRef=line, operatorRef=request['operator'], name=route['route_long_name'], mode=request['mode'], purpose=request['purpose'], sourceRoute=route, evidenceRefs=[ev('route', 'routes.txt:' + route['route_id'], route)], sourceRefs=[request['datasetUrl'], request['sourceUrl']])
        used.update(c['stop_id'] for c in calls)
    nodes = []
    for stop_id in sorted(used):
        raw_stop = stops[stop_id]
        record = {k:raw_stop.get(k, '') for k in ('stop_id','stop_name','stop_lat','stop_lon','location_type','parent_station','platform_code')}
        if record['location_type'] not in ('', '0') or not (20 <= float(record['stop_lat']) <= 46 and 122 <= float(record['stop_lon']) <= 154):
            raise ValueError('SELECTED_GTFS_INVALID_BOARDING_POINT')
        anchor = source_id + ':stop:' + stop_id
        nodes.append(dict(identityAnchor=anchor, canonicalNameJa=record['stop_name'], nodeKind='bus_stop', nodeLevel='T3', latitude=float(record['stop_lat']), longitude=float(record['stop_lon']), operatorRefs=[request['operator']], lineRefs=sorted({p['lineRef'] for p in patterns if any(c['identityAnchor'] == anchor for c in p['callingNodes'])}), sourceRefs=[request['datasetUrl'],request['sourceUrl']], evidenceRefs=[ev('stop', 'stops.txt:' + stop_id, record)], identityRecord=record, origin='TASK_086_INDEPENDENT_GTFS', hubSemantics='GTFS_STOP_POINT_NO_SAME_NAME_COLLAPSE', parentHubId=None, independentReview=dict(decision='ADMIT_TASK_086_TOPOLOGY', recordSha256=sha(record), method='EXACT_LICENSED_STOP_USED_IN_REVIEWED_ACTIVE_TRIP', sourceArchiveSha256=digest)))
    source = dict(sourceId=source_id,url=request['sourceUrl'],datasetUrl=request['datasetUrl'],observedAt=request['observedAt'],contentSha256=digest,license=license_name,rightsClass='RAW_PERSISTENCE_ALLOWED',rightsDecision=decisions[license_name],persistenceAllowed=True,derivedDataAllowed=True,redistributionAllowed=True,freshnessClass='SCHEDULED_SOURCE_SNAPSHOT',validFrom=feed['feed_start_date'],validTo=feed['feed_end_date'],feedInfo=feed,agencies=[agencies[request['agencyId']]],attribution=request['attribution'],retainedArchive=request['retainedArchive'])
    if license_name in ('CC BY 2.1 Japan', 'CC0 1.0', 'Operator unrestricted-use terms'):
        source['licenseEvidence'] = license_evidence
    reuse = request.get('existingAnchorReuse')
    if reuse is not None or 'baseSource' in request:
        base = request.get('baseSource')
        if (not isinstance(base, dict) or not isinstance(reuse, dict)
            or reuse.get('method') not in ('EXACT_EXISTING_GTFS_ANCHOR_SAME_ARCHIVE', 'EXACT_EXISTING_GTFS_DATASET_SAME_ARCHIVE')
            or reuse.get('sourceDescriptorSha256') != sha(base)
            or any(base.get(k) != source.get(k) for k in ('sourceId','url','datasetUrl','contentSha256','license','rightsDecision','persistenceAllowed','derivedDataAllowed','redistributionAllowed','validFrom','validTo','feedInfo','retainedArchive','attribution','observedAt'))
            or base.get('rightsClass', 'RAW_PERSISTENCE_ALLOWED') != 'RAW_PERSISTENCE_ALLOWED'
            or base.get('agencies') != list(agencies.values())
            or base.get('licenseEvidence') != source.get('licenseEvidence')):
            raise ValueError('SELECTED_GTFS_BASE_SOURCE_MISMATCH')
        if reuse['method'] == 'EXACT_EXISTING_GTFS_DATASET_SAME_ARCHIVE':
            witness = stops.get(reuse.get('existingDatasetStopId'))
            record = {k:witness.get(k, '') for k in ('stop_id','stop_name','stop_lat','stop_lon','location_type','parent_station','platform_code')} if witness else None
            if record is None or reuse.get('existingDatasetRecordSha256') != sha(record):
                raise ValueError('SELECTED_GTFS_EXISTING_DATASET_RECORD_MISMATCH')
        source = base
    return dict(source=source,nodes=nodes,lines=list(selected_routes.values()),patterns=patterns,transfers=[],evidence=list({e['evidenceId']:e for e in evidence}.values()),selection=request)


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('request',type=Path,nargs='?')
    parser.add_argument('--verify-stdin',action='store_true')
    parser.add_argument('--archive',type=Path)
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    if args.verify_stdin:
        payload=json.load(sys.stdin)
        expected=extract(base64.b64decode(payload['archive'], validate=True),payload['package']['selection'])
        if expected != payload['package']:
            raise ValueError('SELECTED_GTFS_NATIVE_PACKAGE_MISMATCH')
        print('SELECTED_GTFS_NATIVE_PACKAGE_VERIFIED')
        sys.exit(0)
    if not args.request or not args.archive or not args.output:
        parser.error('request, --archive and --output are required')
    result=extract(args.archive.read_bytes(),json.loads(args.request.read_text(encoding='utf8')))
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,sort_keys=True,indent=2)+'\n',encoding='utf8',newline='\n')
    print(json.dumps(dict(nodes=len(result['nodes']),patterns=len(result['patterns']),sha256=sha(args.output.read_bytes()))))
