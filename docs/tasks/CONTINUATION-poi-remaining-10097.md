# Remaining 10,097 POI — user-authorized continuation

The user explicitly confirmed the acceptance rule: every candidate gets an evidence attempt, supported fields only, and unexplained defaults are prohibited; reasoned nulls are allowed.

The user requested all remaining 10,097 unscored candidates in groups of 200 on 2026-09-19 JST. This continuation is downstream of TASK-070 commit `302d84431158f6637e36f84a6e1ffbfb6b8af935`; PR #397 and its evidence remain unchanged. This is not a new numbered TASK assignment.

The frozen population contains 51 batches: 50 × 200 and a final 97. Each candidate receives an explicit attempt/result. Public source acquisition is now in scope; the previous TASK-070 retained-source-only/P0 stop applies to that finished task. No normal batch requires another user confirmation.

All existing protections persist: candidateKey and formal/legacy codes unchanged, canonical Registry unchanged, no identity rebindings, null remains unknown, no source/category-derived default score, no production import, no paid or runtime Route Provider calls, no product/schema/migration changes. The 162 quarantined candidates and 3 further identity conflicts remain held unless separately adjudicated; processing an identity hold records the reason and does not silently release it.

Completion metrics must distinguish acquisition attempts, metadata-only results, identity holds, content awaiting editorial review, and actual accepted field additions. A successful HTTP fetch is not an evidence review or a filled score. Each non-null feature requires an explicit reviewed entry under the existing rubric. Do not represent an acquisition sweep alone as completed attribute enrichment.

Preserve checksum resume, per-candidate errors, per-batch QA, last-written receipts and checkpoints. Preserve TASK-068/TASK-070 audit history and existing supported values. Create one downstream Draft PR for this continuation, never merge or close prior issues automatically.
