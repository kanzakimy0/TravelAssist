#!/usr/bin/env python3
"""Audit TASK-084-B v2 review artifacts and build a human-readable handoff.

The generated report describes candidates. It cannot certify the national master.
"""

import argparse
import csv
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path("data/transport/nodes")
QA = Path("docs/qa/TASK-084-B")


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def file_sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_manifest_files(folder, manifest):
    hashes = manifest["artifactSha256"]
    if isinstance(hashes, str):
        matches = list(folder.glob("*.jsonl"))
        assert len(matches) == 1, folder
        assert file_sha(matches[0]) == hashes, matches[0]
    else:
        for name, expected in hashes.items():
            assert file_sha(folder / name) == expected, name


def run(write):
    old = read_jsonl(ROOT / "task-084-b-national-master/transport-nodes.jsonl")
    rail_dir = ROOT / "task-084-b-v2-rail-candidates"
    air_dir = ROOT / "task-084-b-v2-airport-review"
    access_dir = ROOT / "task-084-b-v2-airport-access-review"
    bus_dir = ROOT / "task-084-b-v2-bus-review"
    ferry_dir = ROOT / "task-084-b-v2-ferry-calibration"
    gateway_dir = ROOT / "task-084-b-v2-poi-gateway-review"
    rail_m = read_json(rail_dir / "manifest.json")
    air_m = read_json(air_dir / "manifest.json")
    access_m = read_json(access_dir / "manifest.json")
    bus_m = read_json(bus_dir / "manifest.json")
    ferry_m = read_json(ferry_dir / "manifest.json")
    gateway_m = read_json(gateway_dir / "manifest.json")
    for folder, manifest in [(rail_dir, rail_m), (air_dir, air_m), (access_dir, access_m), (bus_dir, bus_m), (ferry_dir, ferry_m), (gateway_dir, gateway_m)]:
        check_manifest_files(folder, manifest)
    rail = read_jsonl(rail_dir / "rail-components.jsonl")
    lineage = read_jsonl(rail_dir / "v1-rail-lineage.jsonl")
    high = read_jsonl(rail_dir / "s12-high-flow-gate.jsonl")
    airports = read_jsonl(air_dir / "transport-nodes.jsonl")
    access = read_jsonl(access_dir / "airport-access-audit.jsonl")
    bus = read_jsonl(bus_dir / "national-bus-terminal-inventory.jsonl")
    gateways = read_jsonl(gateway_dir / "canonical-poi-rail-gateway-review.jsonl")
    assert len(old) == 244
    assert len(rail) == rail_m["candidateComponentCount"]
    assert len(airports) == air_m["airportCount"] == len(access) == access_m["acceptedAirportCount"]
    assert access_m["officialGuideReviewedCount"] == len(access)
    assert access_m["statusCounts"].get("ACCESS_MODE_REVIEW_REQUIRED", 0) == 0
    assert access_m["missingExpectedComponentCount"] == 0
    assert len(bus) == bus_m["nationalCandidates"]
    assert len(gateways) == gateway_m["canonicalRecordCount"]
    assert gateway_m["accessEdgesGenerated"] == 0 and gateway_m["candidateCorpusAuthorized"] is False
    assert len(high) == rail_m["source"]["sourceGE50000Count"]
    assert rail_m["source"]["sourceGE200000MissingCount"] == 0
    assert all(row["status"] == "CANDIDATE_PRESENT_NOT_YET_ACCEPTED" for row in high)
    assert len({r["proposedTransportNodeId"] for r in rail}) == len(rail)
    assert len({r["oldTransportNodeId"] for r in lineage}) == len(lineage)
    assert sum(r["nodeCount"] for r in rail_m["batches"]) == len(rail)
    for receipt in rail_m["batches"]:
        batch_id = receipt["batchId"]
        content = rail_dir / "batches" / f"{batch_id}.jsonl"
        proof = rail_dir / "batch-receipts" / f"{batch_id}.json"
        assert file_sha(proof) == receipt["receiptSha256"]
        assert read_json(proof)["outputSha256"] == file_sha(content)
    old_tiers = Counter(r["nodeLevel"] for r in old)
    assert old_tiers == {"T0": 8, "T1": 40, "T2": 196}
    old_mode = defaultdict(Counter)
    for r in old:
        old_mode[r["nodeKind"]][r["nodeLevel"]] += 1
    high_missing = [r for r in high if not r["candidateTransportNodeId"]]
    assert not high_missing
    top50 = sorted((r for r in rail if r["usageValue"] is not None), key=lambda r: (-r["usageValue"], r["canonicalNameJa"], r["operatorRefs"]))[:50]
    assert len(top50) == 50
    rail_usage_count = sum(r["usageValue"] is not None for r in rail)
    rail_kinds = Counter(r["nodeKind"] for r in rail)
    near_gateway_reviews = [r for r in gateways if r["status"] == "NEAREST_S12_NOT_IN_CANDIDATES_REVIEW_REQUIRED" and r["nearestS12"][0]["distanceKm"] <= 3]
    near_gateway_reviews.sort(key=lambda r: (r["prefecture"], r["canonicalPoiNameJa"], r["canonicalPoiId"]))
    interesting = {"東京", "品川", "成田空港", "空港第２ビル", "草江"}
    station_rows = [r for r in rail if r["canonicalNameJa"] in interesting]
    station_rows.sort(key=lambda r: (r["canonicalNameJa"], r["operatorRefs"][0], r["modeFamily"]))
    lines = [
        "# TASK-084-B v2 纠错重建成果物与审核清单",
        "",
        "日期：2026-09-29",
        "",
        "状态：**REWORK_IN_PROGRESS / 未形成通过验收的全国 Master**",
        "",
        "Issue：[#441](https://github.com/kanzakimy0/TravelAssist/issues/441)",
        "",
        "分支：`fix/b-task-084-transport-master-rework`",
        "",
        "## 交付文件",
        "",
        "| 文件 | 内容 | 状态 |",
        "| --- | --- | --- |",
        "| `data/transport/nodes/task-084-b-v2-rail-candidates/rail-components.jsonl` | S12 全国轨道组件逐条候选，含客流、来源、拟定等级和身份键 | 待审核 |",
        "| `data/transport/nodes/task-084-b-v2-rail-candidates/v1-rail-lineage.jsonl` | v1 轨道 ID 复用、替代和待核映射 | 待审核 |",
        "| `data/transport/nodes/task-084-b-v2-rail-candidates/s12-high-flow-gate.jsonl` | 所有 S12 每日 5 万及以上源记录与候选的逐条对照 | 候选覆盖，尚未进入正式 Master |",
        "| `data/transport/nodes/task-084-b-v2-airport-review/transport-nodes.jsonl` | 47 个既有机场的官方年度客流等级重算 | 待审核 |",
        f"| `data/transport/nodes/task-084-b-v2-airport-access-review/airport-access-audit.jsonl` | 47 个机场的轨道接入逐条审核状态 | 官方指南已核 {access_m['officialGuideReviewedCount']} 个，其余待核 |",
        "| `data/transport/nodes/task-084-b-v2-bus-review/national-bus-terminal-inventory.jsonl` | 全国主要城际巴士枢纽候选及官方来源 | 站点定位和多数客流待核 |",
        "| `data/transport/nodes/task-084-b-v2-ferry-calibration/domestic-port-passengers-2024.jsonl` | 120 个港口年度国内旅客数及等级分布依据 | 港口汇总，不能给码头直接评级 |",
        f"| `data/transport/nodes/task-084-b-v2-poi-gateway-review/canonical-poi-rail-gateway-review.jsonl` | runtime 正式授权 {len(gateways)} 条 Canonical POI 的 S12 近邻站审核线索 | 仅地理发现，未生成 085 边 |",
        "| `docs/qa/TASK-084-B/FERRY-TIER-CALIBRATION-V2.md` | Ferry 阈值分析与限制 | 阈值草案 |",
        "| `docs/qa/TASK-084-B/TOKYO-SHINAGAWA-COMPONENT-AUDIT-V2.md` | 东京 / 品川官方车站指南与组件对照 | 服务线路及身份待最终核定 |",
        "",
        "## v1 确认缺陷",
        "",
        f"- 总数 {len(old)}；等级：T0={old_tiers['T0']}、T1={old_tiers['T1']}、T2={old_tiers['T2']}、T3={old_tiers['T3']}。",
        "- 既有 244 条是历史 v1，未通过全国 Master 质量验收，TASK-085-B / TASK-086-B 不得以此为输入。",
        "",
        "| v1 nodeKind | T0 | T1 | T2 | T3 |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]
    for kind, counts in sorted(old_mode.items()):
        lines.append(f"| {kind} | {counts['T0']} | {counts['T1']} | {counts['T2']} | {counts['T3']} |")
    lines += [
        "",
        "## v2 候选规模和边界",
        "",
        f"- S12 FY2024 轨道候选：{len(rail):,} 个；拟定 T0={rail_m['proposedTierCounts'].get('T0',0)}、T1={rail_m['proposedTierCounts'].get('T1',0)}、T2={rail_m['proposedTierCounts'].get('T2',0)}、T3={rail_m['proposedTierCounts'].get('T3',0)}、客流/等级待核={rail_m['proposedTierCounts'].get('REVIEW_REQUIRED',0)}。**这些不是已接收 Master 的等级总数。**",
        f"- 候选 S12 FY2024 正式客流可用率：{rail_usage_count}/{len(rail)} = {rail_usage_count/len(rail)*100:.1f}%；机场 FY2025 年客流：{len(airports)}/{len(airports)}；巴士候选有官方客流支撑的等级：{bus_m['officialUsageTierSupported']}/{len(bus)}。不同 mode 不合并成一个虚假的总覆盖率。",
        f"- S12 每日 ≥200,000 的源记录 {rail_m['source']['sourceGE200000Count']} 条：候选漏项 {rail_m['source']['sourceGE200000MissingCount']}；正式 Master 尚未生成，正式漏站 Gate 仍未通过。",
        f"- S12 每日 ≥50,000 的源记录 {len(high)} 条：全部有候选映射；逐条状态均为 `CANDIDATE_PRESENT_NOT_YET_ACCEPTED`，尚无正式 accepted/exclusion 判定。",
        f"- v1 轨道身份映射 {len(lineage)} 条：复用 {rail_m['lineageCounts'].get('REUSED_SAME_COMPONENT',0)}，显式替代 {rail_m['lineageCounts'].get('SUPERSEDED_BY',0)}，待核 {rail_m['lineageCounts'].get('REVIEW_REQUIRED',0)}；其他 v1 mode 尚无最终 lineage 判定。",
        f"- 轨道候选按 {rail_m['batchSize']} 条/批输出 {len(rail_m['batches'])} 个批次，实际数量 {', '.join(str(r['nodeCount']) for r in rail_m['batches'])}。脚本校验所有批次与 receipt 的 SHA256。",
        f"- 机场 {len(airports)} 个，依据 MLIT FY2025 年旅客量拟定 T0={air_m['nodeLevelCounts'].get('T0',0)}、T1={air_m['nodeLevelCounts'].get('T1',0)}、T2={air_m['nodeLevelCounts'].get('T2',0)}、T3={air_m['nodeLevelCounts'].get('T3',0)}。",
        f"- 机场轨道接入：{access_m['officialGuideReviewedCount']} 个机场完成官方/运营方指南核对，其中 {access_m['statusCounts']['CANDIDATES_PRESENT_FORMAL_ACCEPTANCE_PENDING']} 个列出合计 {access_m['expectedComponentCount']} 个在机场或步行直达的轨道组件且候选均存在，{access_m['statusCounts'].get('OFF_AIRPORT_RAIL_TRANSFER_DOCUMENTED',0)} 个记录为机场外轨道站换乘巴士/出租车，{access_m['statusCounts'].get('GROUND_ACCESS_GUIDE_NO_RAIL_COMPONENT_LISTED',0)} 个地面接入指南未列在机场轨道站；另 {access_m['statusCounts'].get('ACCESS_MODE_REVIEW_REQUIRED',0)} 个机场接入方式待核。",
        f"- 城际巴士：{len(bus)} 个全国候选，其中 {bus_m['historicalClosed']} 个历史已关闭；仅 {bus_m['officialUsageTierSupported']} 个有官方客流支持的拟定等级。",
        f"- Ferry：官方 2024 年港口汇总覆盖 {ferry_m['distribution']['portCount']} 个一类港口；正式码头评级许可状态为 `{str(ferry_m['formalTerminalTieringAllowed']).lower()}`。",
        f"- Canonical POI 旅游入口：严格核对 runtime 授权 manifest 后读取 {len(gateways)} 条；{gateway_m['statusCounts'].get('NEAREST_S12_NOT_IN_CANDIDATES_REVIEW_REQUIRED',0)} 条 POI 的最近 S12 站不在当前候选，其中 {len(near_gateway_reviews)} 条最近站距离 POI 不超过 3 km，需人工判断是否为有效旅游入口；生成 POI→站点边 0 条。",
        "",
        "| v2 轨道候选 nodeKind | 候选数 |",
        "| --- | ---: |",
    ]
    for kind, count in sorted(rail_kinds.items()):
        lines.append(f"| {kind} | {count} |")
    lines += [
        "",
        "| v2 轨道候选 modeFamily | 拟 T0 | 拟 T1 | 拟 T2 | 拟 T3 | 等级待核 |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for family, counts in sorted(rail_m["modeTierCounts"].items()):
        lines.append(f"| {family} | {counts.get('T0',0)} | {counts.get('T1',0)} | {counts.get('T2',0)} | {counts.get('T3',0)} | {counts.get('REVIEW_REQUIRED',0)} |")
    lines += [
        "",
        "## Canonical POI 近邻站待审线索（≤3 km）",
        "",
        "距离只能用于发现，不能证明道路/公共交通可达或生成 TASK-085-B Access Edge。以下逐条来自正式授权 Pilot-100；距离更远的 POI 仍保留在 JSONL 中。",
        "",
        "| Canonical POI | 都道府县 | 最近 S12 站 | 直线距离 km |",
        "| --- | --- | --- | ---: |",
    ]
    for r in near_gateway_reviews:
        station = r["nearestS12"][0]
        lines.append(f"| {r['canonicalPoiNameJa']} | {r['prefecture']} | {station['stationName']} | {station['distanceKm']:.2f} |")
    lines += [
        "",
        "## 东京、品川、成田、山口宇部核查样本",
        "",
        "| 站名 | 运营者 | mode | S12 FY2024 人/日 | 拟等级 | lineRefs |",
        "| --- | --- | --- | ---: | --- | --- |",
    ]
    for r in station_rows:
        value = str(r["usageValue"]) if r["usageValue"] is not None else "未公布/缺失"
        lines.append(f"| {r['canonicalNameJa']} | {r['operatorRefs'][0]} | {r['modeFamily']} | {value} | {r['proposedNodeLevel'] or '待核'} | {', '.join(r['lineRefs'])} |")
    lines += [
        "",
        "## S12 客流最高 50 个候选组件",
        "",
        "以下为 **S12 单一 operator×station×mode 源记录**，同站不同运营者会分别出现；不能把它们相加当作 Hub 客流。",
        "",
        "| # | 站名 | 运营者 | mode | 人/日 | 拟等级 |",
        "| ---: | --- | --- | --- | ---: | --- |",
    ]
    for i, r in enumerate(top50, 1):
        lines.append(f"| {i} | {r['canonicalNameJa']} | {r['operatorRefs'][0]} | {r['modeFamily']} | {r['usageValue']:,} | {r['proposedNodeLevel']} |")
    lines += [
        "",
        "## 尚未通过的验收门槛",
        "",
        f"1. 轨道 {len(rail):,} 个候选仍需真实物理站与运营边界审核、N02 / 官方站内图核对、正式 accepted / exclusion 决策；不能把候选当成全国 Master。",
        f"2. 47 个机场的官方接入指南已经逐项核对，但现有 {access_m['expectedComponentCount']} 个接入组件仍未正式接收；地面接入指南未列铁路站的 {access_m['statusCounts'].get('GROUND_ACCESS_GUIDE_NO_RAIL_COMPONENT_LISTED',0)} 个机场保留来源变化复核。",
        "3. 巴士终端缺可复用坐标/设施边界证据，绝大多数缺官方客流和正式等级。",
        "4. Ferry 港口汇总不能直接映射码头；需终端级官方数据、全国范围审核与阈值确认。",
        f"5. T0/T1 Hub 逐站官方指南 + N02 + S12 组件完整性、上述 {len(near_gateway_reviews)} 条 Canonical POI 近邻站人工甄别、低客流 T3 选取、所有 v1 身份归宿尚未完成。",
        "6. 尚无合并后的 v2 全国 Master、accepted 节点 200/批结果、完整 final QA、exact-head Quality Gate 或用户验收。WBS 7.14 保持返工中，不创建完成态 Draft PR。",
        "",
        "## 来源和复现",
        "",
        f"- [MLIT S12 FY2024]({rail_m['source']['sourceUrl']})；[S12 下载包]({rail_m['source']['archiveUrl']})；SHA256 `{rail_m['source']['archiveSha256']}`；许可 CC BY 4.0。",
        f"- [MLIT 机场年度统计]({air_m['sourceUrl']})；[FY2025 表]({air_m['sourceXlsxUrl']})；SHA256 `{air_m['sourceWorkbookSha256']}`。",
        "- [山口宇部机场官方铁路接入页](https://www.yamaguchiube-airport.jp/mapaccess/train/) 识别草江站为步行直达机场的低客流 T3 候选；机场与站点保持独立身份。",
        "- [MLIT バスタ新宿统计](https://www.mlit.go.jp/road/road_fr4_000091.html)；[2026-06 原始 PDF](https://www.mlit.go.jp/road/content/002008873.pdf)。",
        f"- [MLIT 港湾统计]({ferry_m['source']})；[2024 旅客表]({ferry_m['sourceWorkbook']})；SHA256 `{ferry_m['sourceWorkbookSha256']}`。",
        "- 原始下载文件不入库；各 builder 要求源文件 SHA256 匹配，rail builder 同时支持 deterministic rebuild、batch rerun 和损坏检测。",
        "- `python tools/transport/task-084-v2-rail-selftest.py --archive <verified-S12-zip>` 已验证重复运行、指定第 11 批重跑与损坏批次 fail-closed；这是候选批次测试，不能替代最终 accepted Master Quality Gate。",
        "",
    ]
    report = "\n".join(lines)
    if write:
        QA.mkdir(parents=True, exist_ok=True)
        (QA / "TRANSPORT-MASTER-V2-REWORK-RESULTS.md").write_text(report, encoding="utf-8")
        with (QA / "TOP-50-RAIL-GATEWAYS-V2.csv").open("w", encoding="utf-8-sig", newline="") as file:
            writer = csv.DictWriter(file, fieldnames=["rank", "stationName", "operator", "modeFamily", "passengersPerDay", "proposedNodeLevel", "sourcePrimaryStationCode", "proposedTransportNodeId"])
            writer.writeheader()
            for i, r in enumerate(top50, 1):
                writer.writerow({"rank": i, "stationName": r["canonicalNameJa"], "operator": r["operatorRefs"][0], "modeFamily": r["modeFamily"], "passengersPerDay": r["usageValue"], "proposedNodeLevel": r["proposedNodeLevel"], "sourcePrimaryStationCode": r["sourcePrimaryStationCode"], "proposedTransportNodeId": r["proposedTransportNodeId"]})
    print(json.dumps({"v1": dict(old_tiers), "railCandidates": len(rail), "highFlowSourceRows": len(high), "airportCount": len(airports), "busCandidates": len(bus), "reportWritten": write}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    run(parser.parse_args().write)
