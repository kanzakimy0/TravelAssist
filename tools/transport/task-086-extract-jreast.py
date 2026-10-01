"""Extract minimal explicit calls from individually reviewed operator table columns.
No timetable payload, clocks, platforms, calendar or page layout is persisted.
Blank shared/coupled cells are never filled from another train's column.
"""
import argparse
import hashlib
import html
import json
import re
import urllib.request
from pathlib import Path


def text(value):
    return html.unescape(re.sub(r'<[^>]*>', '', value)).strip()


def extract(raw, spec):
    page = raw.decode('utf-8')
    expected = spec.get('reviewedTableColumns', 1)
    column = spec.get('reviewedColumnIndex', 0)
    if not 0 <= column < expected:
        raise ValueError('INVALID_REVIEWED_COLUMN')
    metadata = {}
    for row in re.findall(r'<tr class="train">(.*?)</tr>', page, re.S):
        label = re.search(r'<th[^>]*>(.*?)</th>', row, re.S)
        if label:
            metadata[text(label.group(1))] = [text(c) for c in re.findall(r'<td[^>]*>(.*?)</td>', row, re.S)]
    if spec.get('expectedTrainCode'):
        codes = metadata.get('列車番号', [])
        kinds = metadata.get('列車種別', [])
        if len(codes) != expected or codes[column] != spec['expectedTrainCode'] or len(kinds) != expected or kinds[column] != spec['serviceClass']:
            raise ValueError('TRAIN_COLUMN_IDENTITY_MISMATCH')
    else:
        names = metadata.get('列車名', [])
        if len(names) != expected or not re.fullmatch(re.escape(spec['serviceClass']) + r'\s*' + re.escape(spec['serviceNumber']) + r'号', names[column]):
            raise ValueError('TRAIN_IDENTITY_MISMATCH')
    calls = []
    for row in re.findall(r'<tr class="time">(.*?)</tr>', page, re.S):
        name = re.search(r'<th class="time">(.*?)</th>', row, re.S)
        cells = re.findall(r'<td class="time">(.*?)</td>', row, re.S)
        if not name:
            continue
        if len(cells) != expected:
            raise ValueError('TABLE_COLUMNS_REQUIRE_EXPLICIT_REVIEW')
        if re.search(r'\d{1,2}:\d{2}', text(cells[column])):
            calls.append(text(name.group(1)))
    if len(calls) < 2:
        raise ValueError('NO_CONFIRMED_CALL_SEQUENCE')
    label = spec.get('serviceNumber', spec.get('expectedTrainCode'))
    return {**spec, 'kind': 'service', 'callingStations': calls,
            'observedResponseSha256': hashlib.sha256(raw).hexdigest(),
            'locator': f'Actual train table column {column + 1}/{expected}; {spec["serviceClass"]} {label}; explicit call rows only, no blank-cell inheritance',
            'reviewMethod': 'PARSED_ACTUAL_TRAIN_EXPLICIT_COLUMN_CALL_ROWS',
            'serviceState': 'active', 'serviceStateScope': 'PUBLISHED_OCTOBER_2026_SNAPSHOT_NOT_REALTIME'}


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('request', type=Path)
    p.add_argument('--output', required=True, type=Path)
    a = p.parse_args()
    req = json.loads(a.request.read_text(encoding='utf-8-sig'))
    facts = []
    for spec in req.pop('trains'):
        raw = urllib.request.urlopen(spec['sourceUrl'], timeout=30).read()
        facts.append(extract(raw, spec))
    req['facts'] = facts
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(req, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps([{k: f[k] for k in ['factId', 'callingStations', 'observedResponseSha256']} for f in facts], ensure_ascii=False))
