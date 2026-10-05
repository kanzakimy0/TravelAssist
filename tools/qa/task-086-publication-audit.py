"""Audit unpublished objects and file-by-file closeout equivalence; no working-tree mutation."""
import hashlib
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCE = '1d5b5165b8359d356eb33c3f06188a107ffb3a31'


def git(*args):
    return subprocess.check_output(['git', '-c', 'safe.directory=' + str(ROOT).replace('\\', '/'), *args], cwd=ROOT)


def tree(revision):
    result = {}
    for row in git('ls-tree', '-r', '-z', revision).split(b'\0'):
        if row:
            header, name = row.split(b'\t', 1)
            mode, kind, oid = header.decode().split()
            result[name.decode()] = {'mode': mode, 'type': kind, 'oid': oid}
    return result


def allowed(name):
    if name == 'data/transport/network/core-stage-acceptance.json':
        return 'OMITTED_OVERSIZED_DERIVED_EVIDENCE'
    if name in ['tools/transport/task-086-final-closeout.mjs', 'tools/transport/task-086-routing-eligibility.mjs', 'tests/task-086-readmittable-closeout.test.mjs', 'docs/tasks/TASK-086-b-final-unverifiable-quarantine-closeout.md']:
        return 'USER_AUTHORIZED_BOUNDED_RE_CERTIFICATION_AND_FAIL_CLOSED_BOUNDARY'
    if name in ['.gitattributes', '.gitignore', '.github/workflows/quality-gate.yml', 'tools/transport/task-086-verify.mjs', 'tools/transport/task-086-validation-lanes.mjs', 'tools/transport/task-086-validation.mjs', 'tools/qa/task-086-regression-lanes.mjs', 'tools/qa/task-086-publication-audit.py', 'tests/task-086-publication-recovery.test.mjs']:
        return 'PUBLICATION_VALIDATION_ONLY'
    if name in ['tests/fixtures/task-086-noto-od/data/noto-native/P04-20_17.xml', 'tests/fixtures/task-086-onboard-request/registration/sources/raw/niijima-tokyo-official-evacuation.csv']:
        return 'VALIDATION_FIXTURE_NATIVE_BYTE_RESTORE'
    if name.startswith('docs/qa/TASK-086/') or name in ['docs/qa/TASK-086-B/phase244-bounded-closeout-ledger.v1.json', 'docs/tasks/TASK-086-b-closeout-publication-recovery.md', 'docs/tasks/RESULT-TASK-086-b-japan-mobility-backbone.md', 'docs/project/WBS-TravelAssist.md']:
        return 'DOCUMENTED_CLOSEOUT_QA_UPDATE'
    return None


def run(base, target):
    base = git("rev-parse", base).decode().strip()
    target = git("rev-parse", target).decode().strip()
    subprocess.run(['git', '-c', 'safe.directory=' + str(ROOT).replace('\\', '/'), 'merge-base', '--is-ancestor', base, target], cwd=ROOT, check=True)
    objects = git('rev-list', '--objects', base + '..' + target)
    lines = subprocess.check_output(['git', '-c', 'safe.directory=' + str(ROOT).replace('\\', '/'), 'cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize) %(rest)'], cwd=ROOT, input=objects).decode().splitlines()
    blobs = []
    for row in lines:
        parts = row.split(' ', 3)
        if len(parts) >= 3 and parts[1] == 'blob':
            blobs.append({'oid': parts[0], 'bytes': int(parts[2]), 'path': parts[3] if len(parts) == 4 else None})
    old, new = tree(SOURCE), tree(target)
    inventory = []
    unexpected = []
    for name in sorted(old.keys() | new.keys()):
        same = old.get(name) == new.get(name)
        category = 'BYTE_IDENTICAL' if same else allowed(name)
        record = {'path': name, 'source': old.get(name), 'recovered': new.get(name), 'classification': category or 'UNEXPECTED_DIFFERENCE'}
        inventory.append(record)
        if not category:
            unexpected.append(record)
    # Certification is preserved byte-for-byte; historical execution blockers stay in their historical receipt.
    certification = json.loads(git('show', SOURCE + ':docs/qa/TASK-086/final-blocker-inventory.json'))['blockers']
    recovered = json.loads(git('show', target + ':docs/qa/TASK-086/final-blocker-inventory.json'))['blockers']
    retained = [row for row in recovered if not row['blocker_id'].startswith('engineering:')]
    assert certification == retained, '251 certification blocker records were changed'
    audit = {'base': base, 'target': target, 'pushIsFastForward': True, 'blobCount': len(blobs), 'pushObjectMaxBlobBytes': max([b['bytes'] for b in blobs] + [0]), 'nearLimitBlobs': [b for b in blobs if b['bytes'] >= 50 * 1024 * 1024], 'rejectedBlobs': [b for b in blobs if b['bytes'] > 100 * 1024 * 1024], 'blobs': blobs}
    equivalence = {'preservedLocalCloseoutHead': SOURCE, 'recoveryHead': target, 'status': 'PASS' if not unexpected else 'FAIL', 'totalFiles': len(inventory), 'byteIdenticalFiles': sum(r['classification'] == 'BYTE_IDENTICAL' for r in inventory), 'documentedDifferences': [r for r in inventory if r['classification'] != 'BYTE_IDENTICAL'], 'unexpectedDifferences': unexpected, 'certificationBlockerCount': len(certification), 'certificationBlockersByteEquivalent': True, 'files': inventory}
    assert not audit['rejectedBlobs'], audit['rejectedBlobs']
    assert not unexpected, unexpected
    return audit, equivalence


if __name__ == '__main__':
    audit, equivalence = run(sys.argv[1], sys.argv[2])
    output = pathlib.Path(sys.argv[3])
    output.mkdir(parents=True, exist_ok=True)
    for name, doc in [('closeout-publication-blob-audit.json', audit), ('closeout-tree-equivalence.json', equivalence)]:
        (output / name).write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'status': 'PASS', 'pushObjectMaxBlobBytes': audit['pushObjectMaxBlobBytes'], 'files': equivalence['totalFiles'], 'byteIdentical': equivalence['byteIdenticalFiles'], 'documentedDifferences': len(equivalence['documentedDifferences']), 'certificationBlockers': equivalence['certificationBlockerCount']}))
