#!/usr/bin/env python3
"""Deterministic amendment review pack. Outputs are review records, never runtime nodes.

No official evidence is fabricated when a category observation has no validated source.
Run from the repository root. --rebuild permits intentional source changes; ordinary
resume verifies all derived bytes and rejects corruption before writing any file.
"""
import argparse, copy, hashlib, json, uuid
from collections import Counter, defaultdict
from pathlib import Path

BASE=Path('data/transport/nodes')
RULE='168149d0fc5570f5ed55297937c806bdf290d6b3'
LEVELS=['T0','T1','T2','T3','REVIEW_REQUIRED']
def enc(v): return (json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
def sha(b): return hashlib.sha256(b).hexdigest()
def load(p): return [json.loads(x) for x in Path(p).read_text(encoding='utf-8').splitlines() if x]
def tier(v): return 'T0' if v>=10000000 else 'T1' if v>=1000000 else 'T2' if v>=100000 else 'T3'
def counts(rows,key): return dict(sorted(Counter(r.get(key) or 'REVIEW_REQUIRED' for r in rows).items()))

def enrich_rail(rail,fallbacks):
    index=defaultdict(list)
    for f in fallbacks: index[(f['stationName'],f['operator'],f['modeFamily'])].append(f)
    result=[]; audit=[]
    for original in rail:
        r=copy.deepcopy(original)
        r['runtimeImportAuthorized']=False
        r['manualLevelReview']=r['usageValue'] is None
        if r['modeFamily']=='shinkansen':
            r['primaryUsageObservation']={k:r.get(k) for k in ['usageValue','usageMetricType','usageSource','usagePeriod','dataAvailabilityCode','duplicateCode','sourceArchiveSha256']}
            r['usageFallbackLevel']=1 if r['usageValue'] is not None else 6
            r['usageResearchStatus']='S12_NUMERIC' if r['usageValue'] is not None else 'ADDITIONAL_OFFICIAL_RESEARCH_REQUIRED'
            matches=sorted(index[(r['canonicalNameJa'],r['operatorRefs'][0],r['modeFamily'])],key=lambda f:f['fallbackPriority'])
            if r['usageValue'] is None and matches:
                f=matches[0]
                if len(matches)>1 and matches[1]['fallbackPriority']==f['fallbackPriority']: raise ValueError('AMBIGUOUS_FALLBACK')
                for k in ['usageValue','usageMetricType','usageUnit','usagePeriod','usageSource']: r[k]=f[k]
                r['usageEvidence']=f
                r['usageFallbackLevel']=f['fallbackPriority']
                r['usageResearchStatus']='OFFICIAL_NUMERIC_MANUAL_METRIC_REVIEW'
                r['manualLevelReview']=True
                r['usageSourceLicense']='SOURCE_SPECIFIC_REVIEW_REQUIRED'
                r['sourceLicenseScope']='S12 geometry and source observation only'
                r['sourceRefs']=sorted(set(r['sourceRefs']+[f['usageSource']]))
                r['decisionReason']='Official fallback retained in published scope/unit; tier remains null pending metric/manual review.'
                r['proposedNodeLevel']=None
            if r['usageValue'] is None:
                r['usageMetricType']='USAGE_DATA_UNAVAILABLE'; r['proposedNodeLevel']=None; r['manualLevelReview']=True
                r['usageUnavailableMeaning']='No admitted numeric observation in this evidence pack; not a claim that no official statistic exists.'
            r['levelDecisionVersion']='TASK-084-B-V2-AMENDMENT-18-REVIEW'
            audit.append({k:r.get(k) for k in ['proposedTransportNodeId','canonicalNameJa','operatorRefs','usageValue','usageMetricType','usageUnit','usagePeriod','usageSource','usageFallbackLevel','usageResearchStatus','manualLevelReview','proposedNodeLevel','usageEvidence','primaryUsageObservation']})
        result.append(r)
    return result,audit

AIRPORT_MIN_ANNUAL_PASSENGERS=1000

def airport_planning_status(value,inactive=False):
    if inactive: return 'EXCLUDED_INACTIVE'
    if value is None: return 'REVIEW_REQUIRED_MISSING_ANNUAL_USAGE'
    if value < AIRPORT_MIN_ANNUAL_PASSENGERS: return 'EXCLUDED_ANNUAL_PASSENGERS_BELOW_1000'
    return 'ELIGIBLE_PENDING_ACCEPTANCE'


def airports(observations,old_access,rail,prior):
    access={r['airportName'].removesuffix('空港'):r for r in old_access}
    idx=defaultdict(list)
    for r in rail: idx[(r['canonicalNameJa'],r['operatorRefs'][0])].append(r)
    access['美保']={'officialAccessGuide':'https://www.yonago-air.com/access/train','status':'CANDIDATES_PRESENT_FORMAL_ACCEPTANCE_PENDING','reason':'Official airport FAQ and train guide: covered walking connection to JR 米子空港駅, about five minutes.','expectedRailComponents':[{'stationName':'米子空港','operator':'西日本旅客鉄道'}]}
    access['札幌']={'officialAccessGuide':'https://okadama-airport.co.jp/access/','status':'OFF_AIRPORT_RAIL_TRANSFER_DOCUMENTED','reason':'栄町 requires bus about 5 minutes; 麻生 about 15 minutes. Not an on-airport rail station.','expectedRailComponents':[]}
    prior={r['canonicalNameJa'].removesuffix('空港'):r for r in prior}
    audits=[]; component_rows=[]
    defer={'福井':('https://www.pref.fukui.lg.jp/doc/fukui-airport/index.html','Official manager states no scheduled service; emergency/private/small-aircraft uses. Deferred from scheduled passenger backbone, not closed.'),'岡南':('https://www.pref.okayama.jp/page/879734.html','Official manager describes general aviation, police/fire, training and charter/sightseeing. Scheduled passenger backbone inclusion not supported.')}
    for o in observations:
        r=copy.deepcopy(o); name=r['officialName']; a=copy.deepcopy(access.get(name))
        checks=[]
        if a:
            for e in a['expectedRailComponents']:
                found=idx[(e['stationName'],e['operator'])]
                check={'airportName':name,'stationName':e['stationName'],'operator':e['operator'],'officialSource':a['officialAccessGuide'],'candidateTransportNodeIds':[x['proposedTransportNodeId'] for x in found],'status':'CANDIDATE_PRESENT_REVIEW_REQUIRED' if len(found)==1 else 'COMPONENT_MISSING' if not found else 'AMBIGUOUS_COMPONENT_REVIEW_REQUIRED'}
                checks.append(check); component_rows.append(check)
            a['expectedRailComponents']=checks
        r['accessReview']=a or {'status':'ACCESS_REVIEW_REQUIRED','officialAccessGuide':None,'expectedRailComponents':None,'reason':'Current official list/profile and annual volume checked; passenger access guide still required. Empty evidence is not NO_RAIL.'}
        r['currentServicesReview']='CURRENT_OPERATOR_TIMETABLE_REVIEW_REQUIRED'
        r['tourismRegionalRoleReview']='EXISTING_PASSENGER_AIRPORT_REVIEW' if r['annualUsage'] and r['annualUsage']['usageValue']>0 else 'FUNCTIONAL_RELEVANCE_REVIEW_REQUIRED'
        r['priorCandidateTransportNodeId']=prior.get(name,{}).get('transportNodeId')
        r['proposedNodeLevel']=tier(r['annualUsage']['usageValue']) if r['annualUsage'] and r['annualUsage']['usageValue']>0 else None
        r['decision']='REVIEW_REQUIRED'
        r['decisionReason']='Identity and annual usage audited; current service, v2 identity/lineage and inclusion acceptance remain open.'
        r['decisionEvidence']=[]
        if name=='礼文':
            assert r['lifecycleObservation']=='OFFICIALLY_SUSPENDED'
            r['decision']='CLOSED/INACTIVE'; r['decisionReason']='MLIT current airport profile explicitly suspends operation through 2031-03-31.'; r['decisionEvidence']=[r['profileEvidence']]; r['proposedNodeLevel']=None
        elif name in defer:
            r['decision']='DEFER_NOT_PLANNER_RELEVANT'; r['decisionReason']=defer[name][1]; r['decisionEvidence']=[{'url':defer[name][0]}]; r['proposedNodeLevel']=None
        annual=r['annualUsage']['usageValue'] if r['annualUsage'] else None
        r['planningInclusionStatus']=airport_planning_status(annual,r['decision']=='CLOSED/INACTIVE')
        r['minimumAnnualPassengers']=AIRPORT_MIN_ANNUAL_PASSENGERS
        r['thresholdEvidence']={'authority':'USER_INSTRUCTION','confirmedAt':'2026-09-30','metric':'ANNUAL_AIRPORT_PASSENGER_ENTRIES_EXITS','comparison':'usageValue < 1000 excludes; exactly 1000 remains eligible; null is unknown'}
        r['plannerCandidateEligible']=True if r['planningInclusionStatus']=='ELIGIBLE_PENDING_ACCEPTANCE' else None if annual is None else False
        if r['planningInclusionStatus']=='EXCLUDED_ANNUAL_PASSENGERS_BELOW_1000':
            r['decision']='DEFER_NOT_PLANNER_RELEVANT'
            r['decisionReason']='Excluded from planning candidates by confirmed annual-passenger threshold (<1000); this is not a closure finding.'
            r['decisionEvidence'].append(r['annualUsage']); r['proposedNodeLevel']=None
        r['auditScope']='ALL_97_IDENTITY_AND_OFFICIAL_USAGE_SCREENING_WITH_EXPLICIT_OPEN_FIELDS'
        r['runtimeImportAuthorized']=False
        audits.append(r)
    return audits,component_rows

# Explicit evidence crosswalks. A match links source observations for review; it
# does not authorize a canonical ID, a coordinate, a parent Hub or a usage value.
MLIT_LINKS={1:['02300-1007720'],3:['02300-1000564'],4:['02300-1007722'],5:['02300-1000566'],6:['02300-1000589'],8:['02300-1000563'],10:['02022-1323465'],12:['02022-10035028','02022-10117677'],15:['02022-16401'],17:['02022-1488534'],18:['00011-060222795'],19:['02300-1007787']}
SEED_LINKS={'バスタ新宿':['02301-1404524'],'東京駅JR高速バスターミナル':['02300-1008111','02300-1008112'],'バスターミナル東京八重洲':['02022-10035028','02022-10117677'],'札幌駅バスターミナル':['02300-1007720'],'名鉄バスセンター':['02022-16401'],'湊町バスターミナル（OCAT）':['00011-060222795'],'広島バスセンター':['02300-1007787']}
EXTRA_BUS={
 '02022-1040915':('https://www.miyakoh.co.jp/corp/inquiry/city.html','Operator identifies 宮交シティ内 bus center, address and waiting room; https://www.miyakoh.co.jp/rosen/noriba/miyakohcity.html documents platforms/services.','宮崎交通'),
 '20939-58':('https://www.miyakoh.co.jp/corp/inquiry/city.html','Official operator identifies same bus center and waiting room; physical crosswalk to the other discovery record needs explicit review.','宮崎交通'),
 '02022-1151040':('https://www.nouhibus.co.jp/route_bus/shirakawago/','Operator timetable confirms 高山濃飛バスセンター as service origin/destination.','濃飛乗合自動車'),
 '02022-1295403':('https://www.nouhibus.co.jp/route_bus/shirakawago/','Operator timetable confirms 白川郷バスターミナル and connections.','濃飛乗合自動車'),
 '02022-1380771':('https://www.pref.nara.jp/site/park/2687.html','Prefecture identifies terminal at 奈良市登大路町76. Charter-bus role needs separate planner relevance review.','奈良県')}

def buses(discovered,registered,seeds):
    linked_mlit=defaultdict(list); linked_seed=defaultdict(list)
    for m in registered:
        for ident in MLIT_LINKS.get(m['sourceRow'],[]): linked_mlit['navitime:'+ident].append(m)
    for s in seeds:
        for ident in SEED_LINKS.get(s['canonicalNameJa'],[]): linked_seed['navitime:'+ident].append(s)
    result=[]
    def make(key,name,discovery=None,mlit=None,seed=None,extra=None):
        mlit=mlit or []; seed=seed or []
        official=[{'url':m['sourceUrl'],'sourceSha256':m['sourceSha256'],'sourcePage':1,'sourceRow':m['sourceRow'],'evidenceType':'REGISTERED_FACILITY_OPERATOR_ADDRESS_BERTHS','observations':m} for m in mlit]
        official += [{'url':s['facilitySource'],'evidenceType':'PRIOR_OFFICIAL_FACILITY_REVIEW','priorCandidateTransportNodeId':s['proposedTransportNodeId']} for s in seed]
        if extra: official.append({'url':extra[0],'evidenceType':'OFFICIAL_IDENTITY_FACILITY_OR_SERVICES_PARTIAL','observation':extra[1],'operator':extra[2]})
        usage=next((s for s in seed if s['usageValue'] is not None),None)
        inactive=any(s['operatingStatus'].startswith('CLOSED') for s in seed)
        row={'candidateReviewId':key,'name':name,'discovery':discovery,'officialEvidence':official,'officialIdentityFacilityStatus':'PARTIAL_OFFICIAL_EVIDENCE' if official else 'OFFICIAL_VALIDATION_REQUIRED','officialCoordinatesStatus':'REVIEW_REQUIRED','latitude':None,'longitude':None,'operatorsServicesStatus':'PARTIAL_OFFICIAL_EVIDENCE' if mlit or extra else 'REVIEW_REQUIRED','usageMetricType':usage['usageMetricType'] if usage else 'USAGE_DATA_UNAVAILABLE','usageValue':usage['usageValue'] if usage else None,'usageSource':usage['usageSource'] if usage else None,'usagePeriod':usage['usagePeriod'] if usage else None,'proposedNodeLevel':usage['proposedNodeLevel'] if usage else None,'manualLevelReview':usage is None,'physicalFacilityDedupStatus':'OFFICIAL_CROSSWALK_REVIEW_REQUIRED','decision':'CLOSED/INACTIVE' if inactive else 'REVIEW_REQUIRED','fullyOfficialValidated':False,'runtimeImportAuthorized':False,'unresolvedFields':['OFFICIAL_COORDINATES','PHYSICAL_FACILITY_DEDUP','CURRENT_OPERATOR_SERVICES','USAGE_OR_FUNCTIONAL_TIER_REVIEW']}
        if not official: row['unresolvedFields'].insert(0,'OFFICIAL_IDENTITY_FACILITY')
        if inactive: row['decisionReason']='Current Sapporo municipality closure evidence takes precedence over continuing appearance in registered-terminal list.'
        if discovery and discovery['discoveryRecordId'] in ['navitime:02022-10035028','navitime:02022-10117677']:
            row['crosswalkCaution']='MLIT registered project spans phases; underground A and B remain separate facility candidates until official facility-boundary review.'
        return row
    for d in discovered:
        ident=d['discoveryRecordId']; result.append(make(ident,d['discoveryName'],d,linked_mlit[ident],linked_seed[ident],EXTRA_BUS.get(ident.split(':',1)[1])))
    covered_seed=set(SEED_LINKS)
    for m in registered:
        if MLIT_LINKS.get(m['sourceRow']): continue
        matched=[s for s in seeds if s['canonicalNameJa']==m['officialName']]
        covered_seed.update(s['canonicalNameJa'] for s in matched)
        result.append(make(m['observationId'],m['officialName'],mlit=[m],seed=matched))
    for s in seeds:
        if s['canonicalNameJa'] not in covered_seed: result.append(make('prior:'+s['proposedTransportNodeId'],s['canonicalNameJa'],seed=[s]))
    return sorted(result,key=lambda r:r['candidateReviewId'])

def hub_reviews(rail,old_hubs,definitions):
    index=defaultdict(list)
    for r in rail: index[(r['canonicalNameJa'],r['operatorRefs'][0],r['modeFamily'])].append(r)
    old={h['canonicalNameJa']:h for h in old_hubs}; out=[]; coverage={}
    for definition in definitions:
        name=definition['hubReviewName']; documented=definition['boundaryEvidenceStatus']=='DOCUMENTED_INTERCHANGE'
        evidence=definition['boundaryEvidence']
        if documented and not evidence: raise ValueError('HUB_BOUNDARY_EVIDENCE_REQUIRED')
        hub_id='transport-hub-review:'+str(uuid.uuid5(uuid.NAMESPACE_URL,'TravelAssist/TASK-084-B/v2/hub/'+definition['hubReviewKey']))
        components=[]; component_levels=[]
        for expected in definition['components']:
            station,op,mode=(expected[k] for k in ['stationName','operator','modeFamily'])
            matches=index[(station,op,mode)]
            if expected.get('sourceGroupCodes'):
                matches=[r for r in matches if any(x['groupCode'] in expected['sourceGroupCodes'] for x in r['sourceStationRefs'])]
            component={**expected,'candidateTransportNodeIds':[r['proposedTransportNodeId'] for r in matches],'status':'PRESENT_COMPONENT_REVIEW_REQUIRED' if len(matches)==1 else 'MISSING_OPERATOR_MODE' if not matches else 'MULTIPLE_COMPONENT_IDENTITIES_REVIEW_REQUIRED','proposedParentHubId':hub_id if documented and len(matches)==1 else None,'lineRefs':sorted({line for r in matches for line in r['lineRefs']}),'componentLevels':[r['proposedNodeLevel'] for r in matches]}
            components.append(component)
            for r in matches:
                coverage.setdefault(r['proposedTransportNodeId'],[]).append(name)
                if r['proposedNodeLevel']: component_levels.append(r['proposedNodeLevel'])
        prior_names=definition['supersedesReviewNames']
        prior_ids=sorted({old[n]['hubId'] for n in prior_names if n in old})
        proposed_level=min(component_levels,key=LEVELS.index) if component_levels else None
        out.append({'hubReviewName':name,'proposedHubId':hub_id,'regionReviewScope':definition['region'],'cityReviewArea':definition['cityReviewArea'],'priorHubId':prior_ids[0] if len(prior_ids)==1 else None,'priorHubIds':prior_ids,'priorReviewNames':prior_names,'priorHubLevel':old.get(name,{}).get('nodeLevel'),'officialStationGuideLeads':sorted({e['url'] for e in evidence}),'boundaryEvidence':evidence,'expectedComponents':components,'expectationScope':'OFFICIAL_RAIL_INTERCHANGE_COMPONENT_INVENTORY' if documented else 'MINIMUM_OPERATOR_MODE_REVIEW_NOT_EXHAUSTIVE','status':'COMPONENT_REVIEW_REQUIRED','missingOperatorModeCount':sum(c['status']=='MISSING_OPERATOR_MODE' for c in components),'ambiguousComponentCount':sum(c['status']=='MULTIPLE_COMPONENT_IDENTITIES_REVIEW_REQUIRED' for c in components),'proposedHubLevel':proposed_level,'proposedHubLevelMethod':'HIGHEST_KNOWN_COMPONENT_TIER_FOR_REVIEW_NO_PASSENGER_SUM','v2HubLevel':None,'parentHubAssignmentAuthorized':False,'officialInterchangeBoundaryReview':definition['boundaryEvidenceStatus'],'sameNameMergeUsed':False,'distanceOnlyMergeUsed':False,'notes':definition['boundaryScope'],'operatorLineageReview':definition.get('operatorLineageReview')})
    membership={}
    for h in out:
        for c in h['expectedComponents']:
            if c['proposedParentHubId']:
                for ident in c['candidateTransportNodeIds']:
                    if ident in membership and membership[ident]!=h['proposedHubId']: raise ValueError('CONFLICTING_PROPOSED_HUB_MEMBERSHIP: '+ident)
                    membership[ident]=h['proposedHubId']
    for r in rail:
        r['proposedParentHubId']=membership.get(r['proposedTransportNodeId'])
        r['parentHubAssignmentAuthorized']=False
        if r['operatorRefs']==['泉北高速鉄道']:
            r['currentOperatorReview']={'historicalSourceOperator':'泉北高速鉄道','documentedSuccessor':'南海電気鉄道','effectiveDate':'2025-04-01','officialSource':'https://www.nankai.co.jp/news/241101_1.html','status':'HISTORICAL_S12_OPERATOR_IDENTITY_REVIEW_REQUIRED','identityRebound':False}
    high=[{'candidateTransportNodeId':r['proposedTransportNodeId'],'stationName':r['canonicalNameJa'],'operator':r['operatorRefs'][0],'modeFamily':r['modeFamily'],'proposedNodeLevel':r['proposedNodeLevel'],'reviewScopes':coverage.get(r['proposedTransportNodeId'],[]),'proposedParentHubId':membership.get(r['proposedTransportNodeId']),'status':'DOCUMENTED_HUB_COMPONENT_REVIEW_REQUIRED' if r['proposedTransportNodeId'] in membership else 'HUB_SCOPE_EVIDENCE_REVIEW_REQUIRED' if coverage.get(r['proposedTransportNodeId']) else 'HUB_AUDIT_SCOPE_NOT_YET_ESTABLISHED'} for r in rail if r['proposedNodeLevel'] in ('T0','T1')]
    return out,high


def distributions(rail,airports,bus,hubs):
    out=[]
    def add(scope,rows,dim,func,level):
        groups=defaultdict(Counter)
        for r in rows: groups[func(r)][r.get(level) or 'REVIEW_REQUIRED']+=1
        for group,c in sorted(groups.items()): out.append({'scope':scope,'dimension':dim,'group':group,**{k:c[k] for k in LEVELS},'total':sum(c.values())})
    add('RAIL_COMPONENT_CANDIDATE',rail,'mode',lambda r:r['modeFamily'],'proposedNodeLevel')
    def family(r):
        op=r['operatorRefs'][0]
        return {'東日本旅客鉄道':'JR East','東海旅客鉄道':'JR Central','西日本旅客鉄道':'JR West','九州旅客鉄道':'JR Kyushu','北海道旅客鉄道':'JR Hokkaido','四国旅客鉄道':'JR Shikoku'}.get(op,'Municipal/Metro' if r['modeFamily']=='metro' else 'Private/Other')
    add('RAIL_COMPONENT_CANDIDATE',rail,'operator_family',family,'proposedNodeLevel')
    add('RAIL_COMPONENT_CANDIDATE',rail,'operator',lambda r:r['operatorRefs'][0],'proposedNodeLevel')
    add('AIRPORT_PLANNING_CANDIDATE_PROPOSED_ONLY',[r for r in airports if r['plannerCandidateEligible'] is True],'mode',lambda r:'airport','proposedNodeLevel')
    add('BUS_SOURCE_REVIEW_RECORD_NOT_DEDUPED_FACILITY',bus,'mode',lambda r:'bus_terminal','proposedNodeLevel')
    add('HUB_BOUNDARY_REVIEW_SCOPE',hubs,'entity_layer',lambda r:'Hub','proposedHubLevel')
    return out

def build(a):
    sources=Path(a.evidence); discovery=Path(a.discovery)
    inputs={}
    def read(p): inputs[str(p).replace('\\','/')]=sha(p.read_bytes()); return load(p)
    rail,shinkansen=enrich_rail(read(Path(a.rail)/'rail-components.jsonl'),read(sources/'shinkansen-official-fallbacks.jsonl'))
    previous=read(sources/'previous-v2-rail-identities.jsonl')
    def key(r): return (r['canonicalNameJa'],tuple(r['operatorRefs']),r['sourcePrimaryStationCode'],r['sourcePrimaryLine'])
    prior_index={key(r):r for r in previous}; revisions=[]
    assert len(prior_index)==len(previous)
    for r in rail:
        prior=prior_index.get(key(r))
        if prior is None or prior['proposedTransportNodeId']!=r['proposedTransportNodeId'] or prior['modeFamily']!=r['modeFamily']:
            revisions.append({'stationName':r['canonicalNameJa'],'operator':r['operatorRefs'][0],'previousCandidateId':prior['proposedTransportNodeId'] if prior else None,'currentCandidateId':r['proposedTransportNodeId'],'previousMode':prior['modeFamily'] if prior else None,'currentMode':r['modeFamily'],'decision':'ADDED_OFFICIAL_HUB_COMPONENT_REVIEW' if prior is None else 'EXPLICIT_CANDIDATE_MODE_CORRECTION','previousRevision':'36d899d3899ba9ff292a27cfa2d43de8ce40674f','formalAcceptedIdentityRebound':False})
    airport,access=airports(read(sources/'airport-official-observations.jsonl'),read(BASE/'task-084-b-v2-airport-access-review/airport-access-audit.jsonl'),rail,read(BASE/'task-084-b-v2-airport-review/transport-nodes.jsonl'))
    bus=buses(read(discovery/'navitime-discovered-candidates.jsonl'),read(sources/'bus-mlit-registered-facilities.jsonl'),read(BASE/'task-084-b-v2-bus-review/national-bus-terminal-inventory.jsonl'))
    retrievals=read(sources/'official-url-retrievals.jsonl'); retrieval_index={r['url']:r for r in retrievals}
    for r in bus:
        for e in r['officialEvidence']: e['latestUrlRetrieval']=retrieval_index.get(e['url'])
    for r in airport:
        r['accessReview']['latestUrlRetrieval']=retrieval_index.get(r['accessReview']['officialAccessGuide'])
    hubs,hub_gate=hub_reviews(rail,read(BASE/'task-084-b-national-master/transport-hubs.jsonl'),read(sources/'hub-interchange-definitions.jsonl'))
    read(sources/'osaka-official-transfer-observations.jsonl')
    read(sources/'mode-classification-evidence.json')
    baseline=read(sources/'hub-city-baseline.jsonl')
    cities=[]
    for city in sorted({h['cityReviewArea'] for h in hubs}|{h['cityReviewArea'] for h in baseline}):
        current=[h for h in hubs if h['cityReviewArea']==city]
        prior=[h for h in baseline if h['cityReviewArea']==city]
        cities.append({'cityReviewArea':city,'labelType':'EDITORIAL_COVERAGE_GROUP_NOT_ADMINISTRATIVE_ASSIGNMENT','baselineCommit':baseline[0]['baselineCommit'],'previousHubScopes':len(prior),'currentHubScopes':len(current),'addedHubScopes':len(current)-len(prior),'previousExpectedComponents':sum(h['expectedComponents'] for h in prior),'currentExpectedComponents':sum(len(h['expectedComponents']) for h in current),'documentedInterchangeScopes':sum(h['officialInterchangeBoundaryReview']=='DOCUMENTED_INTERCHANGE' for h in current),'boundaryPendingScopes':sum(h['officialInterchangeBoundaryReview']!='DOCUMENTED_INTERCHANGE' for h in current),'missingComponents':sum(h['missingOperatorModeCount'] for h in current),'ambiguousComponents':sum(h['ambiguousComponentCount'] for h in current),'formallyAcceptedHubs':0,'nationwideCoverageComplete':False,'hubNames':[h['hubReviewName'] for h in current]})
    distributions_rows=distributions(rail,airport,bus,hubs)
    rows={'hub-city-coverage-review.jsonl':cities,'rail-components.jsonl':rail,'shinkansen-usage-review.jsonl':shinkansen,'airport-97-audit.jsonl':airport,'airport-planning-candidates.jsonl':[r for r in airport if r['plannerCandidateEligible'] is True],'airport-rail-components.jsonl':access,'bus-candidate-official-review.jsonl':bus,'hub-component-completeness-review.jsonl':hubs,'high-tier-hub-coverage-gate.jsonl':hub_gate,'tier-distributions.jsonl':distributions_rows,'candidate-revision-lineage.jsonl':revisions}
    artifacts={name:b''.join(enc(x) for x in rs) for name,rs in rows.items()}
    batches=[]
    for start in range(0,len(rail),200):
        name=f'batches/batch-{start//200+1:04}.jsonl'; body=b''.join(enc(x) for x in rail[start:start+200]); artifacts[name]=body
        receipt={'file':name,'count':len(rail[start:start+200]),'sha256':sha(body)}; batches.append(receipt); artifacts[name.replace('batches/','batch-receipts/').replace('.jsonl','.json')]=enc(receipt)
    manifest={'task':'TASK-084-B','rulesCommit':RULE,'stage':'V2_AMENDMENT_15_18_REVIEW','nationalMasterStatus':'REWORK_IN_PROGRESS','runtimeImportAuthorized':False,'nationalMasterPass':False,'formalAcceptedV2NodeCount':0,'downstream085Authorized':False,'downstream086Authorized':False,'n03ProductionJoinExecuted':False,
      'rail':{'candidateComponents':len(rail),'shinkansenComponents':len(shinkansen),'numericS12':sum(s['usageFallbackLevel']==1 for s in shinkansen),'operatorOfficialNumeric':sum(s['usageFallbackLevel']==2 for s in shinkansen),'stationComplexProxy':sum(s['usageMetricType']=='STATION_COMPLEX_PROXY' for s in shinkansen),'usageUnavailable':sum(s['usageValue'] is None for s in shinkansen),'manualLevelReviewCount':sum(s['manualLevelReview'] for s in shinkansen),'proposedTierCounts':counts(rail,'proposedNodeLevel')},
      'airport':{'officialIdentities':len(airport),'minimumAnnualPassengers':AIRPORT_MIN_ANNUAL_PASSENGERS,'planningCandidates':sum(r['plannerCandidateEligible'] is True for r in airport),'annualUsageBelowThreshold':sum(r['annualUsage'] is not None and r['annualUsage']['usageValue']<AIRPORT_MIN_ANNUAL_PASSENGERS for r in airport),'unknownAnnualUsage':sum(r['annualUsage'] is None for r in airport),'planningInclusionCounts':counts(airport,'planningInclusionStatus'),'categoryCounts':counts(airport,'category'),'identityAudited':len(airport),'annualNumeric':sum(r['annualUsage'] is not None for r in airport),'decisionCounts':counts(airport,'decision'),'missingIdentityCount':0,'accessGuidesReviewed':sum(r['accessReview']['officialAccessGuide'] is not None for r in airport),'accessReviewRequired':sum(r['accessReview']['officialAccessGuide'] is None for r in airport),'expectedRailComponents':len(access),'presentRailComponents':sum(r['status']=='CANDIDATE_PRESENT_REVIEW_REQUIRED' for r in access),'missingRailComponents':sum(r['status']=='COMPONENT_MISSING' for r in access),'railAirportCount':len(set(r['airportName'] for r in access)),'fullAcceptanceAuditPass':False},
      'bus':{'discoveredCandidateReviewRecordsTotal':len(bus),'navitimeDiscovered':sum(r['discovery'] is not None for r in bus),'officialRegisteredFacilities':26,'officialEvidenceAttached':sum(bool(r['officialEvidence']) for r in bus),'navitimeOfficialEvidenceAttached':sum(r['discovery'] is not None and bool(r['officialEvidence']) for r in bus),'fullyOfficialSourceValidated':sum(r['fullyOfficialValidated'] for r in bus),'decisionCounts':counts(bus,'decision'),'physicalFacilityDedupComplete':False,'uniquePhysicalFacilityCount':None,'officialNumericUsage':sum(r['usageValue'] is not None for r in bus)},
      'hubs':{'cityReviewGroupCount':len(cities),'previousReviewScopes':len(baseline),'addedReviewScopes':len(hubs)-len(baseline),'reviewScopes':len(hubs),'expectedComponents':sum(len(h['expectedComponents']) for h in hubs),'documentedInterchangeScopes':sum(h['officialInterchangeBoundaryReview']=='DOCUMENTED_INTERCHANGE' for h in hubs),'osakaReviewScopes':sum(h['regionReviewScope'].startswith('OSAKA_') for h in hubs),'proposedMembershipCount':sum(r.get('proposedParentHubId') is not None for r in rail),'ambiguousComponentExpectations':sum(h['ambiguousComponentCount'] for h in hubs),'complete':0,'componentReviewRequired':len(hubs),'missingOperatorModeExpectations':sum(h['missingOperatorModeCount'] for h in hubs),'highTierComponentCount':len(hub_gate),'highTierWithoutEstablishedHubAuditScope':sum(not r['reviewScopes'] for r in hub_gate),'nationwideHubAuditComplete':False},
      'candidateRevisionCounts':counts(revisions,'decision'),'officialSourceUrlChecks':{'attempted':len(retrievals),'fetched':sum(r['status']=='FETCHED' for r in retrievals),'failed':sum(r['status']=='FETCH_FAILED' for r in retrievals)},
      'inputSha256':inputs,'batchSize':200,'batches':batches,'artifactSha256':{n:sha(b) for n,b in artifacts.items()},'blockers':['BUS_OFFICIAL_VALIDATION_AND_PHYSICAL_DEDUP_INCOMPLETE','AIRPORT_FULL_FIELD_ACCEPTANCE_INCOMPLETE','HUB_OPERATOR_MODE_BOUNDARY_AUDIT_INCOMPLETE','SHINKANSEN_METRIC_MANUAL_REVIEWS_PENDING','V2_LINEAGE_AND_FINAL_ACCEPTANCE_PENDING']}
    artifacts['manifest.json']=enc(manifest)
    return artifacts,manifest

def run(a):
    artifacts,manifest=build(a); root=Path(a.output)
    # Validate all existing files before any write: no partial overwrite on failure.
    for n,b in artifacts.items():
        p=root/n
        if p.exists() and not a.rebuild and p.read_bytes()!=b: raise RuntimeError('CORRUPTED_OR_CHANGED_INPUT: '+n)
    for n,b in artifacts.items():
        p=root/n; p.parent.mkdir(parents=True,exist_ok=True)
        if not p.exists() or a.rebuild: p.write_bytes(b)
    print(json.dumps({k:manifest[k] for k in ['nationalMasterStatus','rail','airport','bus','hubs']},ensure_ascii=False))

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--evidence',default='data/transport/nodes/task-084-b-v2-official-evidence'); p.add_argument('--discovery',default='data/transport/nodes/task-084-b-v2-bus-discovery'); p.add_argument('--rail',default='data/transport/nodes/task-084-b-v2-rail-candidates'); p.add_argument('--output',default='data/transport/nodes/task-084-b-v2-amendment-review'); p.add_argument('--rebuild',action='store_true'); run(p.parse_args())
