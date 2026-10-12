"""Extract exact MLIT P36-23 operator-specific stop identities (CC BY 4.0).
GML point references are joined within their prefecture member. Neither matching
names nor coordinates merge records; route labels are historical identity context.
"""
import argparse
import hashlib
import json
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE_SHA256 = "50d92052dd15ccf29fa86bee74b18ce7c95fcb9cb93678395842e67658f26de4"
NS = {"k": "http://nlftp.mlit.go.jp/ksj/schemas/ksj-app", "g": "http://schemas.opengis.net/gml/3.2.1", "x": "http://www.w3.org/1999/xlink"}

def extract(archive, output):
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == ARCHIVE_SHA256
    rows = []
    with zipfile.ZipFile(archive) as z:
        for member in sorted(n for n in z.namelist() if n.endswith(".xml") and "KS-META" not in n):
            root = ET.fromstring(z.read(member))
            points = {}
            for p in root.findall("g:Point", NS):
                key = p.attrib["{"+NS["g"]+"}id"]
                assert key not in points
                points[key] = [float(v) for v in p.findtext("g:pos", namespaces=NS).split()]
            for stop in root.findall("k:BusStop", NS):
                key = stop.attrib["{"+NS["g"]+"}id"]
                ref = stop.find("k:loc", NS).attrib["{"+NS["x"]+"}href"]
                assert ref.startswith("#") and ref[1:] in points
                lat, lon = points[ref[1:]]
                name = stop.findtext("k:bsn", namespaces=NS)
                operator = stop.findtext("k:boc", namespaces=NS)
                assert name and operator and 20 <= lat <= 46 and 122 <= lon <= 154
                rows.append({"stopRecordId": Path(member).stem+":"+key, "sourceMember": member,
                             "gmlFeatureId": key, "pointReferenceId": ref[1:], "stopName": name,
                             "operator": operator, "latitude": lat, "longitude": lon,
                             "identityAsOf": "2023-11_APPROXIMATE_SOURCE_DATES_VARY",
                             "coordinateScope": "OPERATOR_STOP_REPRESENTATIVE_NOT_PLATFORM_OR_PRECISE_NAVIGATION"})
    assert len(rows) == len({r["stopRecordId"] for r in rows}) and rows
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("".join(json.dumps(r, ensure_ascii=False, sort_keys=True, separators=(",", ":"))+"\n"
                              for r in sorted(rows, key=lambda r:r["stopRecordId"])), encoding="utf8", newline="\n")
    print(json.dumps({"records": len(rows), "sha256": hashlib.sha256(output.read_bytes()).hexdigest()}))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", type=Path, default=ROOT/"data/transport/network/sources/raw/mlit-p36-23.zip")
    parser.add_argument("--output", type=Path, default=ROOT/"data/transport/network/research/p36-identities.jsonl")
    args = parser.parse_args()
    extract(args.archive, args.output)
