# TASK-071-A Owner matrix

A remains Canonical Owner. General execution authorization is active; it does not approve exceptions or frozen refresh. Decisions were checked directly in Issue #404, last observed comment 6094176408, at 2026-10-10T08:00:00.509Z.

| Decision | Actual status | Required scope |
| --- | --- | --- |
| D1 | HOLD_OWNER, no explicit approval | Two tracked sources plus all 14 history path/category/fingerprint groups; approved source custody/redaction and downstream identity/rights review or exact bounded public/nonsecret exception. Credential-owner incident handling if applicable. |
| D2 | HOLD_OWNER, technical review PASS | tests/task-013-assets.test.mjs; tests/task-025-2-coral-palette.test.mjs; tests/task-076-ai-runtime.test.mjs; tests/task-020-security.test.mjs. Original assertions and 155+4 inventory are preserved; QA acceptance of the already accepted proof-backed canonical execution model is pending. |
| D3 | HOLD_OWNER, refresh NOT_RUN | After all approved source and package/workflow/test inputs are final, unchanged R035-05 generator in clean staging, double generation and exact allowed metadata-only semantic comparison. |

[Request 6093604543](https://github.com/kanzakimy0/TravelAssist/issues/404#issuecomment-6093604543) and [convergence request 6094176408](https://github.com/kanzakimy0/TravelAssist/issues/404#issuecomment-6094176408) request decisions; neither is approval. [Source provenance and downstream hashes](source-disposition-plan.json), [assertion preservation](assertion-preservation-proof.json), [frozen refresh plan](task086-refresh-plan.json).

Independent technical blocker: current rebuild is **FAIL**. The final Linux graph-first and graph-second attempts also failed their original 2400000 ms inner timeout and were killed by the unchanged runner. UTC start/end times are preserved separately from the configured timer budget. No complete first/second native proof exists; resume was not run. The local rebuild remains technically BLOCKED. Workflow compatibility repair alone has not resolved or certified runtime completion. Owner approval alone cannot replace a successful original current-head proof or the required hosted CI/merge-result checks.

Every remaining history group is retained below. A history fingerprint alone is not proof that a value is a credential or is safe to publish. No raw value was decoded, printed or validated online. Current-file remediation cannot remove history findings.

| Path | Category | Fingerprint | Occurrences | Disposition |
| --- | --- | --- | --- | --- |
| .env.example | env-template-value | d4c999ae43633bd2036188d2bca68e1be8202b2cc1f3a1c42a728eaff7d2483d | 1 | HOLD_OWNER |
| .env.example | env-template-value | 6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b | 1 | HOLD_OWNER |
| data/poi/full/reviews/task-071/TASK-071-A-0009.discovery-v2.jsonl | jwt-token | 851eec6558a20f2445a3d49a5ea0d21088a9c7d23d2ff7e6950ee03f71dbcb8e | 1 | HOLD_OWNER |
| data/poi/full/task-073-b-identity-deep-null-targeted-43d/identity-remediation/sources/japan-travel-minobusan-kuonji.html | gcp-key | 8323f4d7fa338d7c4cb0fa4991e3878233e440c919458ce9f0c01c25b483561f | 1 | HOLD_OWNER |
| data/transport/network/next-source-actions.jsonl | aws-access-id | 2a93ab5870ef59c9f587c7f8d62180c08215095af14a6f3c1dea1da9394b274c | 8 | HOLD_OWNER |
| data/transport/network/next-source-actions.jsonl | aws-access-id | 15c17790c299acd0faab9b0cc8ecc35be629f3f9bb764741fe81d16601870509 | 1 | HOLD_OWNER |
| data/transport/network/next-source-actions.jsonl | aws-access-id | f299de938603a713d4960956e54210af9f5b39da26cffbaaaacfb088cc817859 | 1 | HOLD_OWNER |
| data/transport/network/next-source-actions.jsonl | aws-access-id | fa259226a181736bb32ef1e42371401307a7b1abea770be364d1a3e73e70e87f | 1 | HOLD_OWNER |
| data/transport/network/next-source-actions.jsonl | aws-access-id | 758667b6c01747f27f11cfb43ed71f6989522c5d56219435672c3520a7c50372 | 9 | HOLD_OWNER |
| data/transport/network/next-source-actions.jsonl | azure-sas | 1cbdf4a83456130d6ce76f5159fe3784870e69d256ef6e7a39b11aefbc056a8b | 8 | HOLD_OWNER |
| data/transport/network/next-source-actions.jsonl | azure-sas | 6bf24abd4011d6a9de9deacc2590621c9c90b0ed75c6b6cdac9f48131591522e | 11 | HOLD_OWNER |
| tests/task-076-ai-runtime.test.mjs | generic-credential | 64af848afc4e507188b584e1bf9bdece3fe17bce49e77a86a6f97004fd5face5 | 2 | HOLD_OWNER |
| tests/task-077-ai-conversation.test.mjs | generic-credential | 62af8704764faf8ea82fc61ce9c4c3908b6cb97d463a634e9e587d7c885db0ef | 1 | HOLD_OWNER |
| tests/task-080-a-poi-search-api.test.mjs | generic-credential | 43ed5c457b799abe72e15e5ce574960937404f72402c5c15837044c1fc1a3a4a | 1 | HOLD_OWNER |

[All occurrence Git object/commit metadata](history-disposition-groups.json). No path-wide or provider-wide exception, no history rewrite, no secret-containing quarantine copy in Git. Unapproved groups remain FAIL/HOLD; no completion or acceptance is claimed.
