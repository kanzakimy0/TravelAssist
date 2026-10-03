"""Extract attributed CC BY 4.0 S12 identity facts, without any legacy node admission."""
import argparse, hashlib, json, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def extract(archive,output):
 raw=archive.read_bytes()
 assert hashlib.sha256(raw).hexdigest()=='0785e932a32b3ec15e1a1345537ae145eafe1c07bf38d5c16c11ee2b391e7a28'
 with zipfile.ZipFile(archive) as z:
  features=json.loads(z.read('S12-25_GML/UTF-8/S12-25_NumberOfPassengers.geojson'))['features']
 rows={}
 for f in features:
  p=f['properties'];g=f['geometry']; pts=g['coordinates'] if g['type']=='LineString' else [v for part in g['coordinates'] for v in part]
  r={'stationName':p['S12_001'],'stationCode':str(p['S12_001c']),'groupCode':str(p['S12_001g']),'operator':p['S12_002'],'line':p['S12_003'],'railClassCode':p['S12_004'],'latitude':round(sum(float(x[1]) for x in pts)/len(pts),7),'longitude':round(sum(float(x[0]) for x in pts)/len(pts),7)}
  key=json.dumps(r,ensure_ascii=False,sort_keys=True,separators=(',',':'))
  rows[key]=r
 ordered=sorted(rows.values(),key=lambda r:(r['stationCode'],r['operator'],r['line']))
 output.parent.mkdir(parents=True,exist_ok=True)
 output.write_text(''.join(json.dumps(r,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n' for r in ordered),encoding='utf-8',newline='\n')
 print(json.dumps({'records':len(ordered),'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}))
if __name__=='__main__':
 parser=argparse.ArgumentParser()
 parser.add_argument('--archive',type=Path,default=ROOT/'data/transport/network/sources/raw/mlit-s12-25.zip')
 parser.add_argument('--output',type=Path,default=ROOT/'data/transport/network/research/s12-identities.jsonl')
 args=parser.parse_args();extract(args.archive,args.output)
