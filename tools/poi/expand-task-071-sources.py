#!/usr/bin/env python3
"""TASK-071 source expansion: retrieve auditable discovery and page text without scoring.

This tool only creates TASK-071 sidecars.  It deliberately never changes the
candidate registry, Master Codes, upstream pending ledger, or editorial truth.
Search results are discovery leads; a URL is evidence only after an explicit,
target-scoped editorial review records it in the candidate disposition.
"""
import argparse, hashlib, html, importlib.util, json, re, shutil, sys, time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, quote_plus, unquote, urlparse

import requests

ROOT = Path(__file__).resolve().parents[2]
PHASE_ROOT = ROOT / 'data/poi/full/manifests/task-071'
PENDING_ROOT = ROOT / 'data/poi/full/reviews/remaining-v1/pending'
OUT = ROOT / 'data/poi/full/reviews/task-071'
QA = ROOT / 'docs/qa/TASK-071-B/batches'
DEFAULT_CACHE = ROOT.parent.parent / 'outputs/task-071-20260920/source-cache'
UA = 'TravelAssist-Task071-Evidence/1.0 (+https://github.com/kanzakimy0/TravelAssist)'

sha = lambda data: hashlib.sha256(data).hexdigest()
def utcnow(): return datetime.now(timezone.utc).isoformat()
def encode(obj): return (json.dumps(obj, ensure_ascii=False, indent=2) + '\n').encode()
def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_bytes(data)
    temp.replace(path)
def read_json(path): return json.loads(path.read_text(encoding='utf-8'))
def read_pending():
    rows = {}
    for path in sorted(PENDING_ROOT.glob('R-*.jsonl')):
        for line in path.read_text(encoding='utf-8').splitlines():
            if line.strip():
                row = json.loads(line); rows[row['candidateKey']] = row
    assert len(rows) == 10097
    return rows

def load_fetcher():
    source = ROOT / 'tools/poi/acquire-remaining-evidence.py'
    spec = importlib.util.spec_from_file_location('task071_shared_fetcher', source)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module.Fetcher

class LinkParser(HTMLParser):
    def __init__(self): super().__init__(convert_charrefs=True); self.links=[]; self.current=None
    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            href = dict(attrs).get('href')
            if href: self.current = [href, []]
    def handle_data(self, data):
        if self.current: self.current[1].append(data)
    def handle_endtag(self, tag):
        if tag == 'a' and self.current:
            href, chunks = self.current; text = ' '.join(''.join(chunks).split())
            self.links.append((href, text)); self.current = None

def normal_url(href):
    href = html.unescape(href)
    if href.startswith('//'): href = 'https:' + href
    p = urlparse(href)
    if p.netloc.endswith('duckduckgo.com') and p.path.startswith('/l/'):
        target = parse_qs(p.query).get('uddg', [''])[0]
        return unquote(target)
    if p.netloc.endswith('bing.com') and p.path == '/ck/a':
        return ''
    return href if p.scheme in ('http', 'https') and p.hostname else ''

def source_kind(url):
    host = (urlparse(url).hostname or '').lower()
    if any(x in host for x in ('instagram.com', 'x.com', 'twitter.com', 'facebook.com', 'youtube.com')):
        return 'OFFICIAL_SNS_OWNERSHIP_UNVERIFIED'
    if host.endswith('.go.jp') or '.lg.jp' in host or host.startswith('www.pref.'):
        return 'GOVERNMENT_OR_PUBLIC_BODY_CANDIDATE'
    if any(x in host for x in ('wikipedia.org', 'wikidata.org', 'tripadvisor.', 'jalan.net', 'rakuten.co.jp')):
        return 'SECONDARY_DISCOVERY_ONLY'
    return 'OFFICIAL_OR_OPERATOR_OWNERSHIP_UNVERIFIED'

def is_openable(url):
    kind = source_kind(url)
    return kind not in {'SECONDARY_DISCOVERY_ONLY'}

def query_families(row):
    name = row['name']; locations = ' '.join(row.get('prefectures') or [])
    return [
        ('canonical_official', f'{name} {locations} 公式'),
        ('government_tourism', f'{name} {locations} 観光 site:go.jp OR site:lg.jp'),
        ('operator_access', f'{name} {locations} アクセス 運営 公式'),
        ('official_sns', f'{name} {locations} 公式 Instagram X Facebook YouTube'),
    ]

def search_one(cache, candidate_key, family, query):
    key = sha(('ddg-html-v1\0' + query).encode())
    record = cache / 'search-records' / f'{key}.json'
    raw = cache / 'search-raw' / f'{key}.html'
    if record.exists() and raw.exists():
        try:
            data = read_json(record)
            if data.get('query') == query and data.get('rawSha256') == sha(raw.read_bytes()): return data
        except Exception: pass
    start = utcnow(); status = 'FETCH_ERROR'; body = b''; error = None
    try:
        response = requests.get('https://html.duckduckgo.com/html/?q=' + quote_plus(query), headers={'User-Agent': UA}, timeout=(10, 30))
        body = response.content; status = 'OK' if response.status_code == 200 else 'HTTP_UNAVAILABLE'
        http_status = response.status_code
    except Exception as exc:
        http_status = None; error = type(exc).__name__
    atomic(raw, body)
    parser = LinkParser(); parser.feed(body.decode('utf-8', 'replace'))
    leads=[]; seen=set()
    for href, title in parser.links:
        url = normal_url(href)
        if not url or url in seen: continue
        seen.add(url)
        leads.append({'url':url, 'title':title, 'sourceClassification':source_kind(url), 'searchResultNotEvidence':True})
        if len(leads) >= 12: break
    data = {'schemaVersion':'task-071-search-attempt-v1','candidateKey':candidate_key,'family':family,'query':query,'provider':'duckduckgo-html','startedAt':start,'completedAt':utcnow(),'status':status,'httpStatus':http_status,'error':error,'rawPath':str(raw),'rawSha256':sha(body),'rawBytes':len(body),'leads':leads}
    atomic(record, encode(data)); time.sleep(.25); return data

def batch_manifest(batch_id):
    for path in sorted(PHASE_ROOT.glob('phase-*.json')):
        manifest = read_json(path)
        for batch in manifest['batches']:
            if batch['batchId'] == batch_id: return manifest, batch
    raise ValueError('UNKNOWN_BATCH')

def integrity(manifest):
    for rel, expected in manifest['upstream']['protectedIdentityChecksums'].items():
        actual = sha((ROOT / rel).read_bytes())
        if actual != expected: raise RuntimeError('PROTECTED_IDENTITY_DRIFT ' + rel)

def page_key(url): return sha(url.encode())
def run(args):
    manifest, batch = batch_manifest(args.batch)
    integrity(manifest)
    pending = read_pending(); keys = batch['candidateKeys']
    assert keys == sorted(keys) and len(keys) == batch['count'] and len(set(keys)) == len(keys)
    rows = [pending[key] for key in keys]
    if any(row['reasonCode'] != manifest['reasonCode'] for row in rows): raise RuntimeError('PHASE_MEMBERSHIP_DRIFT')
    cache = Path(args.cache).resolve(); cache.mkdir(parents=True, exist_ok=True)
    started = utcnow(); input_checksum = sha(encode({'manifest':sha((PHASE_ROOT / f"phase-{manifest['phase']}.json").read_bytes()), 'batch':batch, 'candidateInputs':[{'candidateKey':r['candidateKey'],'identityInputChecksum':r.get('identityInputChecksum')} for r in rows], 'tool':sha(Path(__file__).read_bytes())}))
    out_path = OUT / f'{args.batch}.jsonl'; qa_path = QA / f'{args.batch}.json'; checkpoint_path = PHASE_ROOT / 'checkpoints' / f'{args.batch}.json'
    if args.resume and checkpoint_path.exists() and out_path.exists() and qa_path.exists():
        checkpoint = read_json(checkpoint_path)
        if checkpoint.get('inputChecksum') == input_checksum and checkpoint.get('status') == 'DISCOVERY_QA_PASS_NOT_CERTIFIED' and checkpoint.get('outputs'):
            good = all((ROOT / item['path']).is_file() and sha((ROOT / item['path']).read_bytes()) == item['sha256'] for item in checkpoint['outputs'])
            if good:
                print(json.dumps({'batchId':args.batch,'status':'SKIPPED_IDENTICAL_DISCOVERY_CHECKPOINT'},ensure_ascii=False)); return
    searches=[]
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(search_one, cache, row['candidateKey'], family, query) for row in rows for family, query in query_families(row)]
        for future in as_completed(futures): searches.append(future.result())
    by_key = {key: [] for key in keys}
    for search in searches: by_key[search['candidateKey']].append(search)
    Fetcher = load_fetcher(); fetcher = Fetcher(cache / 'pages')
    page_targets = {}
    for key in keys:
        domains=set()
        for search in sorted(by_key[key], key=lambda x:x['family']):
            for lead in search['leads']:
                url=lead['url']; domain=(urlparse(url).hostname or '').lower()
                if not is_openable(url) or domain in domains: continue
                domains.add(domain); page_targets.setdefault(url, lead)
                if len(domains) >= 3: break
            if len(domains) >= 3: break
    page_records={}
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures={pool.submit(fetcher.fetch, url):url for url in page_targets}
        for future in as_completed(futures):
            url=futures[future]
            try: page_records[url]=future.result()
            except Exception as exc: page_records[url]={'url':url,'status':'FETCH_ERROR','errorCode':type(exc).__name__,'completedAt':utcnow()}
    results=[]
    for row in rows:
        key=row['candidateKey']; searched=sorted(by_key[key], key=lambda x:x['family'])
        leads=[]; source_pages=[]; seen=set()
        for search in searched:
            for lead in search['leads']:
                if lead['url'] in seen: continue
                seen.add(lead['url']); leads.append(lead)
                record=page_records.get(lead['url'])
                if record:
                    source_pages.append({'url':lead['url'],'sourceTierCandidate':lead['sourceClassification'],'fetch':record,'fullTextReadByAutomation':False,'acceptedAsEvidence':False,'rejectionReason':'Full target-scoped editorial reading and ownership/identity assessment remain required; automation cannot infer evidence from a result or raw page.'})
        eligible=[p for p in source_pages if p['fetch'].get('status')=='FETCHED_UNREVIEWED']
        result={'schemaVersion':'task-071-candidate-discovery-v1','candidateKey':key,'batchId':args.batch,'phase':manifest['phase'],'reasonCode':row['reasonCode'],'inputIdentityChecksum':row.get('identityInputChecksum'),'identityHoldPreserved':bool(row.get('identityHold')),'queryFamilies':[{'family':s['family'],'query':s['query'],'status':s['status'],'rawSha256':s['rawSha256'],'rawPath':s['rawPath'],'leadCount':len(s['leads'])} for s in searched],'discoveredLeads':leads,'openedSources':source_pages,'acceptedEvidence':[],'newFeatures':[],'visitProfile':None,'accessAnchor':None,'disposition':'TARGET_CONTENT_EDITORIAL_REVIEW_REQUIRED' if eligible else 'SOURCE_FAMILY_SEARCHED_EVIDENCE_INSUFFICIENT','remainingNullReason':'No feature, Visit Profile, Access Anchor, or identity change is accepted from snippets or automated retrieval. Each retained null awaits target-scoped editorial reading of the archived pages.','identityDisposition':'IDENTITY_HOLD_PRESERVED' if row.get('identityHold') else 'IDENTITY_UNRESOLVED_PENDING_FULL_TEXT_REVIEW','reviewQueueReason':'Automated discovery and raw/text archiving completed. Explicit source reading, target-boundary confirmation, and field-level editorial assessment are required before certification.'}
        results.append(result)
    if [r['candidateKey'] for r in results] != keys: raise RuntimeError('OUTPUT_ORDER_DRIFT')
    content=''.join(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n' for r in results).encode()
    source_files=sorted(cache.rglob('*'))
    source_digest=sha(''.join(f'{p.relative_to(cache).as_posix()}:{sha(p.read_bytes())}\n' for p in source_files if p.is_file()).encode())
    opened=Counter(p['sourceTierCandidate'] for r in results for p in r['openedSources'])
    qa={'schemaVersion':'task-071-discovery-qa-v1','status':'DISCOVERY_QA_PASS_NOT_CERTIFIED','batchId':args.batch,'phase':manifest['phase'],'reasonCode':manifest['reasonCode'],'candidateCount':len(results),'reviewedCandidateCount':0,'sourceQueryCandidateCount':len(results),'totalQueryCount':len(searches),'officialTargetPagesOpened':opened['OFFICIAL_OR_OPERATOR_OWNERSHIP_UNVERIFIED'],'governmentTourismCulturalPagesOpened':opened['GOVERNMENT_OR_PUBLIC_BODY_CANDIDATE'],'officialOperatorPagesOpened':0,'officialSNSAccountsOpened':0,'officialSNSPostsOpened':0,'secondaryPagesOpened':opened['SECONDARY_DISCOVERY_ONLY'],'fullTextReviewedCount':0,'identityResolvedCount':0,'conflictResolvedCount':0,'identityStillUnresolvedCount':len(results),'candidatesGainingFeature':0,'newNonNullFeatureCount':0,'provenanceCount':0,'locatorHashValidationCount':sum(1 for r in results for p in r['openedSources'] if p['fetch'].get('textSha256')),'visitProfileAdded':0,'accessAnchorAdded':0,'accessLinksAdded':0,'rejectedEvidenceCount':sum(len(r['openedSources']) for r in results),'reviewErrorQueueCount':len(results),'candidateMembershipExact':True,'candidateIdentityIntegrity':True,'registryMasterCodeChanges':0,'snsEvidenceAccepted':False,'noDefaultScores':True,'inputChecksum':input_checksum,'sourceArchiveChecksum':source_digest,'outputChecksum':sha(content),'registryChecksumBefore':manifest['upstream']['protectedIdentityChecksums'].get('src/shared/data/master-code-registry.v1.json'),'registryChecksumAfter':manifest['upstream']['protectedIdentityChecksums'].get('src/shared/data/master-code-registry.v1.json'),'candidateIdentityChecksumBefore':manifest['upstream']['protectedIdentityChecksums'].get('data/poi/full/registry/combined-candidates.v1.jsonl'),'candidateIdentityChecksumAfter':manifest['upstream']['protectedIdentityChecksums'].get('data/poi/full/registry/combined-candidates.v1.jsonl'),'startedAt':started,'completedAt':utcnow(),'cachePath':str(cache)}
    atomic(out_path,content); atomic(qa_path,encode(qa))
    checkpoint={'schemaVersion':'task-071-discovery-checkpoint-v1','status':'DISCOVERY_QA_PASS_NOT_CERTIFIED','batchId':args.batch,'phase':manifest['phase'],'inputChecksum':input_checksum,'candidateKeys':keys,'outputs':[{'path':out_path.relative_to(ROOT).as_posix(),'sha256':sha(out_path.read_bytes())},{'path':qa_path.relative_to(ROOT).as_posix(),'sha256':sha(qa_path.read_bytes())}],'sourceArchiveChecksum':source_digest,'startedAt':started,'completedAt':utcnow(),'receiptWrittenLast':True,'certificationBlockedBy':'Explicit target-scoped editorial review has not occurred; no automated source or score claim is permitted.'}
    atomic(checkpoint_path,encode(checkpoint)); print(json.dumps(qa,ensure_ascii=False))

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--batch',required=True); parser.add_argument('--cache',default=str(DEFAULT_CACHE)); parser.add_argument('--resume',action='store_true'); args=parser.parse_args(); run(args)
if __name__ == '__main__': main()
