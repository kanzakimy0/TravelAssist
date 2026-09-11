#!/usr/bin/env python3
import concurrent.futures as cf
import hashlib, json, math, os, re, sys, time, unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import requests
from rapidfuzz.fuzz import ratio
from shapely.geometry import Point, shape
from shapely.strtree import STRtree

GEN_VERSION = "poi-source-enrichment-v3.8"
WIKIDATA_API = "https://www.wikidata.org/w/api.php"
UA = "TravelAssist-POI-Pipeline/3.8 (https://github.com/kanzakimy0/TravelAssist)"
PREFS = {
1:"北海道",2:"青森県",3:"岩手県",4:"宮城県",5:"秋田県",6:"山形県",7:"福島県",8:"茨城県",9:"栃木県",10:"群馬県",11:"埼玉県",12:"千葉県",13:"東京都",14:"神奈川県",15:"新潟県",16:"富山県",17:"石川県",18:"福井県",19:"山梨県",20:"長野県",21:"岐阜県",22:"静岡県",23:"愛知県",24:"三重県",25:"滋賀県",26:"京都府",27:"大阪府",28:"兵庫県",29:"奈良県",30:"和歌山県",31:"鳥取県",32:"島根県",33:"岡山県",34:"広島県",35:"山口県",36:"徳島県",37:"香川県",38:"愛媛県",39:"高知県",40:"福岡県",41:"佐賀県",42:"長崎県",43:"熊本県",44:"大分県",45:"宮崎県",46:"鹿児島県",47:"沖縄県"}
REGIONS = {
"JP-HOKKAIDO": {"name_ja":"北海道地方","pref_codes":[1]},
"JP-TOHOKU": {"name_ja":"東北地方","pref_codes":list(range(2,8))},
"JP-KANTO": {"name_ja":"関東地方","pref_codes":list(range(8,15))},
"JP-CHUBU": {"name_ja":"中部地方","pref_codes":list(range(15,24))},
"JP-KINKI": {"name_ja":"近畿地方","pref_codes":list(range(24,31))},
"JP-CHUGOKU": {"name_ja":"中国地方","pref_codes":list(range(31,36))},
"JP-SHIKOKU": {"name_ja":"四国地方","pref_codes":list(range(36,40))},
"JP-KYUSHU-OKINAWA": {"name_ja":"九州・沖縄地方","pref_codes":list(range(40,48))},
}
REGION_BY_PREF = {p:k for k,v in REGIONS.items() for p in v["pref_codes"]}

# Strong current-reference types/descriptions. We still do not infer public access from these.
RELEVANT_DESC = ("史跡","遺跡","神社","寺","寺院","城","城跡","古墳","貝塚","文化財","歴史","historic","shrine","temple","castle","archaeological","heritage","ruins")

session = requests.Session(); session.headers.update({"User-Agent": UA})

def read_jsonl(path):
    out=[]
    with open(path,encoding="utf-8") as f:
        for line in f:
            if line.strip(): out.append(json.loads(line))
    return out

def dump_jsonl(path, rows):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path,"w",encoding="utf-8",newline="\n") as f:
        for r in rows: f.write(json.dumps(r,ensure_ascii=False,separators=(",",":"))+"\n")

def norm(s):
    s=unicodedata.normalize("NFKC", s or "").lower()
    s=re.sub(r"[\s　・･,，.。/／()（）\[\]【】『』「」'\"‐‑‒–—―ー_-]+","",s)
    return s

def hav_km(a,b,c,d):
    R=6371.0088
    p1,p2=math.radians(a),math.radians(c)
    dp=math.radians(c-a); dl=math.radians(d-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(min(1,math.sqrt(x)))

def get_claim_entity(claim):
    try:return claim["mainsnak"]["datavalue"]["value"]["id"]
    except:return None

def get_coord(ent):
    try:
        v=ent["claims"]["P625"][0]["mainsnak"]["datavalue"]["value"]
        return float(v["latitude"]),float(v["longitude"])
    except:return None

def get_string_claims(ent, prop):
    vals=[]
    for c in ent.get("claims",{}).get(prop,[]):
        try:
            v=c["mainsnak"]["datavalue"]["value"]
            if isinstance(v,str): vals.append(v)
        except: pass
    return vals

def wd_search(name):
    params={"action":"wbsearchentities","search":name,"language":"ja","uselang":"ja","type":"item","limit":5,"format":"json"}
    for attempt in range(3):
        try:
            r=requests.get(WIKIDATA_API,params=params,headers={"User-Agent":UA},timeout=12)
            if r.status_code==429: time.sleep(1.0+attempt); continue
            r.raise_for_status(); return r.json().get("search",[])
        except Exception:
            if attempt==2:return []
            time.sleep(.3*(attempt+1))
    return []

def batch_entities(qids):
    out={}
    qs=sorted(set(qids))
    for i in range(0,len(qs),50):
        batch=qs[i:i+50]
        params={"action":"wbgetentities","ids":"|".join(batch),"props":"labels|descriptions|claims|sitelinks","languages":"ja|en","format":"json"}
        for attempt in range(3):
            try:
                r=session.get(WIKIDATA_API,params=params,timeout=20); r.raise_for_status()
                out.update(r.json().get("entities",{})); break
            except Exception:
                if attempt==2: break
                time.sleep(.5*(attempt+1))
    return out

def build_admin_index(admin_docs):
    geoms=[]; metas=[]
    for pref_dir in sorted(Path(admin_docs).glob("[0-9][0-9]")):
        pref=int(pref_dir.name)
        for fp in pref_dir.glob("*.json"):
            try:
                code=fp.stem
                if not re.fullmatch(r"\d{5}",code): continue
                obj=json.load(open(fp,encoding="utf-8"))
                feats=obj.get("features",[])
                if not feats: continue
                # Usually one feature; union is unnecessary because files are already one municipality/ward feature.
                for feat in feats:
                    geom=shape(feat["geometry"])
                    nm=feat.get("properties",{}).get("name") or ""
                    geoms.append(geom); metas.append({"pref_code":pref,"admin_code":code,"full_name":nm,"source_file":str(fp)})
            except Exception: continue
    return geoms, metas, STRtree(geoms)

def map_admin(row, geoms, metas, tree):
    pt=Point(float(row["longitude"]),float(row["latitude"]))
    candidates=tree.query(pt)
    hits=[]
    for idx in candidates:
        g=geoms[int(idx)]
        if g.covers(pt): hits.append(metas[int(idx)])
    if not hits:
        return None
    # Boundary duplicates: prefer the smallest geometry (more specific ward/municipality).
    hits=sorted(hits,key=lambda m: geoms[metas.index(m)].area if m in metas else 999)
    m=hits[0]
    pref_name=PREFS[m["pref_code"]]
    admin_name=m["full_name"]
    if admin_name.startswith(pref_name): admin_name=admin_name[len(pref_name):]
    return {"prefecture_code_jisx0401":f"{m['pref_code']:02d}","prefecture_name_ja":pref_name,
            "municipality_code_jisx0402":m["admin_code"],"municipality_name_ja":admin_name,
            "admin_boundary_source":"geolonia/japanese-admins derived from MLIT N03","admin_boundary_ref":f"https://geolonia.github.io/japanese-admins/{m['pref_code']:02d}/{m['admin_code']}.json"}

def choose_wd(row, search_results, ents):
    target=norm(row["name_ja"]); best=None
    for s in search_results:
        q=s.get("id"); ent=ents.get(q,{})
        labels=[]
        for lang in ("ja","en"):
            lab=ent.get("labels",{}).get(lang,{}).get("value")
            if lab: labels.append(lab)
        if s.get("label"): labels.append(s["label"])
        if not labels: continue
        nscore=max(ratio(target,norm(x))/100 for x in labels if x)
        desc=(ent.get("descriptions",{}).get("ja",{}).get("value") or s.get("description") or "").lower()
        coord=get_coord(ent)
        dist=None
        if coord: dist=hav_km(float(row["latitude"]),float(row["longitude"]),coord[0],coord[1])
        p4275=get_string_claims(ent,"P4275")
        p856=get_string_claims(ent,"P856")
        relevant=any(x.lower() in desc for x in RELEVANT_DESC) or bool(p4275)
        # exact-ish name is required; coordinates can be looser for source-published historical points.
        accepted=False
        if coord and nscore>=0.92 and dist is not None and dist<=3.0: accepted=True
        elif coord and nscore>=0.80 and dist is not None and dist<=0.8 and relevant: accepted=True
        elif p4275 and nscore>=0.92 and (dist is None or dist<=10.0): accepted=True
        score=nscore + (0.15 if p4275 else 0) + (0.05 if p856 else 0) + (0.05 if relevant else 0) - (min(dist,20)/100 if dist is not None else 0.08)
        cand={"qid":q,"labels":labels,"description":desc or None,"name_similarity":round(nscore,4),"distance_km":None if dist is None else round(dist,4),"p4275":p4275,"official_urls":p856,"accepted":accepted,"score":score}
        if best is None or cand["score"]>best["score"]: best=cand
    return best if best and best["accepted"] else None

def main():
    if len(sys.argv)!=4:
        raise SystemExit("usage: script identity.jsonl japanese-admins/docs outdir")
    inp, admin_docs, outdir=sys.argv[1:]
    rows=read_jsonl(inp)
    if len(rows)!=5021: raise RuntimeError(f"expected 5021 rows, got {len(rows)}")
    Path(outdir).mkdir(parents=True,exist_ok=True)
    print("building admin index")
    geoms,metas,tree=build_admin_index(admin_docs)
    print("admin polygons",len(geoms))
    admin_maps=[]; admin_unmapped=[]; pref_corrections=[]
    for r in rows:
        m=map_admin(r,geoms,metas,tree)
        if m:
            admin_maps.append({"expansion_slot_id":r["expansion_slot_id"],"master_code":r["effective_master_code"],**m})
            expected=f"000{int(m['prefecture_code_jisx0401']):02d}"
            if r.get("prefecture_id")!=expected:
                pref_corrections.append({"expansion_slot_id":r["expansion_slot_id"],"master_code":r["effective_master_code"],"name_ja":r["name_ja"],"old_prefecture_id":r.get("prefecture_id"),"correct_prefecture_id":expected,"municipality_code_jisx0402":m["municipality_code_jisx0402"],"evidence":m["admin_boundary_ref"]})
        else:
            admin_unmapped.append({"expansion_slot_id":r["expansion_slot_id"],"master_code":r["effective_master_code"],"name_ja":r["name_ja"],"latitude":r["latitude"],"longitude":r["longitude"]})
    amap={x["expansion_slot_id"]:x for x in admin_maps}
    print("admin mapped",len(amap),"unmapped",len(admin_unmapped),"pref corrections",len(pref_corrections))

    print("wikidata searches")
    searches={}
    with cf.ThreadPoolExecutor(max_workers=16) as ex:
        futs={ex.submit(wd_search,r["name_ja"]):r["expansion_slot_id"] for r in rows}
        for n,f in enumerate(cf.as_completed(futs),1):
            searches[futs[f]]=f.result()
            if n%500==0: print("searched",n)
    qids=[]
    for arr in searches.values(): qids.extend([x.get("id") for x in arr if x.get("id")])
    ents=batch_entities(qids)
    print("wikidata entities",len(ents))

    enriched=[]; evidence=[]; low=[]
    now=datetime.now(timezone.utc).isoformat()
    for r in rows:
        a=amap.get(r["expansion_slot_id"])
        wd=choose_wd(r,searches.get(r["expansion_slot_id"],[]),ents)
        x=dict(r)
        # Correct only prefecture_id because its external convention already exists. Do not invent TravelAssist city/district IDs.
        if a:
            corrected_pref=f"000{int(a['prefecture_code_jisx0401']):02d}"
            x["prefecture_id"]=corrected_pref
            x["admin_prefecture_code_jisx0401"]=a["prefecture_code_jisx0401"]
            x["admin_prefecture_name_ja"]=a["prefecture_name_ja"]
            x["admin_municipality_code_jisx0402"]=a["municipality_code_jisx0402"]
            x["admin_municipality_name_ja"]=a["municipality_name_ja"]
            x["admin_boundary_source"]=a["admin_boundary_source"]
            x["admin_boundary_ref"]=a["admin_boundary_ref"]
            x["region_key"]=REGION_BY_PREF.get(int(a["prefecture_code_jisx0401"]))
        else:
            x["admin_prefecture_code_jisx0401"]=None;x["admin_prefecture_name_ja"]=None;x["admin_municipality_code_jisx0402"]=None;x["admin_municipality_name_ja"]=None;x["admin_boundary_source"]=None;x["admin_boundary_ref"]=None;x["region_key"]=None
        # Internal registries do not yet exist; null is intentional, not unknown encoded as 0.
        x["city_id"]=None; x["district_id"]=None; x["region_id"]=None
        x["city_id_status"]="external_admin_code_available_internal_registry_missing" if a else "admin_mapping_unresolved"
        x["district_id_status"]="internal_registry_missing"
        x["region_id_status"]="region_key_available_internal_registry_missing" if x.get("region_key") else "region_mapping_unresolved"
        x["official_url"]=None
        x["opening_hours"]=None;x["last_entry"]=None;x["closed_days"]=None;x["adult_price_jpy"]=None;x["child_price_jpy"]=None;x["is_free"]=None;x["reservation_required"]=None
        x["deterministic_enrichment_version"]=GEN_VERSION;x["deterministic_updated_at"]=now
        if wd:
            x["wikidata_id"]=wd["qid"]
            x["official_url"]=wd["official_urls"][0] if wd["official_urls"] else None
            if wd["p4275"]:
                cp=wd["p4275"][0]
                x["modern_visitability_status"]="verified_current_national_cultural_property_identity_public_access_unknown"
                x["physical_poi_review_status"]="current_identity_verified_public_access_review_needed"
                x["authority_url"]=f"https://kunishitei.bunka.go.jp/heritage/detail/{cp}"
                x["source_ready"]=True
                x["source_ready_scope"]="identity_and_feature_enrichment_not_public_access"
                x["deterministic_confidence"]=0.96 if wd["distance_km"] is not None else 0.90
                x["review_status"]="auto_approved_identity_only"
                method="wikidata_name_coordinate_plus_bunka_property_id"
            else:
                x["modern_visitability_status"]="current_structured_reference_match_public_access_unknown"
                x["physical_poi_review_status"]="second_review_current_presence"
                x["authority_url"]=None
                x["source_ready"]=False
                x["source_ready_scope"]=None
                x["deterministic_confidence"]=0.82
                x["review_status"]="second_review"
                method="wikidata_name_coordinate_match"
            evidence.append({"expansion_slot_id":r["expansion_slot_id"],"master_code":r["effective_master_code"],"name_ja":r["name_ja"],"evidence_source":"Wikidata","wikidata_id":wd["qid"],"name_similarity":wd["name_similarity"],"distance_km":wd["distance_km"],"japanese_national_cultural_property_ids":wd["p4275"],"official_urls":wd["official_urls"],"match_method":method,"checked_at":now})
        else:
            x["wikidata_id"]=None;x["authority_url"]=None;x["source_ready"]=False;x["source_ready_scope"]=None;x["deterministic_confidence"]=0.55 if a else 0.35;x["review_status"]="human_review" if not a else "second_review"
            low.append({"expansion_slot_id":r["expansion_slot_id"],"master_code":r["effective_master_code"],"name_ja":r["name_ja"],"reason":"no_accepted_current_structured_reference_match","admin_mapped":bool(a),"confidence":x["deterministic_confidence"]})
        enriched.append(x)

    dump_jsonl(os.path.join(outdir,"remaining5021-source-enriched-v3.8.jsonl"),enriched)
    dump_jsonl(os.path.join(outdir,"remaining5021-admin-mapping-v3.8.jsonl"),admin_maps)
    dump_jsonl(os.path.join(outdir,"remaining5021-modern-presence-evidence-v3.8.jsonl"),evidence)
    dump_jsonl(os.path.join(outdir,"prefecture-corrections-v3.8.jsonl"),pref_corrections)
    dump_jsonl(os.path.join(outdir,"admin-unmapped-v3.8.jsonl"),admin_unmapped)
    dump_jsonl(os.path.join(outdir,"low-confidence-v3.8.jsonl"),low)
    with open(os.path.join(outdir,"region-codebook-v0.1.json"),"w",encoding="utf-8") as f:
        json.dump({"status":"external_region_key_only_not_TravelAssist_master_code","regions":REGIONS},f,ensure_ascii=False,indent=2)
    cov={
      "generation_version":GEN_VERSION,"input_count":len(rows),"admin_mapped":len(admin_maps),"admin_unmapped":len(admin_unmapped),"prefecture_corrections":len(pref_corrections),
      "current_structured_reference_matches":len(evidence),"national_cultural_property_matches":sum(bool(x["japanese_national_cultural_property_ids"]) for x in evidence),
      "official_url_from_wikidata_p856":sum(bool(x.get("official_url")) for x in enriched),"source_ready_identity_feature_scope":sum(bool(x.get("source_ready")) for x in enriched),
      "opening_hours_known":sum(x.get("opening_hours") is not None for x in enriched),"price_known":sum(x.get("adult_price_jpy") is not None or x.get("is_free") is not None for x in enriched),
      "reservation_known":sum(x.get("reservation_required") is not None for x in enriched),
      "city_id_intentionally_null":sum(x.get("city_id") is None for x in enriched),"district_id_intentionally_null":sum(x.get("district_id") is None for x in enriched),"region_id_intentionally_null":sum(x.get("region_id") is None for x in enriched),
      "note":"city_id/district_id/region_id are TravelAssist internal IDs. No authoritative internal registry was present, so they are not invented. External JIS municipality codes and region_key are emitted instead."
    }
    with open(os.path.join(outdir,"coverage-report-v3.8.json"),"w",encoding="utf-8") as f:json.dump(cov,f,ensure_ascii=False,indent=2)
    with open(os.path.join(outdir,"coverage-report-v3.8.md"),"w",encoding="utf-8") as f:
        f.write("# TravelAssist POI deterministic enrichment v3.8\n\n")
        for k,v in cov.items(): f.write(f"- **{k}**: {v}\n")
        f.write("\n## Rules\n- No AI guesses are written to deterministic fields.\n- `official_url` is populated only from accepted Wikidata P856 matches.\n- `authority_url` is separate and may point to the Agency for Cultural Affairs database when Wikidata P4275 is present.\n- Opening hours, prices, closed days, last entry, and reservation status remain null unless a structured trusted source provides them. This run does not infer them.\n- Modern identity confirmation does not imply public access.\n")
    files=[]
    for fp in sorted(Path(outdir).glob("*")):
        if fp.is_file(): files.append({"file":fp.name,"sha256":hashlib.sha256(fp.read_bytes()).hexdigest(),"bytes":fp.stat().st_size})
    with open(os.path.join(outdir,"manifest-v3.8.json"),"w",encoding="utf-8") as f:json.dump({"generation_version":GEN_VERSION,"files":files},f,ensure_ascii=False,indent=2)
    print("COVERAGE",json.dumps(cov,ensure_ascii=False,sort_keys=True))

if __name__=="__main__": main()
