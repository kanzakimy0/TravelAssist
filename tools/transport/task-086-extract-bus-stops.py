"""Extract selected exact P11-22 operator-stop identities, never route order.
The source combines same-road, same-name, same-operator directions. Coordinates
therefore represent an operator stop component, not a platform or entrance.
"""
import argparse
import hashlib
import io
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE_SHA256 = 'e74da3736c56ddeb1f47c18d6e5f373f40fa7f3c7d695593029e8ac7a7f790d1'
NS = {'k': 'http://nlftp.mlit.go.jp/ksj/schemas/ksj-app', 'g': 'http://schemas.opengis.net/gml/3.2.1', 'x': 'http://www.w3.org/1999/xlink'}

def extract(archive, selection, output):
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == ARCHIVE_SHA256, 'P11_ARCHIVE_HASH'
    request = json.loads(selection.read_text(encoding='utf8'))
    assert request['dataset'] == 'P11-22' and request['sourceArchiveSha256'] == ARCHIVE_SHA256
    selected = request['stops']
    keys = [s['prefectureCode']+':'+s['gmlFeatureId'] for s in selected]
    assert keys and len(keys) == len(set(keys)), 'P11_SELECTION_DUPLICATE'
    rows = []
    with zipfile.ZipFile(archive) as outer:
        for prefecture in sorted({s['prefectureCode'] for s in selected}):
            assert re.fullmatch(r'0[1-9]|[1-3][0-9]|4[0-7]', prefecture)
            member = 'P11-22_'+prefecture+'_GML.zip'
            with zipfile.ZipFile(io.BytesIO(outer.read(member))) as inner:
                xml_member = 'P11-22_'+prefecture+'_GML/P11-22_'+prefecture+'.xml'
                root = ET.fromstring(inner.read(xml_member))
                points = {}
                for point in root.findall('g:Point', NS):
                    key = point.attrib['{'+NS['g']+'}id']
                    assert key not in points, 'P11_POINT_DUPLICATE'
                    points[key] = [float(v) for v in point.findtext('g:pos', namespaces=NS).split()]
                stops = {}
                for stop in root.findall('k:BusStop', NS):
                    key = stop.attrib['{'+NS['g']+'}id']
                    assert key not in stops, 'P11_FEATURE_DUPLICATE'
                    stops[key] = stop
                for wanted in [s for s in selected if s['prefectureCode'] == prefecture]:
                    key = wanted['gmlFeatureId']
                    stop = stops[key]
                    ref = stop.find('k:loc', NS).attrib['{'+NS['x']+'}href']
                    assert ref.startswith('#') and ref[1:] in points
                    lat, lon = points[ref[1:]]
                    name = stop.findtext('k:bsn', namespaces=NS)
                    operator = stop.findtext('k:boc', namespaces=NS)
                    routes = [{'name': r.findtext('k:brn', namespaces=NS), 'typeCode': r.findtext('k:brt', namespaces=NS)} for r in stop.findall('k:bri', NS)]
                    assert name == wanted['expectedName'] and operator == wanted['expectedOperator'], 'P11_EXACT_SELECTOR_MISMATCH'
                    assert wanted['requiredHistoricalRoute'] in [r['name'] for r in routes], 'P11_ROUTE_CONTEXT_MISMATCH'
                    assert 20 <= lat <= 46 and 122 <= lon <= 154
                    rows.append({'stopRecordId': 'P11-22_'+prefecture+':'+key, 'sourceMember': member, 'xmlMember': xml_member, 'gmlFeatureId': key, 'pointReferenceId': ref[1:], 'stopName': name, 'operator': operator, 'historicalRoutes': routes, 'latitude': lat, 'longitude': lon, 'identityAsOf': '2022-08_APPROXIMATE_SOURCE_DATES_VARY', 'coordinateScope': 'SAME_OPERATOR_ROAD_STOP_REPRESENTATIVE_NOT_PLATFORM_OR_ENTRANCE'})
    assert len(rows) == len(selected)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(''.join(json.dumps(r, ensure_ascii=False, sort_keys=True, separators=(',', ':'))+'\n' for r in sorted(rows, key=lambda r:r['stopRecordId'])), encoding='utf8', newline='\n')
    print(json.dumps({'records':len(rows), 'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}))

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--archive', type=Path, default=ROOT/'data/transport/network/sources/raw/mlit-p11-22.zip')
    p.add_argument('--selection', type=Path, default=ROOT/'data/transport/network/research/p11-selection.json')
    p.add_argument('--output', type=Path, default=ROOT/'data/transport/network/research/p11-identities.jsonl')
    a = p.parse_args()
    extract(a.archive, a.selection, a.output)
