#!/usr/bin/env python3
"""Create an auditable TASK-071 evidence-reading sidecar from discovery pages.

This remediation tool never alters the frozen candidate registry, Master Code,
upstream pending ledger, or the discovery artifacts.  It reads the retained page
text referenced by a discovery batch and saves per-candidate target-boundary
excerpts with stable hashes.  A candidate becomes review-complete only when a
retained body was read or every recorded source-family attempt is explicitly
unavailable; it never derives a 43D score from a title, snippet, or category.
"""
import argparse, hashlib, importlib.util, json, re, unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = Path(__file__).resolve().parents[2]
MANIFESTS = ROOT / 'data/poi/full/manifests/task-071'
DISCOVERY = ROOT / 'data/poi/full/reviews/task-071'
OUT = DISCOVERY / 'evidence-remediation'
QA = ROOT / 'docs/qa/TASK-071-B/evidence-remediation'
PENDING = ROOT / 'data/poi/full/reviews/remaining-v1/pending'

def sha(value): return hashlib.sha256(value).hexdigest()
def utcnow(): return datetime.now(timezone.utc).isoformat()
def enc(value): return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_bytes(data)
    temp.replace(path)
def load(path): return json.loads(path.read_text(encoding='utf-8'))
def normal(value): return re.sub(r'[\W_]', '', unicodedata.normalize('NFKC', value or '').casefold())
def protected(manifest):
    for rel, digest in manifest['upstream']['protectedIdentityChecksums'].items():
        if sha((ROOT / rel).read_bytes()) != digest:
            raise RuntimeError('PROTECTED_IDENTITY_DRIFT ' + rel)
def pending_rows():
    rows = {}
    for path in sorted(PENDING.glob('R-*.jsonl')):
        for line in path.read_text(encoding='utf-8').splitlines():
            if line: rows[json.loads(line)['candidateKey']] = json.loads(line)
    if len(rows) != 10097: raise RuntimeError('PENDING_POPULATION_DRIFT')
    return rows
def find_batch(batch_id):
    for path in sorted(MANIFESTS.glob('phase-*.json')):
        manifest = load(path)
        for batch in manifest['batches']:
            if batch['batchId'] == batch_id: return manifest, batch
    raise ValueError('UNKNOWN_BATCH')
def locator(text, name):
    pos = normal(text).find(normal(name))
    if pos < 0: return None
    # Use an exact raw-text occurrence where possible.  The normalized position
    # is only a guard against Unicode-width differences.
    raw = text.find(name)
    if raw < 0: return None
    start, end = max(0, raw - 500), min(len(text), raw + len(name) + 900)
    excerpt = text[start:end]
    return {'start': start, 'end': end, 'text': excerpt, 'locatorSha256': sha(excerpt.encode('utf-8'))}
def tier(url):
    host = (urlparse(url).hostname or '').lower()
    if host.endswith('.go.jp') or '.lg.jp' in host or host.startswith('www.pref.'):
        return 'GOVERNMENT_OR_PUBLIC_BODY'
    if any(x in host for x in ('instagram.com','x.com','twitter.com','facebook.com','youtube.com')):
        return 'SNS_OWNERSHIP_UNVERIFIED'
    return 'OFFICIAL_OR_OPERATOR_OWNERSHIP_UNVERIFIED'
def body_path(cache_pages, fetch):
    relative = fetch.get('textPath')
    return cache_pages / relative if relative else None
def load_fetcher():
    source = ROOT / 'tools/poi/acquire-remaining-evidence.py'
    spec = importlib.util.spec_from_file_location('task071_remediation_fetcher', source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.Fetcher
def candidate_sources(prior, fetcher):
    """Reuse discovery leads, adding at most three archived page reads per POI."""
    sources = list(prior.get('openedSources', []))
    existing = {s.get('url') for s in sources}
    domains = {(urlparse(s.get('url') or '').hostname or '').lower() for s in sources}
    leads = []
    for lead in prior.get('discoveredLeads', []):
        url = lead.get('url'); host = (urlparse(url or '').hostname or '').lower()
        if not url or url in existing or host in domains: continue
        leads.append((url, lead)); domains.add(host)
        if len(leads) >= 3: break
    if leads:
        with ThreadPoolExecutor(max_workers=3) as pool:
            futures = {pool.submit(fetcher.fetch, url): (url, lead) for url, lead in leads}
            for future in as_completed(futures):
                url, lead = futures[future]
                try: fetch = future.result()
                except Exception as exc: fetch = {'url': url, 'status': 'FETCH_ERROR', 'errorCode': type(exc).__name__}
                sources.append({'url': url, 'sourceTierCandidate': lead.get('sourceClassification'), 'fetch': fetch, 'discoveryLead': True})
    return sources
def run(args):
    manifest, batch = find_batch(args.batch)
    protected(manifest)
    rows = pending_rows()
    keys = batch['candidateKeys']
    if keys != sorted(keys) or len(keys) != batch['count'] or len(set(keys)) != len(keys):
        raise RuntimeError('BATCH_MEMBERSHIP_DRIFT')
    discovery_path = DISCOVERY / f'{args.batch}.discovery-v2.jsonl'
    if not discovery_path.is_file(): raise RuntimeError('DISCOVERY_INVENTORY_MISSING')
    discovery = {r['candidateKey']: r for r in (json.loads(x) for x in discovery_path.read_text(encoding='utf-8').splitlines() if x)}
    if list(discovery) != keys: raise RuntimeError('DISCOVERY_ORDER_DRIFT')
    cache_pages = Path(args.cache).resolve()
    started = utcnow()
    input_checksum = sha(enc({'batch': batch, 'manifest': sha((MANIFESTS / f"phase-{manifest['phase']}.json").read_bytes()), 'discovery': sha(discovery_path.read_bytes()), 'tool': sha(Path(__file__).read_bytes())}))
    out_path = OUT / f'{args.batch}.{args.revision}.jsonl'
    qa_path = QA / f'{args.batch}.{args.revision}.json'
    checkpoint_path = MANIFESTS / 'evidence-checkpoints' / f'{args.batch}.{args.revision}.json'
    if args.resume and checkpoint_path.exists() and out_path.exists() and qa_path.exists():
        checkpoint = load(checkpoint_path)
        outputs = checkpoint.get('outputs', [])
        if checkpoint.get('status') == 'EVIDENCE_REVIEW_COMPLETE' and checkpoint.get('inputChecksum') == input_checksum and all((ROOT / x['path']).is_file() and sha((ROOT / x['path']).read_bytes()) == x['sha256'] for x in outputs):
            print(json.dumps({'batchId': args.batch, 'status': 'SKIPPED_IDENTICAL_EVIDENCE_CHECKPOINT'}, ensure_ascii=False)); return
    Fetcher = load_fetcher(); fetcher = Fetcher(cache_pages)
    results = []
    for key in keys:
        candidate, prior = rows[key], discovery[key]
        name, prefs = candidate['name'], candidate.get('prefectures') or []
        retained, unreadable, reviewed = [], [], 0
        sources = candidate_sources(prior, fetcher)
        for source in sources:
            fetch = source.get('fetch', {})
            text_path = body_path(cache_pages, fetch)
            if fetch.get('status') != 'FETCHED_UNREVIEWED' or not text_path or not text_path.is_file():
                unreadable.append({'url': source.get('url'), 'reason': fetch.get('status') or 'TEXT_ARCHIVE_MISSING'})
                continue
            text = text_path.read_text(encoding='utf-8', errors='replace')
            reviewed += 1
            hit = locator(text, name)
            pref_hit = any(normal(pref) in normal(text) for pref in prefs if normal(pref))
            if hit:
                retained.append({'url': source['url'], 'sourceTier': tier(source['url']), 'observedAt': fetch.get('retrievedAt'), 'contentSha256': fetch.get('textSha256') or sha(text.encode('utf-8')), 'contentPath': str(text_path), 'targetName': name, 'prefectureMatchedInBody': pref_hit, 'targetContentBoundary': {'start': hit['start'], 'end': hit['end']}, 'retainedNormalizedText': normal(hit['text']), 'retainedText': hit['text'], 'locatorSha256': hit['locatorSha256'], 'acceptedForIdentity': False, 'rejectionReason': 'Text was retained and read, but identity remains conservative unless a government/public-body page contains both the target name and frozen prefecture.'})
        accepted = [x for x in retained if x['sourceTier'] == 'GOVERNMENT_OR_PUBLIC_BODY' and x['prefectureMatchedInBody']]
        if accepted:
            accepted[0]['acceptedForIdentity'] = True
            accepted[0]['rejectionReason'] = None
            identity = 'IDENTITY_RESOLVED_BY_RETAINED_GOVERNMENT_TEXT'
        elif retained:
            identity = 'IDENTITY_RETAINED_TEXT_REQUIRES_CONSERVATIVE_REVIEW'
        else:
            identity = 'IDENTITY_UNRESOLVED_NO_RETAINED_TARGET_TEXT'
        all_unavailable = bool(sources) and not reviewed and len(unreadable) == len(sources)
        completed = bool(reviewed) or all_unavailable
        results.append({'schemaVersion': 'task-071-evidence-review-v1', 'candidateKey': key, 'batchId': args.batch, 'phase': manifest['phase'], 'reasonCode': candidate['reasonCode'], 'discoveryInventoryPath': str(discovery_path.relative_to(ROOT)), 'fullTextReviewed': bool(reviewed), 'fullTextSourcesRead': reviewed, 'sourceReads': [{'url': s.get('url'), 'sourceTierCandidate': s.get('sourceTierCandidate'), 'fetchStatus': s.get('fetch', {}).get('status'), 'contentSha256': s.get('fetch', {}).get('textSha256'), 'contentPath': s.get('fetch', {}).get('textPath')} for s in sources], 'retainedEvidence': retained, 'unreadableSources': unreadable, 'identityDisposition': identity, 'acceptedIdentityEvidence': accepted[:1], 'newFeatures': [], 'visitProfile': None, 'accessAnchor': None, 'provenance': [], 'remainingNullReason': 'No 43D, Visit Profile, or Access Anchor value is accepted without explicit field-level source facts and rubric rationale.', 'reviewState': 'EVIDENCE_REVIEW_COMPLETE' if completed else 'EVIDENCE_REVIEW_NEEDS_ADDITIONAL_SOURCE_SEARCH', 'completionReason': 'Retained source body read and recorded.' if reviewed else ('All recorded source-family requests were unavailable.' if all_unavailable else 'No retained body was available from discovery; an additional source-family search remains required.')})
    if [r['candidateKey'] for r in results] != keys: raise RuntimeError('OUTPUT_ORDER_DRIFT')
    content = ''.join(json.dumps(r, ensure_ascii=False, separators=(',', ':')) + '\n' for r in results).encode()
    complete = all(r['reviewState'] == 'EVIDENCE_REVIEW_COMPLETE' for r in results)
    qa = {'schemaVersion': 'task-071-evidence-review-qa-v1', 'status': 'EVIDENCE_REVIEW_COMPLETE' if complete else 'EVIDENCE_REVIEW_INCOMPLETE', 'batchId': args.batch, 'phase': manifest['phase'], 'candidateCount': len(results), 'actualSearchCount': 0, 'sourcePagesOpened': sum(len(r['sourceReads']) for r in results), 'fullTextReviewedCandidateCount': sum(r['fullTextReviewed'] for r in results), 'retainedTextCount': sum(len(r['retainedEvidence']) for r in results), 'officialSiteCount': sum(1 for r in results for e in r['retainedEvidence'] if e['sourceTier'] == 'OFFICIAL_OR_OPERATOR_OWNERSHIP_UNVERIFIED'), 'governmentTourismCount': sum(1 for r in results for e in r['retainedEvidence'] if e['sourceTier'] == 'GOVERNMENT_OR_PUBLIC_BODY'), 'officialSNSCount': 0, 'identityResolvedCount': sum(r['identityDisposition'] == 'IDENTITY_RESOLVED_BY_RETAINED_GOVERNMENT_TEXT' for r in results), 'identityStillUnresolvedCount': sum(r['identityDisposition'] != 'IDENTITY_RESOLVED_BY_RETAINED_GOVERNMENT_TEXT' for r in results), 'conflictResolvedCount': 0, 'candidatesGainingFeature': 0, 'newNonNullFeatureCount': 0, 'provenanceCount': 0, 'locatorHashCount': sum(len(r['retainedEvidence']) for r in results), 'visitProfileAdded': 0, 'accessAnchorAdded': 0, 'remainingNullCount': len(results) * 43, 'reviewErrorQueueCount': sum(r['reviewState'] != 'EVIDENCE_REVIEW_COMPLETE' for r in results), 'candidateMembershipExact': True, 'registryMasterCodeChanges': 0, 'candidateIdentityIntegrity': True, 'inputChecksum': input_checksum, 'outputChecksum': sha(content), 'startedAt': started, 'completedAt': utcnow()}
    atomic(out_path, content); atomic(qa_path, enc(qa))
    checkpoint = {'schemaVersion': 'task-071-evidence-checkpoint-v1', 'status': qa['status'], 'batchId': args.batch, 'phase': manifest['phase'], 'inputChecksum': input_checksum, 'candidateKeys': keys, 'outputs': [{'path': out_path.relative_to(ROOT).as_posix(), 'sha256': sha(out_path.read_bytes())}, {'path': qa_path.relative_to(ROOT).as_posix(), 'sha256': sha(qa_path.read_bytes())}], 'receiptWrittenLast': True, 'completedAt': qa['completedAt']}
    atomic(checkpoint_path, enc(checkpoint)); print(json.dumps(qa, ensure_ascii=False))
if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--batch', required=True); parser.add_argument('--cache', default=str(ROOT.parent.parent / 'outputs/task-071-20260920/source-cache/pages')); parser.add_argument('--resume', action='store_true'); parser.add_argument('--revision', default='evidence-v2'); run(parser.parse_args())
