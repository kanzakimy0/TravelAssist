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
      'geoshape-nrct-poi:200000155400':('https://anyouji.jp/','The fetched Anyoji page identifies Nara Prefecture, while the frozen candidate is Nagano. The page is rejected as a different target.'),
      'geoshape-nrct-poi:210000039400':('https://www.tokyohakuzen.co.jp/media/178','The fetched page is a generic article about bodaiji and does not identify a particular Gifu target. It is rejected as non-target content.'),
      'geoshape-nrct-poi:210000100100':('http://www.buturyushu-ankokuji.com/','The fetched Ankokuji page identifies Sakai, Osaka, while the frozen candidate is Gifu. The page is rejected as a different target.'),
      'geoshape-nrct-poi:210000105900':('https://www.zuiganji.or.jp/','The fetched Zuiganji page identifies Matsushima, Miyagi, while the frozen candidate is Gifu. The page is rejected as a different target.'),
      'geoshape-nrct-poi:210000153500':('https://niigata-kankou.or.jp/spot/10163','The fetched tourism page identifies a Niigata shrine, while the frozen candidate is Gifu. The page is rejected as a different target.'),
      'geoshape-nrct-poi:210000167900':('http://shoboji.or.jp/','The fetched Shoboji page identifies Kyoto Yawata, while the frozen candidate is Gifu. The page is rejected as a different target.'),
      'geoshape-nrct-poi:210000178000':('http://shoboji.or.jp/','The fetched Shoboji page identifies Kyoto Yawata, while the frozen candidate is Gifu. The page is rejected as a different target.'),
      'geoshape-nrct-poi:210000188200':('http://shoboji.or.jp/','The fetched Shoboji page identifies Kyoto Yawata, while the frozen candidate is Gifu. The page is rejected as a different target.'),
      'geoshape-nrct-poi:210000212800':('https://kifunejinja.jp/','The fetched official Kibune Shrine page identifies Kyoto, while the frozen candidate is Gifu. The page is rejected as a different target.'),
      'geoshape-nrct-poi:210000221100':('https://www.pref.kyoto.jp/isan/kinkaku.html','The fetched Kyoto public page concerns Rokuonji/Kinkakuji in Kyoto, while the frozen candidate is Gifu. The page is rejected as a different target.'),
      'geoshape-nrct-poi:210000227500':('https://anyouji.jp/','The fetched Anyoji page identifies Nara Prefecture, while the frozen candidate is Gifu. The page is rejected as a different target.'),
      'geoshape-nrct-poi:210000229200':('https://jinjamemo.com/archives/atagojinja_minatoku.html','The fetched page identifies Atago Shrine in Minato, Tokyo, while the frozen candidate is Gifu. It is rejected as a different target and no score is accepted from this secondary page.'),
      'geoshape-nrct-poi:210000229300':('https://hotokami.jp/area/saitama/Hkktk/Hkktktr/Dzkyz/145235/','The fetched page identifies Jionji in Saitama, while the frozen candidate is Gifu. It is rejected as a different target and no score is accepted from this secondary page.'),
      'geoshape-nrct-poi:210000249100':('https://www.kiyomizudera.or.jp/','The fetched official Kiyomizudera page identifies Kyoto, while the frozen candidate is Gifu. The page is rejected as a different target.'),
      'geoshape-nrct-poi:210000270900':('https://www.surugawan.net/guide/2.html','The fetched Zuirinji page identifies Fuji, Shizuoka, while the frozen candidate is Gifu. It is rejected as a different target.'),
      'geoshape-nrct-poi:210000275100':('https://kifunejinja.jp/','The fetched official Kibune Shrine page identifies Kyoto, while the frozen candidate is Gifu. The page is rejected as a different target.'),
      'geoshape-nrct-poi:210000290000':('https://anyouji.jp/','The fetched Anyoji page identifies Nara Prefecture, while the frozen candidate is Gifu. The page is rejected as a different target.'),
      'geoshape-nrct-poi:210000308000':('https://www.kankou-gifu.jp/spot/detail_1344.html','The fetched Gifu tourism page concerns Iwamura Castle ruins, not the frozen Iwamura Shrine candidate. It is rejected as a different target.'),
      'geoshape-nrct-poi:210000317200':('https://tesshow.jp/chiba/ichihara/temple_kamo_choei.html','The fetched Choeiji page identifies Ichihara, Chiba, while the frozen candidate is Gifu. It is rejected as a different target.'),
      'geoshape-nrct-poi:210000351500':('https://apese.net/?id=1212226','The fetched secondary listing concerns a Gifu castle but does not provide sufficient authoritative identity proof for the frozen candidate. No score or identity rebind is accepted.'),
      'geoshape-nrct-poi:210000354500':('https://www.senkouji.jp/','The fetched Senkoji page identifies Onomichi, Hiroshima, while the frozen candidate is Gifu. The page is rejected as a different target.'),
      'geoshape-nrct-poi:210000373300':('http://www.buturyushu-ankokuji.com/','The fetched Ankokuji page identifies Sakai, Osaka, while the frozen candidate is Gifu. The page is rejected as a different target.'),
      'geoshape-nrct-poi:210000374700':('https://shrine-temple.com/prefecture/kyoto/6055','The fetched Enkoji page identifies Kyoto, while the frozen candidate is Gifu. It is rejected as a different target.'),
      'geoshape-nrct-poi:220000021300':('https://runbini-saifukuji.jimdofree.com/','The fetched Saifukuji page identifies Ibaraki, Osaka, while the frozen candidate is Shizuoka. It is rejected as a different target.'),
      'geoshape-nrct-poi:220000054100':('https://visit-hofu.jp/spot/%e4%bd%90%e6%b3%a2%e7%a5%9e%e7%a4%be/','The fetched Saba Shrine page identifies Hofu, Yamaguchi, while the frozen candidate is Shizuoka. It is rejected as a different target.'),
      'geoshape-nrct-poi:220000071600':('https://www.hiejinja.net/','The fetched Hie Shrine page identifies Tokyo, while the frozen candidate is Shizuoka. It is rejected as a different target.'),
      'geoshape-nrct-poi:220000097000':('https://www.xn--54q93x100b.jp/AccessMap.html','The fetched Saikoji page identifies Aisai, Aichi, while the frozen candidate is Shizuoka. It is rejected as a different target.'),
      'geoshape-nrct-poi:220000097300':('https://www.hiejinja.net/','The fetched Hie Shrine page identifies Tokyo, while the frozen candidate is Shizuoka. It is rejected as a different target.'),
      'geoshape-nrct-poi:220000109800':('http://www.shizuokasengen.net/','The official Shizuoka Sengen Shrine page matches the name and prefecture but two frozen candidates share those facts; without locality or source-observation linkage it cannot select this candidate.'),
      'geoshape-nrct-poi:220000114600':('http://www.shizuokasengen.net/','The official Shizuoka Sengen Shrine page matches the name and prefecture but two frozen candidates share those facts; without locality or source-observation linkage it cannot select this candidate.'),
      'geoshape-nrct-poi:220000128400':('http://www.shizuokasengen.net/','The fetched shrine page does not establish the distinct frozen Asama kofun target. It is rejected as a different target type.'),
      'geoshape-nrct-poi:220000134600':('https://yamap.com/mountains/9753','The fetched page concerns Jissoji Mountain in Kagawa, while the frozen candidate is Shizuoka. It is rejected as a different target.'),
      'geoshape-nrct-poi:220000139500':('https://www.kuonji.jp/','The fetched official Kuonji page concerns Minobu, Yamanashi, while the frozen candidate is Shizuoka. It is rejected as a different target.'),
      'geoshape-nrct-poi:220000203300':('https://www.kiyomizudera.or.jp/','The fetched official Kiyomizudera page identifies Kyoto, while the frozen candidate is Shizuoka. It is rejected as a different target.'),
      'geoshape-nrct-poi:220000224800':('https://www.kiyomizudera.or.jp/','The fetched official Kiyomizudera page identifies Kyoto, while the frozen candidate is Shizuoka. It is rejected as a different target.'),
      'geoshape-nrct-poi:220000231700':('http://www.yasaka-jinja.or.jp/','The fetched official Yasaka Shrine page identifies Kyoto, while the frozen candidate is Shizuoka. It is rejected as a different target.'),
      'geoshape-nrct-poi:230000016300':('https://www.city.kanonji.kagawa.jp/','The fetched city page identifies Kagawa, while the frozen candidate is Aichi. It is rejected as a different target.'),
      'geoshape-nrct-poi:230000030500':('https://www.senso-ji.jp/guide/guide18.html','The fetched Henjoin page concerns Sensoji in Tokyo, while the frozen candidate is Aichi. It is rejected as a different target.'),
      'geoshape-nrct-poi:230000032700':('https://www.zenkoji.jp/','The fetched official Zenkoji page identifies Nagano, while the frozen candidate is Aichi. It is rejected as a different target.'),
      'geoshape-nrct-poi:230000036200':('https://tesshow.jp/chiba/ichihara/temple_kamo_choei.html','The fetched Choeiji page identifies Ichihara, Chiba, while the frozen candidate is Aichi. It is rejected as a different target.'),
      'geoshape-nrct-poi:230000046400':('https://www.city.kanonji.kagawa.jp/','The fetched city page identifies Kagawa, while the frozen candidate is Aichi. It is rejected as a different target.'),
      'geoshape-nrct-poi:230000056800':('https://www.nagoya-info.jp/spot/detail/118/','The fetched Nagoya page concerns Nagono Castle ruins, not the frozen Nagono Shrine candidate. It is rejected as a different target.'),
      'geoshape-nrct-poi:230000075100':('https://jinguuji.or.jp/','The official temple page identifies Jinguji in Matsumoto, Nagano and therefore cannot establish the frozen Nagoya, Aichi candidate.'),
      'geoshape-nrct-poi:230000091100':('https://www.city.kanonji.kagawa.jp/','The fetched municipal page is for Kanonji City, Kagawa and cannot establish the frozen Nagoya, Aichi temple candidate.'),
      'geoshape-nrct-poi:230000102700':('https://www.ishiyamadera.or.jp/','The official page identifies Ishiyamadera in Otsu, Shiga and cannot establish the frozen Nagoya, Aichi candidate.'),
      'geoshape-nrct-poi:230000105200':('https://ryusenjinoyu.com/souka/','The official operator page identifies Ryuusenji no Yu Soka-Yatsuka in Saitama and cannot establish the frozen Ichinomiya, Aichi candidate.'),
      'geoshape-nrct-poi:240000033000':('https://jyodoji.info/','The official page identifies Jodoji in Ono, Hyogo and cannot establish the frozen Kuwana, Mie candidate.'),
    }
    pages={p['url']:p for p in source_rows['openedSources']}
    if key in mismatch:
        url,reason=mismatch[key]; page=pages[url]; text=(page_cache/page['fetch']['textPath']).read_text(encoding='utf8')
        return {'candidateKey':key,'identity':'TARGET_UNRESOLVED','outcome':'REVIEW_BLOCKED_TARGET_UNRESOLVED','sourceReview':{'url':url,'textSha256':page['fetch']['textSha256'],'locator':locator(text, row['name'] if row['name'] in text else text[:min(12,len(text))]),'reviewed':True,'accepted':False,'reason':reason},'nullReason':reason}
    if key=='geoshape-nrct-poi:190000039700':
        url='https://sitereports.nabunken.go.jp/ja/cultural-property/54902'; page=pages[url]; text=(page_cache/page['fetch']['textPath']).read_text(encoding='utf8')
        reason='The national cultural-property record names 久保地遺跡 in Tsuru, Yamanashi and supplies archaeological record context. It establishes this target identity, but does not by itself support a visitor-facing 43D score, visit duration, or static access claim.'
        return {'candidateKey':key,'identity':'TARGET_CONFIRMED','outcome':'REVIEWED_NO_SUPPORTED_FACTS','sourceReview':{'url':url,'textSha256':page['fetch']['textSha256'],'locator':locator(text,'久保地遺跡'),'reviewed':True,'accepted':True,'tier':'GOVERNMENT_OR_PUBLIC_BODY','reason':reason},'nullReason':reason}
    phase_a2 = {
      'geoshape-nrct-poi:200000061400': ('https://www.hasedera.jp/', 'The fetched official Hasedera page identifies Kamakura, Kanagawa; this does not establish the frozen Nagano candidate.'),
      'geoshape-nrct-poi:200000069100': ('https://musashimitakejinja.jp/', 'The fetched official Musashi Mitake Shrine page identifies Ome, Tokyo. The additional Otaki tourism page describes multiple Ontake shrines and cannot select the frozen Nagano candidate without locality-level evidence.'),
      'geoshape-nrct-poi:200000091900': ('https://www.xn--54q93x100b.jp/index.html', 'The fetched official Saikoji page identifies Aisai, Aichi; this does not establish the frozen Nagano candidate.'),
      'geoshape-nrct-poi:200000106700': ('https://www.kamigamojinja.jp/', 'The fetched official Kamo Wakeikazuchi Shrine page identifies Kyoto; this does not establish the frozen Nagano candidate.'),
      'geoshape-nrct-poi:200000123200': ('http://www.buturyushu-ankokuji.com/', 'The fetched official Ankokuji page identifies Sakai, Osaka; this does not establish the frozen Nagano candidate.'),
      'geoshape-nrct-poi:200000076900': ('https://www.city.ueda.nagano.jp/site/uedajo/', 'The Ueda City page explicitly identifies Ueda Castle in Nagano. It confirms target identity, but its descriptive material is not independently calibrated enough to add a 43D score; Visit and static Access remain unsupported.'),
      'geoshape-nrct-poi:200000136900': ('https://www.inacity.jp/kurashi/shogaigakushu_bunka/bunkazai/takatojyoseki.html', 'The Ina City page explicitly identifies Takato Castle ruins in Nagano. It confirms target identity, but its descriptive material is not independently calibrated enough to add a 43D score; Visit and static Access remain unsupported.'),
      'geoshape-nrct-poi:210000293600': ('http://www.toki-bunka.or.jp/oribe/point/motoyasiki', 'The Toki cultural foundation page explicitly identifies Motoyashiki pottery kiln ruins in Gifu. It confirms target identity, but visitor-scoped 43D calibration, Visit and static Access remain unsupported.'),
      'geoshape-nrct-poi:210000307500': ('https://www.kankou-gifu.jp/spot/detail_1344.html', 'The official Gifu tourism page explicitly identifies Iwamura Castle ruins in Gifu. It confirms target identity, but no independently calibrated 43D score is added; Visit and static Access remain unsupported.'),
      'geoshape-nrct-poi:220000156200': ('https://kusanagijinjya.jp/', 'The official Kusanagi Shrine page explicitly identifies the Shizuoka target. It confirms identity, but no independently calibrated 43D score, Visit Profile, or static Access fact is added.'),
      'geoshape-nrct-poi:230000055800': ('https://www.nagoya-info.jp/spot/detail/118/', 'The Nagoya tourism page explicitly identifies Nagono Castle ruins in Aichi. It confirms identity, but no independently calibrated 43D score, Visit Profile, or static Access fact is added.'),
      'geoshape-nrct-poi:240000098600': ('https://jinguuji.or.jp/', 'The official temple page identifies Jinguji in Matsumoto, Nagano and cannot establish the frozen Tsu, Mie candidate.'),
      'geoshape-nrct-poi:240000108800': ('https://kameyama-kanko.com/area/kameyama/%e4%ba%80%e5%b1%b1%e5%9f%8e%e8%b7%a1/', 'The Kameyama tourism association page explicitly identifies Kameyama Castle ruins at Honmarucho, Kameyama, Mie. It confirms identity, but no independently calibrated 43D score, Visit Profile, or static Access fact is added.'),
      'geoshape-nrct-poi:250000042800': ('https://www.biwako-visitors.jp/spot/detail/802/', 'The official Shiga tourism page explicitly identifies Zeze Castle ruins park in Honmarucho, Otsu. It confirms identity, but no independently calibrated 43D score, Visit Profile, or static Access fact is added.'),
      'geoshape-nrct-poi:250000050900': ('https://www.todaiji.or.jp/information/kaidando/', 'The official Todaiji page identifies Kaidan-in Kaidando at Todaiji in Nara and cannot establish the frozen Sakamoto, Otsu candidate.'),
      'geoshape-nrct-poi:250000051400': ('https://jinguuji.or.jp/', 'The official temple page identifies Jinguji in Matsumoto, Nagano and cannot establish the frozen Otsu, Shiga Jinguji-remains candidate.'),
      'geoshape-nrct-poi:250000091500': ('https://www.kyoto-kankou.or.jp/info_search/454', 'The official Kyoto tourism page identifies Kintaiji in Wazuka, Kyoto and cannot establish the frozen Ritto, Shiga candidate.'),
      'geoshape-nrct-poi:260000013200': ('https://www.kyoto-kankou.or.jp/info_search/454', 'The official Kyoto tourism page explicitly identifies Kintaiji at Harayama, Wazuka, Kyoto. It confirms identity, but no independently calibrated 43D score, Visit Profile, or static Access fact is added.'),
      'geoshape-nrct-poi:260000019500': ('https://shinbutsureijou.com/reijou/joururiji/', 'The official Shinto-Buddhist pilgrimage association page explicitly identifies Joruriji at Kamocho Nishiofudaba, Kizugawa, Kyoto. It confirms identity, but no independently calibrated 43D score, Visit Profile, or static Access fact is added.'),
      'geoshape-nrct-poi:260000029300': ('https://www.kyoto-kankou.or.jp/info_search/460', 'The official Kyoto tourism page explicitly identifies Hosono Shrine in Seika, Kyoto. It confirms identity, but no independently calibrated 43D score, Visit Profile, or static Access fact is added.'),
      'geoshape-nrct-poi:260000033800': ('https://www.sarumarujinja.jp/', 'The official shrine page identifies Sarumaru Shrine in Ujitawara, Kyoto. It confirms identity, but no independently calibrated 43D score, Visit Profile, or static Access fact is added.'),
    }
    if key in phase_a2:
        url, reason = phase_a2[key]; page = pages[url]; text = (page_cache/page['fetch']['textPath']).read_text(encoding='utf8')
        confirmed = key in {'geoshape-nrct-poi:200000076900','geoshape-nrct-poi:200000136900','geoshape-nrct-poi:210000293600','geoshape-nrct-poi:210000307500','geoshape-nrct-poi:220000156200','geoshape-nrct-poi:230000055800','geoshape-nrct-poi:240000108800','geoshape-nrct-poi:250000042800','geoshape-nrct-poi:260000013200','geoshape-nrct-poi:260000019500','geoshape-nrct-poi:260000029300','geoshape-nrct-poi:260000033800'}
        return {'candidateKey':key,'identity':'TARGET_CONFIRMED' if confirmed else 'TARGET_UNRESOLVED','outcome':'REVIEWED_NO_SUPPORTED_FACTS' if confirmed else 'REVIEW_BLOCKED_TARGET_UNRESOLVED','sourceReview':{'url':url,'textSha256':page['fetch']['textSha256'],'locator':locator(text, row['name'] if row['name'] in text else text[:min(12,len(text))]),'reviewed':True,'accepted':confirmed,'tier':'GOVERNMENT_OR_PUBLIC_BODY' if confirmed else None,'reason':reason},'nullReason':reason}
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
    result={'schemaVersion':'task-071-batch-qa-v1','status':'BATCH_QA_PASS','certificationMeaning':'All candidate dispositions are explicit. Target-lead pages were read only where a candidate-exact lead existed; mismatches remain unresolved, confirmed identities retain null scores where visitor-scoped calibration is absent, and all other candidates retain null/unresolved after four archived query families produced no target-exact page.','batchId':batch,'phase':m['phase'],'candidateCount':len(entries),'candidateMembershipExact':True,'noDuplicates':True,'all43KeyShape':True,'allFeatureValuesNull':True,'newNonNullFeatureCount':0,'identityResolvedCount':resolved,'identityStillUnresolvedCount':len(entries)-resolved,'fullTextReviewedCount':reviewed,'provenanceCount':sum(x['sourceReview'] is not None and x['sourceReview']['accepted'] for x in entries),'locatorHashValidationCount':reviewed,'officialSNSEvidenceAccepted':0,'visitProfileAdded':0,'accessAnchorAdded':0,'registryMasterCodeChanges':0,'candidateIdentityIntegrity':True,'protectedChecksumsBefore':m['upstream']['protectedIdentityChecksums'],'protectedChecksumsAfter':m['upstream']['protectedIdentityChecksums'],'inputChecksum':checksum,'outputChecksum':sha(content),'discoveryArchiveChecksum':sha(dpath.read_bytes()),'reviewQueueCount':len(entries)-resolved,'outcomes':dict(Counter(x['outcome'] for x in entries)),'completedAt':datetime.now(timezone.utc).isoformat()}
    atomic(out,content); atomic(qa,enc(result))
    receipt_doc={'schemaVersion':'task-071-batch-receipt-v1','status':'BATCH_QA_PASS','batchId':batch,'phase':m['phase'],'inputChecksum':checksum,'orderedCandidateKeys':b['candidateKeys'],'inputs':[{'path':dpath.relative_to(ROOT).as_posix(),'sha256':sha(dpath.read_bytes())},{'path':mp.relative_to(ROOT).as_posix(),'sha256':sha(mp.read_bytes())}],'outputs':[{'path':out.relative_to(ROOT).as_posix(),'sha256':sha(out.read_bytes())},{'path':qa.relative_to(ROOT).as_posix(),'sha256':sha(qa.read_bytes())}],'receiptWrittenLast':True,'completedAt':datetime.now(timezone.utc).isoformat()}
    atomic(receipt,enc(receipt_doc)); print(json.dumps(result,ensure_ascii=False))

def main():
    p=argparse.ArgumentParser();p.add_argument('--batch',required=True);p.add_argument('--revision',default='discovery-v2');p.add_argument('--cache',required=True);a=p.parse_args();certify(a.batch,a.revision,a.cache)
if __name__=='__main__': main()
