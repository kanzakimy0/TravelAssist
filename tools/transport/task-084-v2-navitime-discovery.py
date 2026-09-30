#!/usr/bin/env python3
"""Traverse NAVITIME's public nationwide terminal category for discovery only.

Source IDs identify observations, never accepted TransportNode identities. The
result preserves unresolved physical-facility duplicates for official review.
"""
import argparse
import hashlib
import json
import re
import time
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin

from lxml import html

ROOT = 'https://www.navitime.co.jp/category/0815/'

def enc(x):
    return (json.dumps(x, ensure_ascii=False, sort_keys=True, separators=(',', ':'))+'\n').encode('utf-8')

def sha(b):
    return hashlib.sha256(b).hexdigest()

def fetch(url, cache):
    target = cache / (sha(url.encode())+'.html')
    if target.exists():
        return target.read_bytes()
    with urllib.request.urlopen(url, timeout=30) as response:
        body = response.read()
    target.write_bytes(body)
    return body

def parse(body, url):
    tree = html.fromstring(body.decode('utf-8'))
    records=[]
    for li in tree.xpath('//*[@id="spot-list"]/ul/li[contains(@class,"spot-section")]'):
        names=li.xpath('.//*[contains(@class,"spot-name-text")]/text()')
        links=li.xpath('.//dt[contains(@class,"spot-name")]/a/@href')
        details=li.xpath('.//dl[contains(@class,"spot-detail-section")]')
        address=None
        if details:
            for dt in details[0].xpath('./dt'):
                if ''.join(dt.itertext()).strip()=='住所':
                    dd=dt.getnext()
                    address=''.join(dd.itertext()).strip()
        if len(names)!=1 or len(links)!=1:
            raise RuntimeError('NAVITIME_RECORD_PARSE_CHANGED: '+url)
        source_id=li.get('data-provid')+'-'+li.get('data-spotid')
        records.append({'discoveryRecordId':'navitime:'+source_id,'discoveryName':names[0].strip(),
                        'discoveryAddress':address,'discoveryUrl':urljoin(url,links[0]),
                        'categorySourcePages':[url],'sourcePurpose':'DISCOVERY_ONLY',
                        'canonicalIdentityAuthorized':False,'coordinatesAuthorized':False,
                        'passengerStatisticsAuthorized':False,'physicalFacilityDedupStatus':'OFFICIAL_IDENTITY_REVIEW_REQUIRED'})
    next_urls=tree.xpath('//link[@rel="next"]/@href')
    prefectures=sorted(set(tree.xpath('//a[starts-with(@href,"https://www.navitime.co.jp/category/0815/")]/@href')))
    prefectures=[u for u in prefectures if re.fullmatch(re.escape(ROOT)+r'\d{2}/',u)]
    return records, next_urls[0] if next_urls else None, prefectures

def crawl_chain(start,cache):
    url=start; seen=set(); records=[]; receipts=[]
    while url:
        if url in seen:
            raise RuntimeError('PAGINATION_LOOP: '+url)
        if not url.startswith(ROOT) or ('?' in url and not re.search(r'\?page=\d+$',url)):
            raise RuntimeError('UNEXPECTED_CATEGORY_LINK: '+url)
        seen.add(url)
        body=fetch(url,cache)
        page,next_url,_=parse(body,url)
        if not page and next_url:
            raise RuntimeError('EMPTY_PAGE_WITH_NEXT: '+url)
        records.extend(page)
        receipts.append({'url':url,'sha256':sha(body),'recordCount':len(page),'nextUrl':next_url})
        url=next_url
        time.sleep(0.15)
    return records,receipts

def main(args):
    cache=Path(args.cache); cache.mkdir(parents=True,exist_ok=True)
    root_body=fetch(ROOT,cache)
    _,_,pref_urls=parse(root_body,ROOT)
    national,receipts=crawl_chain(ROOT,cache)
    all_records=list(national); pref_report=[]
    with ThreadPoolExecutor(max_workers=3) as pool:
        for pref_url,(records,pages) in zip(pref_urls,pool.map(lambda u:crawl_chain(u,cache),pref_urls)):
            all_records.extend(records); receipts.extend(pages)
            pref_report.append({'prefectureCode':pref_url.rstrip('/').split('/')[-1],
                                'navigationUrl':pref_url,'pageCount':len(pages),'recordCount':len(records),
                                'navigationStatus':'TRAVERSED_TO_LAST_PAGE'})
    for code in sorted(set(f'{i:02}' for i in range(1,48))-{p['prefectureCode'] for p in pref_report}):
        pref_report.append({'prefectureCode':code,'navigationUrl':None,'pageCount':0,'recordCount':0,
                            'navigationStatus':'NO_ACTIVE_PREFECTURE_LINK_ON_ROOT_NOT_PROOF_OF_NO_TERMINALS'})
    observations={}
    for r in all_records:
        key=r['discoveryRecordId']
        if key in observations:
            old=observations[key]
            if (old['discoveryName'],old['discoveryAddress'])!=(r['discoveryName'],r['discoveryAddress']):
                raise RuntimeError('INCONSISTENT_OBSERVATION: '+key)
            old['categorySourcePages']=sorted(set(old['categorySourcePages']+r['categorySourcePages']))
        else:
            observations[key]=r
    records=sorted(observations.values(),key=lambda r:r['discoveryRecordId'])
    national_ids={r['discoveryRecordId'] for r in national}
    pref_ids={r['discoveryRecordId'] for r in all_records[len(national):]}
    if national_ids!=pref_ids:
        raise RuntimeError(f'NATIONAL_PREFECTURE_DISCOVERY_MISMATCH: {national_ids ^ pref_ids}')
    out=Path(args.output); out.mkdir(parents=True,exist_ok=True)
    artifacts={'navitime-discovered-candidates.jsonl':b''.join(map(enc,records)),
               'navitime-page-receipts.jsonl':b''.join(map(enc,sorted(receipts,key=lambda r:r['url']))),
               'navitime-prefecture-coverage.jsonl':b''.join(map(enc,sorted(pref_report,key=lambda r:r['prefectureCode'])))}
    manifest={'task':'TASK-084-B','rulesCommit':'168149d0fc5570f5ed55297937c806bdf290d6b3',
              'sourcePurpose':'DISCOVERY_ONLY','nationalMasterStatus':'REWORK_IN_PROGRESS',
              'discoverySource':ROOT,'observedAt':args.observed_at,
              'nationwidePaginationComplete':True,'nationalPrefectureObservationSetsEqual':True,
              'navitimeDiscovered':len(records),'pageCount':len(receipts),
              'activePrefectureNavigations':len(pref_urls),'prefecturesAccountedFor':47,
              'physicalFacilityDedupComplete':False,
              'artifactSha256':{n:sha(b) for n,b in artifacts.items()}}
    artifacts['navitime-manifest.json']=enc(manifest)
    for name,body in artifacts.items():
        target=out/name
        if target.exists() and not args.rebuild and target.read_bytes()!=body:
            raise RuntimeError('DISCOVERY_ARTIFACT_CHANGED_OR_CORRUPTED: '+name)
    for name,body in artifacts.items():
        target=out/name
        if not target.exists() or args.rebuild:
            target.write_bytes(body)
    print(json.dumps(manifest,ensure_ascii=False))

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--cache',required=True)
    p.add_argument('--output',default='data/transport/nodes/task-084-b-v2-bus-discovery')
    p.add_argument('--observed-at',default='2026-09-30'); p.add_argument('--rebuild',action='store_true')
    main(p.parse_args())
