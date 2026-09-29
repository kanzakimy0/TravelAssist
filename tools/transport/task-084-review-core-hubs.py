#!/usr/bin/env python3
"""One-time, source-reviewed allocation of five core station hub identities.

The explicit review list is supported by operator station-layout pages. Only the
listed TransportNode IDs are linked; the MLIT same-name group code is never a join.
"""
import argparse
import json
import sys
import uuid
from pathlib import Path

NAMESPACE = uuid.UUID("3fbc1a1f-01c3-4d82-9dc6-9b6d058204b0")
N02 = "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html"
REVIEW = {
    "東京": {
        "officialUrl": "https://www.jreast.co.jp/estation/stations/1039.html",
        "lines": {"東北新幹線", "東海道新幹線"},
        "decision": "JR East station guide lists both Shinkansen platform families and a standard interchange time.",
    },
    "新大阪": {
        "officialUrl": "https://eki.jr-odekake.net/premises?id=0610155",
        "lines": {"山陽新幹線", "東海道新幹線"},
        "decision": "JR West station guide lists Sanyo and Tokaido Shinkansen platforms and mutual interchange.",
    },
    "京都": {
        "officialUrl": "https://eki.jr-odekake.net/premises?id=0610116",
        "lines": {"東海道新幹線"},
        "decision": "JR West station guide lists Shinkansen and conventional-line platforms; only the accepted Shinkansen component is linked in this batch.",
    },
    "大宮": {
        "officialUrl": "https://www.jreast.co.jp/estation/stations/350.html",
        "lines": {"東北新幹線", "上越新幹線"},
        "decision": "JR East station guide lists Tohoku and Joetsu Shinkansen platform families and interchange.",
    },
    "博多": {
        "officialUrl": "https://eki.jr-odekake.net/premises?id=0910127",
        "lines": {"山陽新幹線", "九州新幹線"},
        "decision": "JR West station guide lists Sanyo and Kyushu Shinkansen platforms at Hakata.",
    },
}


def encoded(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8") + b"\n"


def allocate(nodes, reviewed_at):
    ledger = []
    assigned = set()
    for name, review in REVIEW.items():
        chosen = sorted(
            [node for node in nodes if node["canonicalNameJa"] == name and node["lineRefs"][0] in review["lines"]],
            key=lambda node: node["transportNodeId"],
        )
        if {node["lineRefs"][0] for node in chosen} != review["lines"]:
            raise RuntimeError(f"CORE_HUB_COMPONENTS_INCOMPLETE: {name}")
        ids = [node["transportNodeId"] for node in chosen]
        if any(node_id in assigned for node_id in ids):
            raise RuntimeError(f"CORE_HUB_COMPONENT_REUSED: {name}")
        assigned.update(ids)
        anchor = "ta:transport-hub:" + str(uuid.uuid4())
        ledger.append({
            "hubId": "transport-hub:" + str(uuid.uuid5(NAMESPACE, anchor)),
            "identityAnchor": anchor,
            "identityStatus": "HUB_ACCEPTED",
            "canonicalNameJa": name,
            "nodeLevel": "T0",
            "componentTransportNodeIds": ids,
            "operatorRefs": sorted({ref for node in chosen for ref in node["operatorRefs"]}),
            "lineRefs": sorted({ref for node in chosen for ref in node["lineRefs"]}),
            "sourceRefs": [N02, review["officialUrl"]],
            "decisionEvidence": {
                "officialStationGuide": review["officialUrl"],
                "claim": review["decision"],
                "sameNameOrN02GroupCodeAloneUsed": False,
            },
            "reviewedAt": reviewed_at,
            "componentCoverage": "PARTIAL" if name == "京都" else "SHINKANSEN_COMPONENTS_ONLY",
        })
    return sorted(ledger, key=lambda row: row["hubId"])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--nodes", required=True)
    parser.add_argument("--ledger", required=True)
    parser.add_argument("--reviewed-at", required=True)
    args = parser.parse_args()
    target = Path(args.ledger)
    if target.exists():
        print("HUB_LEDGER_ALREADY_EXISTS", file=sys.stderr)
        return 1
    nodes = [json.loads(line) for line in Path(args.nodes).read_text(encoding="utf-8").splitlines()]
    try:
        ledger = allocate(nodes, args.reviewed_at)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(b"".join(encoded(row) for row in ledger))
    print(json.dumps({"acceptedHubs": len(ledger), "linkedComponents": sum(len(row["componentTransportNodeIds"]) for row in ledger)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
