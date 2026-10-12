"""Independently extract airport identity from MLIT C28-21 under its commercial-use terms.
Reference points identify whole airports; they are not terminal entrances or navigation points.
Airport polygons sharing an explicit reference-point relationship are checked for identity
agreement before merging. No proximity, historical operating status, or service inference.
"""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE_SHA256 = '07d69353a34558d7ebd21d4b5f62b685d4f9b9d0e55c6eed6ce05aefcc6b7b35'

def extract(archive, output):
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == ARCHIVE_SHA256
    with zipfile.ZipFile(archive) as z:
        airports = json.loads(z.read('UTF-8/C28-21_Airport.geojson'))['features']
        points = json.loads(z.read('UTF-8/C28-21_AirportReferencePoint.geojson'))['features']
    by_point = {}
    for f in airports:
        p = f['properties']
        key = p['C28_101'].removeprefix('#')
        by_point.setdefault(key, []).append(p)
    rows = []
    for f in points:
        assert f['geometry']['type'] == 'Point'
        key = f['properties']['C28_000']
        parts = by_point[key]
        assert len({(p['C28_005'], p['C28_006'], p['C28_007']) for p in parts}) == 1
        p = parts[0]
        lon, lat = f['geometry']['coordinates']
        rows.append({'referencePointId': key, 'airportName': p['C28_005'],
                     'airportFeatureIds': sorted(p['C28_000'].removeprefix('#') for p in parts),
                     'administrativeAreaCodes': sorted({p['C28_001'] for p in parts}),
                     'establisherClassCode': p['C28_006'], 'managerClassCode': p['C28_007'],
                     'latitude': lat, 'longitude': lon, 'identityAsOf': '2021-12-31',
                     'coordinateScope': 'AIRPORT_REFERENCE_POINT_NOT_TERMINAL_OR_PRECISE_NAVIGATION'})
    assert len(rows) == len(by_point) == len({r['referencePointId'] for r in rows})
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(''.join(json.dumps(r, ensure_ascii=False, sort_keys=True, separators=(',', ':'))+'\n'
                             for r in sorted(rows, key=lambda r:r['referencePointId'])), encoding='utf8', newline='\n')
    print(json.dumps({'records':len(rows), 'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', type=Path, default=ROOT/'data/transport/network/sources/raw/mlit-c28-21.zip')
    parser.add_argument('--output', type=Path, default=ROOT/'data/transport/network/research/c28-identities.jsonl')
    args = parser.parse_args()
    extract(args.archive, args.output)
