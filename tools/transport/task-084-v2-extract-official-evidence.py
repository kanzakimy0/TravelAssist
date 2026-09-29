"""Extract factual observations from downloaded official sources, never master nodes."""
import json, re, hashlib, argparse
from pathlib import Path
from lxml import html
import openpyxl

def enc(v): return (json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,v): p.write_bytes(enc(v))
def run(a):
    root=Path(a.cache); out=Path(a.output); out.mkdir(parents=True,exist_ok=True)
    groups={
      'A_COMPANY':'成田国際 中部国際 関西国際 大阪国際',
      'A_NATIONAL':'東京国際 新千歳 稚内 釧路 函館 仙台 新潟 広島 高松 松山 高知 福岡 北九州 長崎 熊本 大分 宮崎 鹿児島 那覇',
      'A_LOCAL':'旭川 帯広 秋田 山形 山口宇部',
      'B':'利尻 礼文 奥尻 中標津 紋別 女満別 青森 花巻 大館能代 庄内 福島 大島 新島 神津島 三宅島 八丈島 佐渡 富山 能登 福井 松本 静岡 神戸 南紀白浜 鳥取 隠岐 出雲 石見 岡山 佐賀 対馬 小値賀 福江 上五島 壱岐 種子島 屋久島 奄美 喜界 徳之島 沖永良部 与論 粟国 久米島 慶良間 南大東 北大東 伊江島 宮古 下地島 多良間 石垣 波照間 与那国',
      'C':'調布 名古屋 但馬 岡南 天草 大分県央 八尾',
      'D':'札幌 千歳 三沢 百里 小松 美保 岩国 徳島'}
    page=html.fromstring((root/'mlit-airports.html').read_bytes(),parser=html.HTMLParser(encoding='utf-8'))
    body=''.join(page.itertext())
    observations=[]
    pdfs={'A_NATIONAL':('airport-A-national','002021263'),'A_LOCAL':('airport-A-local','002021264'),'B':('airport-B','002021265'),'C':('airport-C','002021266'),'D':('airport-D','002021267')}
    wb=openpyxl.load_workbook(a.workbook,read_only=True,data_only=True); sheet=wb.worksheets[1]
    rows=list(sheet.iter_rows(values_only=True)); figures={}
    for i,row in enumerate(rows):
        if str(row[2]).replace(' ','')!='空港名：': continue
        name=re.sub(r'\s|　','',str(row[3])).split('（')[0]
        if name=='豊富': break # Public heliports follow: never conflate 静岡 / 広島.
        for j in range(i+1,min(i+30,len(rows))):
            if str(rows[j][2]).replace(' ','')!='年度計': continue
            value=rows[j][13]
            if not isinstance(value,(int,float)) or value<0: raise ValueError(('NON_NUMERIC',name))
            if value!=rows[j][9]+rows[j][12]: raise ValueError(('SUBTOTAL',name))
            if name in figures: raise ValueError(('DUPLICATE',name))
            figures[name]={'usageValue':value,'usagePeriod':'FY2025','usageMetricType':'ANNUAL_AIRPORT_PASSENGER_ENTRIES_EXITS','usageUnit':'passengers/year','usageSource':'https://www.mlit.go.jp/koku/content/002016480.xlsx','sourceWorkbookSha256':sha(Path(a.workbook)),'sourceSheet':sheet.title,'sourceRow':j+1,'sourceColumn':'N'}
    for group,names in groups.items():
        names=names.split(); profile=pdfs.get(group)
        pages=json.loads((root/(profile[0]+'.text.json')).read_text(encoding='utf-8')) if profile else []
        for name in names:
            assert name in body, ('MISSING_CURRENT_LIST',name)
            matches=[(i+1,t) for i,t in enumerate(pages) if re.search(re.escape(name)+r'\s*空港',t)]
            # 千歳 is a separate current identity; do not alias it to 新千歳.
            if name=='千歳': matches=[]
            if len(matches)>1: raise ValueError(('PROFILE_AMBIGUOUS',name))
            p,t=matches[0] if matches else (None,'')
            def field(label):
                m=re.search(label+r'\s*[：:]\s*([^\n]+)',t); return m.group(1).strip() if m else None
            source={'url':'https://www.mlit.go.jp/koku/15_bf_000310.html','sha256':sha(root/'mlit-airports.html'),'listAsOf':'2026-09-01','category':group[0]}
            observations.append({'officialName':name,'category':group[0],'subcategory':group,'identityEvidence':source,'profileEvidence':{'url':'https://www.mlit.go.jp/koku/content/'+profile[1]+'.pdf','sha256':sha(root/(profile[0]+'.pdf')),'page':p} if p else None,'manager':field('設置管理者'),'officialLocationText':field('位置'),'operationHours':field('運用時間（利用時間）'),'lifecycleObservation':'OFFICIALLY_SUSPENDED' if '供用休止中' in t else 'LISTED_CURRENT_OPERATION_NOT_INDEPENDENTLY_CONFIRMED','annualUsage':figures.get(name)})
    assert len(observations)==97 and sum(x['annualUsage'] is not None for x in observations)==96
    (out/'airport-official-observations.jsonl').write_bytes(b''.join(enc(x) for x in observations))
    jr=[]
    def add(stations,operator,url,period,kind,rank,scope,location,source_sha=None,precision=None):
        for name,value in stations.items():
            jr.append({'stationName':name,'operator':operator,'modeFamily':'shinkansen','usageValue':value,'usageUnit':'boardings/day','usageMetricType':kind,'usagePeriod':period,'usageSource':url,'sourceLocator':location,'sourceSha256':source_sha,'sourcePrecision':precision or 'published integer','fallbackPriority':rank,'sourceScope':scope,'manualLevelReview':True,'tierAssignmentAuthorized':False,'reviewReason':'Published boardings are not entries + exits; no doubling or automatic threshold conversion.'})
    east=dict(zip('東京 上野 大宮 小山 宇都宮 那須塩原 新白河 郡山 福島 白石蔵王 仙台 古川 くりこま高原 一ノ関 水沢江刺 北上 新花巻 盛岡 いわて沼宮内 二戸 八戸 七戸十和田 新青森 熊谷 本庄早稲田 高崎 上毛高原 越後湯沢 浦佐 長岡 燕三条 新潟 安中榛名 軽井沢 佐久平 上田 長野 飯山 上越妙高'.split(),[70323,12622,32143,4271,12592,3288,1955,8484,7017,864,25769,2724,911,2082,888,1425,761,7430,75,719,3348,717,4696,3666,2012,13908,744,3550,758,4449,1787,9471,269,4691,2943,2800,8428,713,2068]))
    add(east,'東日本旅客鉄道','https://www.jreast.co.jp/company/data/passenger/2024_shinkansen.html/','FY2024','DAILY_SHINKANSEN_BOARDINGS',2,'OPERATOR_SHINKANSEN_COMPONENT','Shinkansen station table / daily total; web retrieval 2026-09-30')
    add({'名古屋':77000,'静岡':21000,'浜松':14000},'東海旅客鉄道','https://company.jr-central.co.jp/ir/factsheets/_pdf/factsheets2026-02-03.pdf','FY2025','DAILY_SHINKANSEN_BOARDINGS',2,'OPERATOR_SHINKANSEN_COMPONENT','page 1 / FY2025 / parenthesized Shinkansen-only values',precision='rounded thousands, multiplied by 1000 for unit conversion only')
    add({'博多':125462,'鹿児島中央':20083,'熊本':17226,'長崎':9492,'久留米':7404,'川内':2792,'新八代':2130,'武雄温泉':2080,'新鳥栖':2062,'諫早':5127,'筑後船小屋':1221,'新大村':943},'九州旅客鉄道','https://www.jrkyushu.co.jp/company/info/data/pdf/2024ekibetsu.pdf','FY2024','STATION_COMPLEX_PROXY',5,'SAME_OPERATOR_CONVENTIONAL_PLUS_SHINKANSEN','pages 1-2 / station total; page 4 footnote explicitly combines conventional + Shinkansen')
    add({'嬉野温泉':257},'九州旅客鉄道','https://www.jrkyushu.co.jp/company/info/data/pdf/2024ekibetsu.pdf','FY2024','DAILY_SHINKANSEN_BOARDINGS',2,'OPERATOR_SHINKANSEN_COMPONENT','page 4 / 西九州新幹線 / 嬉野温泉 (no conventional co-location)')
    add({'広島':83006,'新大阪':79582,'岡山':70636,'姫路':51699,'西明石':34740,'福山':20665},'西日本旅客鉄道','https://www.westjr.co.jp/company/info/issue/data/pdf/data2026_11.pdf','FY2025','STATION_COMPLEX_PROXY',5,'SAME_OPERATOR_STATION_TOTAL','PDF page 1 / printed page 88 / left passenger table, not right revenue table',sha(root/'jrwest-stations-2026.pdf'))
    (out/'shinkansen-official-fallbacks.jsonl').write_bytes(b''.join(enc(x) for x in jr))
    # These are registered facilities and berth capacities, not passenger/departure counts.
    bus_data=[
      ['札幌駅バスターミナル','札幌駅総合開発',19,'札幌市中央区北5条西2丁目1'],['大谷地バスターミナル','西新サービス',10,'札幌市厚別区大谷地東3丁目2-1'],['新札幌バスターミナル','札幌副都心開発公社',15,'札幌市厚別区厚別中央2条5丁目493-67'],['福住バスターミナル','北海道いすゞ自動車',9,'札幌市豊平区福住2条1丁目2-1'],['宮の沢バスターミナル','西新サービス',10,'札幌市西区宮の沢1条1丁目17'],['草津温泉バスターミナル','草津町',9,'群馬県吾妻郡草津町大字草津28'],['さいたま新都心バスターミナル','さいたま市',4,'さいたま市大宮区北袋町1丁目603-1'],['サンシャインバスターミナル','サンシャインシティ',16,'東京都豊島区東池袋3丁目3277'],['東京シティエアターミナル','東京シティ・エアターミナル',18,'東京都中央区日本橋箱崎町42-1'],['大崎駅西口バスターミナル','大崎エリアマネージメント',4,'東京都品川区大崎2丁目10-10'],['羽田エアポートガーデンバスターミナル','住友不動産商業マネジメント',7,'東京都大田区羽田2丁目'],['バスターミナル東京八重洲','京王電鉄バス',13,'東京都中央区八重洲2丁目100番地／八重洲1丁目300番地'],['横浜シティ・エア・ターミナル','横浜シティ・エア・ターミナル',6,'横浜市西区高島2丁目19-12'],['新静岡バスターミナル','静岡鉄道',8,'静岡市葵区鷹匠1丁目1-1'],['名鉄バスセンター','名古屋鉄道',24,'名古屋市中村区名駅1丁目2-4'],['栄バスターミナル','名古屋市',15,'名古屋市東区東桜1丁目'],['名古屋駅バスターミナル','ジェイアールセントラルビル',18,'名古屋市中村区名駅1丁目1-3'],['湊町バスターミナル','湊町開発センター',10,'大阪市浪速区湊町1丁目4-1'],['広島バスセンター','広島バスセンター',20,'広島市中区基町6-27'],['秋芳洞観光センター','美祢市',3,'美祢市秋芳町秋吉3506-2'],['博多バスターミナル','博多バスターミナル',26,'福岡市博多区博多駅中央街2-1'],['藤崎バス乗継ターミナル','福岡市',8,'福岡市早良区百道2丁目807-100'],['HEARTSバスステーション博多','HEARTS',4,'福岡市博多区博多駅前4丁目14-13'],['熊本桜町バスターミナル','九州産交ランドマーク',29,'熊本市中央区桜町3-13'],['別府交通センター','別府交通センター',3,'別府市新港町6-46'],['那覇バスターミナル','那覇バスターミナル',18,'那覇市泉崎1丁目20-1']]
    bus=[]
    for i,(n,o,b,ad) in enumerate(bus_data):
        bus.append({'observationId':f'mlit-general-bus-20260401:{i+1:02}','officialName':n,'facilityOperator':o,'officialAddress':ad,'berthCount':b,'berthCountIsUsage':False,'sourceUrl':'https://www.mlit.go.jp/jidosha/content/001999724.pdf','sourceSha256':sha(root/'bus-mlit-general.pdf'),'sourcePage':1,'sourceRow':i+1,'sourceAsOf':'2026-04-01','lifecycleProven':False,'coordinatesProven':False,'passengerStatisticsProven':False})
    (out/'bus-mlit-registered-facilities.jsonl').write_bytes(b''.join(enc(x) for x in bus))
    required=[
      ('横浜','横浜高速鉄道','private_rail','https://www.mm21railway.co.jp/station/yokohama/'),
      ('新宿','東京都','metro','https://www.kotsu.metro.tokyo.jp/subway/stations/shinjuku.html'),
      ('北鉄金沢','北陸鉄道','private_rail','https://www.hokutetsu.co.jp/railway/asanogawasen/hokutetsukanazawa/'),
      ('熊本駅前','熊本市','tram','https://www.kotsu-kumamoto.jp/timetable/pub/detail.aspx?c_id=42&d_id=37&kbn=1&p_s=1&t_cd=24'),
      ('鹿児島中央駅前','鹿児島市','tram','https://www.kotsu-city-kagoshima.jp/wp/wp-content/uploads/2023/03/fb07dadc208697dfd4e7327174c0caba.pdf')]
    (out/'required-hub-components.jsonl').write_bytes(b''.join(enc({'stationName':n,'operator':o,'modeFamily':m,'officialSource':s,'reason':'Official station/operator evidence requires component review even below S12 numeric selection threshold or with duplicated/missing S12 count.','parentHubAssignmentAuthorized':False}) for n,o,m,s in required))
    dump(out/'mode-classification-evidence.json',{'metroOverrides':{'札幌市':'https://www.city.sapporo.jp/st/subway/gaiyo/gaiyo.html','神戸市':'https://kotsu.city.kobe.lg.jp/subway/route-map/','大阪市高速電気軌道':'https://subway.osakametro.co.jp/'},'ordinaryTramwayLegalClassS12Code':21,'tramExample':'https://www.hiroden.co.jp/train/route-guide/route-map.html','rule':'Passenger mode takes precedence over technical/legal rail class. Sapporo and Kobe subway are metro; Osaka subway is metro even for legal class 21, while New Tram remains fixed guideway. Other class 21 candidates require tram classification review.'})
    dump(out/'evidence-extraction-manifest.json',{'airportIdentities':97,'airportAnnualNumeric':96,'shinkansenFallbackObservations':len(jr),'registeredBusFacilities':26,'artifactSha256':{p.name:sha(p) for p in sorted(out.glob('*.jsonl'))}})
    print(json.dumps({'airportIdentities':97,'annualNumeric':96,'fallbacks':len(jr),'busRegistered':26}))

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--cache',required=True); p.add_argument('--workbook',required=True); p.add_argument('--output',required=True); run(p.parse_args())
