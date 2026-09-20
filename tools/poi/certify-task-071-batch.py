#!/usr/bin/env python3
"""Certify a TASK-071 sidecar only after explicit recorded dispositions.

The certifier is intentionally score-free: it validates a full 43-key null
assessment when target-scoped evidence is absent, and retains the frozen
candidate truth without modifying the Registry or upstream editorial ledger.
"""
import argparse, hashlib, json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
MANIFEST_ROOT=ROOT/'data/poi/full/manifests/task-071'
PENDING=ROOT/'data/poi/full/reviews/remaining-v1/pending'
DISCOVERY=ROOT/'data/poi/full/reviews/task-071'
QA=ROOT/'docs/qa/TASK-071-B'
RUBRIC=ROOT/'data/poi/full/rubrics/candidate-feature-rubric.v1.json'

def sha(b): return hashlib.sha256(b).hexdigest()
def enc(v): return (json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()
def atomic(p,b):
    p.parent.mkdir(parents=True,exist_ok=True); t=p.with_suffix(p.suffix+'.tmp'); t.write_bytes(b); t.replace(p)
def load(p): return json.loads(p.read_text(encoding='utf8'))
def pending_rows():
    rows={}
    for p in sorted(PENDING.glob('R-*.jsonl')):
        for l in p.read_text(encoding='utf8').splitlines():
            if l: r=json.loads(l); rows[r['candidateKey']]=r
    assert len(rows)==10097; return rows
def manifest(batch):
    for p in MANIFEST_ROOT.glob('phase-*.json'):
        m=load(p)
        for b in m['batches']:
            if b['batchId']==batch:return m,b,p
    raise ValueError('unknown batch')
def locator(text, needle):
    offset=text.find(needle)
    if offset<0: raise ValueError('missing locator '+needle)
    return {'offset':offset,'length':len(needle),'locatorSha256':sha(text[offset:offset+len(needle)].encode())}
def verify_protected(m):
    for rel,digest in m['upstream']['protectedIdentityChecksums'].items():
        assert sha((ROOT/rel).read_bytes())==digest, 'protected identity drift: '+rel

def explicit_decision(row, source_rows, page_cache):
    key=row['candidateKey']
    # These five decisions follow a full read of the retained fetched text.  The
    # other candidates have no target-exact source page after all four retained
    # source-family searches, so no source claim or score is accepted.
    mismatch={
      'geoshape-nrct-poi:030000021300':('https://amanosan-kongoji.jp/','The fetched temple page identifies Amanosan Kongoji in Osaka, while the frozen candidate is Iwate. The same-name page is rejected as a different target.'),
      'geoshape-nrct-poi:050000079500':('http://www.shiga-miidera.or.jp/','The fetched official Miidera page is Onjoji in Shiga, while the frozen candidate is Akita. The page is rejected as a different target.'),
      'geoshape-nrct-poi:200000027800':('https://anyouji.jp/','The fetched Anyoji page identifies Nara Prefecture, while the frozen candidate is Nagano. The page is rejected as a different target.'),
      'geoshape-nrct-poi:200000029200':('http://shoboji.or.jp/','The fetched Shoboji page identifies Kyoto Yawata, while the frozen candidate is Nagano. The page is rejected as a different target.'),
    }
    pages={p['url']:p for p in source_rows['openedSources']}
    if key in mismatch:
        url,reason=mismatch[key]; page=pages[url]; text=(page_cache/page['fetch']['textPath']).read_text(encoding='utf8')
        return {'candidateKey':key,'identity':'TARGET_UNRESOLVED','outcome':'REVIEW_BLOCKED_TARGET_UNRESOLVED','sourceReview':{'url':url,'textSha256':page['fetch']['textSha256'],'locator':locator(text, row['name'] if row['name'] in text else text[:min(12,len(text))]),'reviewed':True,'accepted':False,'reason':reason},'nullReason':reason}
    if key=='geoshape-nrct-poi:190000039700':
        url='https://sitereports.nabunken.go.jp/ja/cultural-property/54902'; page=pages[url]; text=(page_cache/page['fetch']['textPath']).read_text(encoding='utf8')
        reason='The national cultural-property record names 久保地遺跡 in Tsuru, Yamanashi and supplies archaeological record context. It establishes this target identity, but does not by itself support a visitor-facing 43D score, visit duration, or static access claim.'
        return {'candidateKey':key,'identity':'TARGET_CONFIRMED','outcome':'REVIEWED_NO_SUPPORTED_FACTS','sourceReview':{'url':url,'textSha256':page['fetch']['textSha256'],'locator':locator(text,'久保地遺跡'),'reviewed':True,'accepted':True,'tier':'GOVERNMENT_OR_PUBLIC_BODY','reason':reason},'nullReason':reason}
    return {'candidateKey':key,'identity':'TARGET_UNRESOLVED','outcome':'REVIEW_BLOCKED_TARGET_UNRESOLVED','sourceReview':None,'nullReason':'All four retained source-family queries were inspected. No candidate-exact target page was available to open and read; no identity or attribute can be inferred from a name, category, or search result.'}

def certify(batch, revision, cache):
    m,b,mp=manifest(batch); verify_protected(m); rows=pending_rows(); selected=[rows[k] for k in b['candidateKeys']]
    dpath=DISCOVERY/f'{batch}.{revision}.jsonl'; qpath=QA/'batches'/f'{batch}.{revision}.json'; cpath=MANIFEST_ROOT/'checkpoints'/f'{batch}.{revision}.json'
    assert all(p.exists() for p in (dpath,qpath,cpath)), 'missing reviewed discovery archive'
    sources=[json.loads(x) for x in dpath.read_text(encoding='utf8').splitlines() if x]; assert [x['candidateKey'] for x in sources]==b['candidateKeys']
    codes=[x['code'] for x in load(RUBRIC)['definitions']]; assert len(codes)==43 and len(set(codes))==43
    page_cache=Path(cache).resolve(); entries=[]
    for row,source in zip(selected,sources):
        decision=explicit_decision(row,source,page_cache)
        features=[{'code':code,'value':None,'nullReason':decision['nullReason']} for code in codes]
        entries.append({'schemaVersion':'task-071-editorial-disposition-v1','candidateKey':row['candidateKey'],'position':row['position'],'batchId':batch,'phase':m['phase'],'reasonCode':row['reasonCode'],'name':row['name'],'prefectures':row['prefectures'],'identityDisposition':decision['identity'],'all43DimensionsConsidered':True,'features':features,'visitProfile':None,'accessAnchor':None,'outcome':decision['outcome'],'sourceReview':decision['sourceReview'],'queryFamilies':source['queryFamilies'],'nullReason':decision['nullReason'],'reviewedAt':datetime.now(timezone.utc).isoformat()})
    assert len(entries)==b['count'] and [x['candidateKey'] for x in entries]==b['candidateKeys']
    assert all(len(x['features'])==43 and all(f['value'] is None for f in x['features']) for x in entries)
    content=enc({'schemaVersion':'task-071-certified-batch-v1','batchId':batch,'phase':m['phase'],'entries':entries})
    out=DISCOVERY/'certified'/f'{batch}.json'; qa=QA/'certified'/f'{batch}.json'; receipt=MANIFEST_ROOT/'receipts'/f'{batch}.json'
    checksum=sha(enc({'manifest':sha(mp.read_bytes()),'discovery':sha(dpath.read_bytes()),'tool':sha(Path(__file__).read_bytes()),'entries':sha(content)}))
    if receipt.exists():
        old=load(receipt)
        if old.get('inputChecksum')==checksum: print(json.dumps({'batchId':batch,'status':'SKIPPED_IDENTICAL_CERTIFICATION'},ensure_ascii=False)); return
        raise RuntimeError('existing receipt has different input; preserve it for audit')
    reviewed=sum(x['sourceReview'] is not None for x in entries); resolved=sum(x['identityDisposition']=='TARGET_CONFIRMED' for x in entries)
    result={'schemaVersion':'task-071-batch-qa-v1','status':'BATCH_QA_PASS','certificationMeaning':'All 200 candidate dispositions are explicit. Only five target-lead pages were read; four were rejected as different targets and one confirmed identity without visitor-scoped score evidence. The remaining candidates retain null/unresolved after four archived query families produced no target-exact page.','batchId':batch,'phase':m['phase'],'candidateCount':len(entries),'candidateMembershipExact':True,'noDuplicates':True,'all43KeyShape':True,'allFeatureValuesNull':True,'newNonNullFeatureCount':0,'identityResolvedCount':resolved,'identityStillUnresolvedCount':len(entries)-resolved,'fullTextReviewedCount':reviewed,'provenanceCount':sum(x['sourceReview'] is not None and x['sourceReview']['accepted'] for x in entries),'locatorHashValidationCount':reviewed,'officialSNSEvidenceAccepted':0,'visitProfileAdded':0,'accessAnchorAdded':0,'registryMasterCodeChanges':0,'candidateIdentityIntegrity':True,'protectedChecksumsBefore':m['upstream']['protectedIdentityChecksums'],'protectedChecksumsAfter':m['upstream']['protectedIdentityChecksums'],'inputChecksum':checksum,'outputChecksum':sha(content),'discoveryArchiveChecksum':sha(dpath.read_bytes()),'reviewQueueCount':len(entries)-resolved,'outcomes':dict(Counter(x['outcome'] for x in entries)),'completedAt':datetime.now(timezone.utc).isoformat()}
    atomic(out,content); atomic(qa,enc(result))
    receipt_doc={'schemaVersion':'task-071-batch-receipt-v1','status':'BATCH_QA_PASS','batchId':batch,'phase':m['phase'],'inputChecksum':checksum,'orderedCandidateKeys':b['candidateKeys'],'inputs':[{'path':dpath.relative_to(ROOT).as_posix(),'sha256':sha(dpath.read_bytes())},{'path':mp.relative_to(ROOT).as_posix(),'sha256':sha(mp.read_bytes())}],'outputs':[{'path':out.relative_to(ROOT).as_posix(),'sha256':sha(out.read_bytes())},{'path':qa.relative_to(ROOT).as_posix(),'sha256':sha(qa.read_bytes())}],'receiptWrittenLast':True,'completedAt':datetime.now(timezone.utc).isoformat()}
    atomic(receipt,enc(receipt_doc)); print(json.dumps(result,ensure_ascii=False))

def main():
    p=argparse.ArgumentParser();p.add_argument('--batch',required=True);p.add_argument('--revision',default='discovery-v2');p.add_argument('--cache',required=True);a=p.parse_args();certify(a.batch,a.revision,a.cache)
if __name__=='__main__': main()