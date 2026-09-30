#!/usr/bin/env python3
"""Verify resume determinism and fail-before-write corruption handling in a temp dir."""
import hashlib, json, subprocess, sys, tempfile, importlib.util
from pathlib import Path

spec=importlib.util.spec_from_file_location('review','tools/transport/task-084-v2-amendment-review.py')
review=importlib.util.module_from_spec(spec);spec.loader.exec_module(review)
assert review.airport_planning_status(999)=='EXCLUDED_ANNUAL_PASSENGERS_BELOW_1000'
assert review.airport_planning_status(1000)=='ELIGIBLE_PENDING_ACCEPTANCE'
assert review.airport_planning_status(None)=='REVIEW_REQUIRED_MISSING_ANNUAL_USAGE'
assert review.airport_planning_status(1000,True)=='EXCLUDED_INACTIVE'
with tempfile.TemporaryDirectory(prefix='travelassist-task084-amendment-') as temp:
    out=Path(temp)/'review'
    command=[sys.executable,'tools/transport/task-084-v2-amendment-review.py','--output',str(out)]
    first=subprocess.run(command,capture_output=True,text=True)
    assert first.returncode==0,first.stderr
    snapshot={str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in out.rglob('*') if p.is_file()}
    resumed=subprocess.run(command,capture_output=True,text=True)
    assert resumed.returncode==0,resumed.stderr
    assert snapshot=={str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in out.rglob('*') if p.is_file()}
    # Damage an artifact near the end, ensuring earlier artifacts are not rewritten.
    target=out/'tier-distributions.jsonl'; target.write_bytes(target.read_bytes()+b'{}\n')
    before={str(p.relative_to(out)):p.stat().st_mtime_ns for p in out.rglob('*') if p.is_file()}
    failed=subprocess.run(command,capture_output=True,text=True)
    assert failed.returncode!=0 and 'CORRUPTED_OR_CHANGED_INPUT' in failed.stderr,failed.stderr
    assert before=={str(p.relative_to(out)):p.stat().st_mtime_ns for p in out.rglob('*') if p.is_file()}
    print(json.dumps({'deterministicRebuild':'PASS','resume':'PASS','corruptionDetection':'PASS','noWriteBeforeAllArtifactsValidate':'PASS','fileCount':len(snapshot)}))
