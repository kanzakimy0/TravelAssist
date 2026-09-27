#!/usr/bin/env python3
"""Bounded public-source attempts; never generates scores from categories or keywords."""
import argparse, csv, hashlib, io, ipaddress, json, socket, subprocess, threading, time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, urljoin
from urllib.robotparser import RobotFileParser
import requests

ROOT = Path(__file__).resolve().parents[2]
PREFIX = 'data/poi/full'
PLAN = PREFIX + '/manifests/remaining-v1/population.json'
OUT = PREFIX + '/sources/remaining-v1'
QA = 'docs/qa/POI-REMAINING-10097'
UA = 'TravelAssist-Candidate-Evidence/1.0 (+https://github.com/kanzakimy0/TravelAssist)'
CSV_URL = 'https://geoshape.ex.nii.ac.jp/nrct-poi/dataset/nrct-poi-20250515.csv'
CSV_SHA = 'd4cd6bebb27378a57545829a30249439a7d2a30c68f280e669faef1f32a3d9c6'
sha = lambda b: hashlib.sha256(b).hexdigest()
now = lambda: datetime.now(timezone.utc).isoformat()
def encode(obj): return (json.dumps(obj, ensure_ascii=False, indent=2) + '\n').encode()
def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_bytes(data); temp.replace(path)
def obj(path): return json.loads(path.read_text(encoding='utf-8-sig'))
def norm(value):
    import unicodedata, re
    return re.sub(r'[\W_]', '', unicodedata.normalize('NFKC', value or '').casefold())
class Text(HTMLParser):
    def __init__(self): super().__init__(convert_charrefs=True); self.skip=0; self.parts=[]
    def handle_starttag(self, tag, attrs):
        if tag in ('script','style','noscript','svg'): self.skip+=1
        if not self.skip and tag in ('p','div','li','h1','h2','h3','h4','br','tr','section','article'): self.parts.append('\n')
    def handle_endtag(self, tag):
        if tag in ('script','style','noscript','svg') and self.skip: self.skip-=1
    def handle_data(self, data):
        if not self.skip: self.parts.append(data)
    def value(self): return '\n'.join(' '.join(x.split()) for x in ''.join(self.parts).splitlines() if x.strip())
def public_url(url):
    p=urlparse(url)
    if p.scheme not in ('https','http') or not p.hostname or p.username or p.password: raise ValueError('UNSAFE_URL')
    if p.port not in (None,80,443): raise ValueError('UNSAFE_PORT')
    addresses=socket.getaddrinfo(p.hostname,p.port or (443 if p.scheme=='https' else 80),type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(x[4][0]).is_global for x in addresses): raise ValueError('NON_PUBLIC_ADDRESS')
    return p
class Fetcher:
    def __init__(self, cache):
        self.cache=cache; self.lock=threading.Lock(); self.hosts={}; self.robots={}; self.urls={}
    def host_lock(self, host):
        with self.lock:
            if host not in self.hosts: self.hosts[host]=threading.Lock()
            return self.hosts[host]
    def get(self,url,limit=4*1024*1024):
        deadline = time.monotonic() + 90
        for _ in range(4):
            if time.monotonic() > deadline: raise TimeoutError("TOTAL_FETCH_DEADLINE")
            public_url(url)
            with requests.Session() as session:
                session.trust_env=False
                r=session.get(url,headers={'User-Agent':UA,'Accept':'text/html,application/json,text/plain,text/csv;q=0.8,*/*;q=0.1'},timeout=(10,20),allow_redirects=False,stream=True)
                if r.status_code in (301,302,303,307,308):
                    url=urljoin(url,r.headers.get('Location','')); continue
                chunks=[];size=0
                for chunk in r.iter_content(32768):
                    if time.monotonic() > deadline: raise TimeoutError("TOTAL_FETCH_DEADLINE")
                    size+=len(chunk)
                    if size>limit: raise ValueError('RESPONSE_SIZE_LIMIT')
                    chunks.append(chunk)
                return r.status_code,url,r.headers.get('Content-Type',''),b''.join(chunks)
        raise ValueError('REDIRECT_LIMIT')
    def robot(self,url):
        p=urlparse(url); origin=p.scheme+'://'+p.netloc
        if origin not in self.robots:
            try:
                status,final,ct,b=self.get(origin+'/robots.txt',512*1024)
                parser=RobotFileParser(); parser.parse(b.decode('utf-8','replace').splitlines() if status==200 else [])
                policy='ALLOW_IF_NOT_DISALLOWED' if status in (200,404,410) else 'DEFER_ROBOTS_UNAVAILABLE'
                self.robots[origin]=(parser,{'url':origin+'/robots.txt','status':status,'sha256':sha(b),'policy':policy,'checkedAt':now()})
            except Exception as e:
                self.robots[origin]=(None,{'url':origin+'/robots.txt','policy':'DEFER_ROBOTS_UNAVAILABLE','error':type(e).__name__,'checkedAt':now()})
        parser,meta=self.robots[origin]
        return bool(parser is not None and meta['policy']=='ALLOW_IF_NOT_DISALLOWED' and parser.can_fetch(UA,url)),meta
    def cached(self, record, url):
        if not record.exists():
            return None
        try:
            m = obj(record)
            if m.get('url') != url or not m.get('completedAt'):
                return None
            for kind in ('raw', 'text'):
                if m.get(kind + 'Sha256'):
                    path = (self.cache / m[kind + 'Path']).resolve()
                    if not path.is_relative_to(self.cache.resolve()):
                        return None
                    if not path.is_file() or sha(path.read_bytes()) != m[kind + 'Sha256']:
                        return None
            return m
        except (ValueError, KeyError, OSError):
            return None

    def fetch(self,url):
        key=sha(url.encode()); record=self.cache/'records'/f'{key}.json'
        cached = self.cached(record, url)
        if cached is not None:
            return cached
        p=urlparse(url)
        with self.host_lock(p.netloc):
            cached = self.cached(record, url)
            if cached is not None:
                return cached
            start=now();m={'schemaVersion':'public-source-attempt-v1','url':url,'retrievedAt':start,'status':'ERROR','scoreExtraction':'NONE_REQUIRES_EXPLICIT_EDITORIAL_FACTS'}
            try:
                public_url(url);allowed,robots=self.robot(url);m['robots']=robots
                if not allowed:m['status']='ROBOTS_BLOCKED_OR_UNAVAILABLE'
                else:
                    for attempt in range(2):
                        status,final,ct,b=self.get(url)
                        if status not in (429,502,503,504) or attempt==1:break
                        time.sleep(2)
                    m.update(httpStatus=status,finalUrl=final,contentType=ct,rawSha256=sha(b),rawPath='raw/'+key+'.bin',bytes=len(b))
                    atomic(self.cache/m['rawPath'],b)
                    if status!=200:m['status']='HTTP_UNAVAILABLE'
                    elif not ('html' in ct or 'text/plain' in ct or 'json' in ct):m['status']='NON_HTML_REVIEW_REQUIRED'
                    else:
                        import re
                        charset=re.search(br'charset\s*=\s*["\x27]?([a-zA-Z0-9_-]+)',b[:4096])
                        enc=charset.group(1).decode() if charset else ('shift_jis' if 'shift_jis' in ct.lower() else 'utf-8')
                        try:html=b.decode(enc,errors='replace')
                        except LookupError:html=b.decode('utf-8',errors='replace')
                        parser=Text();parser.feed(html);text=parser.value();tb=text.encode()
                        atomic(self.cache/'text'/f'{key}.txt',tb)
                        m.update(status='FETCHED_UNREVIEWED',textSha256=sha(tb),textPath='text/'+key+'.txt',textCharacters=len(text),encoding=enc)
            except Exception as e:m.update(status='FETCH_ERROR',errorCode=type(e).__name__)
            m['completedAt']=now();atomic(record,encode(m));time.sleep(0.6);return m

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--cache',required=True);ap.add_argument('--csv',required=True);ap.add_argument('--resume',action='store_true');ap.add_argument('--batch');ap.add_argument('--commit',action='store_true');args=ap.parse_args()
    cache=Path(args.cache).resolve();cache.mkdir(parents=True,exist_ok=True)
    plan=obj(ROOT/PLAN);assert plan['count']==10097 and len(plan['batches'])==51
    for path,digest in plan['identityHashes'].items(): assert sha((ROOT/path).read_bytes())==digest,'FROZEN_IDENTITY_CHANGED '+path
    for f in plan['baselinePartitions']: assert sha((ROOT/f['path']).read_bytes())==f['sha256'],'BASELINE_CHANGED'
    raw=Path(args.csv).read_bytes();assert sha(raw)==CSV_SHA,'FROZEN_BULK_SOURCE_CHANGED'
    bulk={r['id']:r for r in csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))}
    identities={c['candidateKey']:c for c in map(json.loads,(ROOT/PREFIX/'registry/combined-candidates.v1.jsonl').read_text(encoding='utf-8').splitlines())}
    fetcher=Fetcher(cache);toolHash=sha(Path(__file__).read_bytes());allResults=[]
    for batch in plan['batches']:
        bid=batch['batchId']
        if args.batch and args.batch!=bid:continue
        selected=[i for i in plan['items'] if i['batchId']==bid]
        inputHash=sha(encode({'population':sha((ROOT/PLAN).read_bytes()),'keys':[i['candidateKey']for i in selected],'tool':toolHash,'bulk':CSV_SHA}))
        outPath=f'{OUT}/{bid}.jsonl';qaPath=f'{QA}/{bid}.json';receiptPath=f'{PREFIX}/manifests/remaining-v1/{bid}.json'
        receiptFile=ROOT/receiptPath
        if args.resume and receiptFile.exists():
            try: receipt=obj(receiptFile)
            except (ValueError, OSError): receipt={}
            valid_times = False
            try:
                began = datetime.fromisoformat(receipt['startedAt'])
                ended = datetime.fromisoformat(receipt['completedAt'])
                valid_times = began.tzinfo is not None and ended.tzinfo is not None and ended >= began
            except (KeyError, ValueError, TypeError):
                pass
            outputs = receipt.get('outputs', [])
            expected_keys = [i['candidateKey'] for i in selected]
            valid_receipt = (
                receipt.get('inputChecksum') == inputHash
                and receipt.get('status') == 'ATTEMPT_QA_PASS'
                and receipt.get('count') == batch['count']
                and receipt.get('orderedCandidateKeys') == expected_keys
                and valid_times
                and len(outputs) == 2
                and {o.get('path') for o in outputs} == {outPath, qaPath}
                and all((ROOT/o['path']).is_file() and sha((ROOT/o['path']).read_bytes()) == o['sha256'] for o in outputs)
            )
            if valid_receipt:
                previous = list(map(json.loads, (ROOT/outPath).read_text(encoding='utf-8').splitlines()))
                cache_valid = True
                for row in previous:
                    for source in row['attempts']:
                        if source.get('rawSha256') or source.get('textSha256'):
                            cached = fetcher.cached(cache/'records'/(sha(source['url'].encode())+'.json'), source['url'])
                            if cached is None or any(cached.get(k) != source.get(k) for k in ('rawSha256','textSha256')):
                                cache_valid = False
                if cache_valid:
                    allResults.extend(previous)
                    print(json.dumps({'batch':bid,'status':'SKIPPED_IDENTICAL'}),flush=True)
                    continue
        started=now();urls=sorted({u for i in selected if not i['identityHold'] for u in i['sourceRefs'] if 'geoshape.ex.nii.ac.jp/nrct-poi/resource/' not in u})
        with ThreadPoolExecutor(max_workers=4) as pool: metadata=dict(zip(urls,pool.map(fetcher.fetch,urls)))
        results=[]
        for item in selected:
            c=identities[item['candidateKey']];r={'candidateKey':item['candidateKey'],'batchId':bid,'priorStatus':item['priorStatus'],'identityInputChecksum':item['identityInputChecksum'],'status':'EVIDENCE_UNAVAILABLE','attempts':[],'featuresAdded':0,'visitProfilesAdded':0,'accessLinksAdded':0,'reason':'No accessible target-specific evidence in the attempted sources; all unsupported fields remain null.'}
            if item['identityHold']:
                r.update(status='IDENTITY_HOLD_PRESERVED',reason='Existing identity conflict remains unresolved. No attribute association, identity merge or Registry rebind is authorized.')
            else:
                for u in item['sourceRefs']:
                    if 'geoshape.ex.nii.ac.jp/nrct-poi/resource/' in u:
                        recordId=Path(urlparse(u).path).stem;b=bulk.get(recordId)
                        names={norm(x)for x in c['namesJa']+c['namesEn']+sum([o.get('aliases',[])for o in c['observations']],[])}
                        ok=b is not None and norm(b['名称'])in names
                        r['attempts'].append({'url':u,'status':'IDENTITY_METADATA_ONLY' if ok else 'BULK_IDENTITY_MISMATCH','bulkSource':CSV_URL,'bulkSha256':CSV_SHA,'recordId':recordId,'rowSha256':sha(encode(b)) if b else None,'identityNameMatch':ok,'licence':'CC BY 4.0','attribution':'『日本歴史地名大系』施設・地点項目データセット（CODH作成） doi:10.20676/00000456'})
                    else:
                        m=metadata[u].copy()
                        if m.get('textPath'):
                            text=(cache/m['textPath']).read_text(encoding='utf-8');names=c['namesJa']+c['namesEn']+sum([o.get('aliases',[])for o in c['observations']],[])
                            m['candidateNameMentioned']=any(norm(x) and norm(x)in norm(text) for x in names)
                            m['mentionIsIdentityProof']=False
                        r['attempts'].append(m)
                if any(x['status']=='BULK_IDENTITY_MISMATCH' for x in r['attempts']):r.update(status='IDENTITY_REVIEW_REQUIRED',reason='Bulk source identity no longer matches the frozen candidate; no reassignment or scoring.')
                elif any(x['status']=='FETCHED_UNREVIEWED' and x.get('candidateNameMentioned') for x in r['attempts']):r.update(status='TARGET_CONTENT_REVIEW_REQUIRED',reason='Fetched text mentions a candidate name; exact entity, target boundary and rubric facts still require editorial review. No automatic scores.')
                elif any(x['status']=='IDENTITY_METADATA_ONLY' for x in r['attempts']):r.update(status='IDENTITY_METADATA_ONLY',reason='Official bulk record confirms historical identity metadata only. Name/category/estimated coordinates do not support 43-feature strength, Visit Profile or current access.')
                elif any(x['status']=='FETCHED_UNREVIEWED' for x in r['attempts']):r.update(status='SOURCE_TARGET_UNRESOLVED',reason='Fetched source does not establish an exact target relationship; name/category/nearby-page facts are not assigned.')
            results.append(r)
        assert len(results)==batch['count'] and len({r['candidateKey']for r in results})==len(results)
        assert sha(json.dumps([r['candidateKey']for r in results],ensure_ascii=False,separators=(',',':')).encode())==batch['candidateKeysSha256']
        content=''.join(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n'for r in results).encode()
        qa={'batchId':bid,'status':'ATTEMPT_QA_PASS','count':len(results),'outcomes':dict(Counter(r['status']for r in results)),'fieldAdditions':0,'editorialCompletionClaimed':False,'noDefaultScores':True,'formalCodeChanges':0,'identityChecksumPreserved':True}
        atomic(ROOT/outPath,content);atomic(ROOT/qaPath,encode(qa))
        receipt={'batchId':bid,'status':'ATTEMPT_QA_PASS','count':len(results),'inputChecksum':inputHash,'orderedCandidateKeys':[r['candidateKey']for r in results],'outputs':[{'path':p,'sha256':sha((ROOT/p).read_bytes())}for p in(outPath,qaPath)],'startedAt':started,'completedAt':now(),'reviewQueueCount':len(results),'editorialCompletionClaimed':False}
        atomic(receiptFile,encode(receipt));allResults.extend(results);print(json.dumps(qa),flush=True)
        if args.commit:
            branch=subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip();assert branch=='codex/b-poi-remaining-10097-evidence-review'
            subprocess.run(['git','add','--',outPath,qaPath,receiptPath],cwd=ROOT,check=True)
            changed=subprocess.run(['git','diff','--cached','--quiet'],cwd=ROOT).returncode
            if changed:subprocess.run(['git','commit','-m',f'data(poi): checkpoint {bid} source attempts ({len(results)} candidates)'],cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
    summary={'status':'BOUNDED_ATTEMPT_COMPLETE' if args.batch else 'ALL_SOURCE_ATTEMPTS_COMPLETE','count':len(allResults),'batches':1 if args.batch else 51,'states':dict(Counter(r['status']for r in allResults)),'editorialCompletionClaimed':False,'scoredFeatureAdditions':0,'cachePath':str(cache),'bulkSourceSha256':CSV_SHA,'completedAt':now()}
    atomic(ROOT/QA/'source-attempt-summary.json',encode(summary));print(json.dumps(summary),flush=True)
if __name__=='__main__':main()
