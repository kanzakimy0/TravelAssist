"""Index real web-search cache records without treating grouped hits as POI identity proof."""
import datetime
import hashlib
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
BASE = pathlib.Path("data/poi/full")
sha = lambda b: hashlib.sha256(b).hexdigest()

def encode(obj):
    return (json.dumps(obj, ensure_ascii=False, indent=2) + "\n").encode()

def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_bytes() == data:
        return
    temp = path.with_suffix(".tmp")
    temp.write_bytes(data)
    temp.replace(path)

def extract_urls(response):
    # The final parenthesis closes the search-result title link; inner path
    # parentheses (e.g. Wikipedia disambiguation) are part of the URL.
    return list(dict.fromkeys(re.findall(r"\((https?://[^\s]+)\)\s*$", response, re.MULTILINE)))

def index(cache, bid, root=ROOT):
    cache, root = pathlib.Path(cache), pathlib.Path(root)
    plan_path = root / BASE / "manifests/remaining-v1/queries.json"
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    groups = [g for g in plan["groups"] if g["items"][0]["batchId"] == bid]
    assert groups and re.fullmatch(r"R-00(?:0[1-9]|[1-4][0-9]|5[01])", bid)
    previous_index = root / BASE / "sources/remaining-v1/search" / (bid + ".json")
    previous_groups = {}
    if previous_index.exists():
        previous_groups = {g["groupId"]: g for g in json.loads(previous_index.read_text(encoding="utf-8"))["groups"]}
    out, refs = [], []
    for g in groups:
        path = cache / "search" / (g["id"] + ".json")
        record = json.loads(path.read_text(encoding="utf-8"))
        for key in ("candidateKey", "query", "position", "batchId"):
            assert [i[key] for i in record["items"]] == [i[key] for i in g["items"]], "Search identity/query changed"
        response = record["response"]
        assert record["id"] == g["id"] and record["status"] == "SEARCH_EXECUTED"
        assert isinstance(response, str) and response.strip()
        if "responseSha256" in record:
            assert record["responseSha256"] == sha(response.encode()), "Search response corrupted"
        else:
            # Initial writer saved exact tool output before adding redundant
            # digest/timestamp fields. Its previously recorded file+content
            # checksums must match; never invent a tool completion timestamp.
            prior = previous_groups.get(g["id"], {})
            assert prior.get("responseSha256") == sha(response.encode()), "Unverified legacy cache"
            assert prior.get("cacheFileSha256") == sha(path.read_bytes()), "Legacy cache changed"
        started = datetime.datetime.fromisoformat(record["searchedAt"].replace("Z", "+00:00"))
        if record.get("completedAt"):
            completed = datetime.datetime.fromisoformat(record["completedAt"].replace("Z", "+00:00"))
            assert completed >= started
        urls = extract_urls(response)
        ref = {
            "groupId": g["id"], "responseSha256": sha(response.encode()),
            "cacheFileSha256": sha(path.read_bytes()), "searchedAt": record["searchedAt"],
            "returnedUrls": urls, "status": "SEARCH_EXECUTED",
            "resultStatus": "UNVERIFIED_GROUP_HITS" if urls else "NO_EXTRACTABLE_HITS",
            "legacyWriterWithoutCompletionTimestamp": "completedAt" not in record
        }
        refs.append(ref)
        for item in g["items"]:
            out.append({
                **item, "searchGroup": g["id"], "searchStatus": ref["status"],
                "searchResponseSha256": ref["responseSha256"], "returnedUrlCount": len(urls),
                "candidateIdentityResolved": False,
                "scoreInference": "NONE_FROM_SEARCH_RESULT_ALONE"
            })
    assert len(out) == (97 if bid == "R-0051" else 200)
    target = BASE / "sources/remaining-v1/search" / (bid + ".json")
    content = encode({"schemaVersion": "remaining-name-prefecture-category-search-v1", "batchId": bid, "candidateCount": len(out), "groups": refs, "candidates": out})
    atomic(root / target, content)
    receipt_path = root / BASE / "manifests/remaining-v1" / (bid + "-search.json")
    receipt = {
        "batchId": bid, "status": "SEARCH_ATTEMPT_QA_PASS", "candidateCount": len(out),
        "groupCount": len(refs), "queryPlanSha256": sha(plan_path.read_bytes()),
        "outputPath": target.as_posix(), "outputSha256": sha(content),
        "indexerSha256": sha(pathlib.Path(__file__).read_bytes()), "editorialReviewComplete": False
    }
    old = json.loads(receipt_path.read_text(encoding="utf-8")) if receipt_path.exists() else {}
    previous_time = old.pop("completedAt", None)
    receipt["completedAt"] = previous_time if old == receipt else datetime.datetime.now(datetime.timezone.utc).isoformat()
    atomic(receipt_path, encode(receipt))
    return {"batch": bid, "queried": len(out), "groups": len(refs), "status": "SEARCH_ATTEMPT_QA_PASS"}

if __name__ == "__main__":
    print(json.dumps(index(sys.argv[1], sys.argv[2])))
