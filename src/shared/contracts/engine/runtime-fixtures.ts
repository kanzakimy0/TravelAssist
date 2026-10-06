import type { RollbackRequestV1, RuntimeResultV1 } from "./runtime";
const id = "10000000-0000-4000-8000-000000000001";
export const rollbackRequestFixture: RollbackRequestV1 = {
  rollbackContractVersion: "4.23-rollback-1",
  requestId: "rollback-example",
  idempotencyKey: "rollback-example",
  originalReceiptId: id,
  actorRef: "20000000-0000-4000-8000-000000000001",
  correlationId: null,
  reason: "Restore the accepted change",
};
export const runtimeResultFixture: RuntimeResultV1 = {
  runtimeContractVersion: "4.23-runtime-1",
  eventId: id,
  eventType: "engine.apply.accepted.v0.1",
  originalReceiptId: id,
  changeSetId: "change-example",
  actorRef: rollbackRequestFixture.actorRef,
  target: {
    tripId: "30000000-0000-4000-8000-000000000001",
    planId: "40000000-0000-4000-8000-000000000001",
  },
  originalResultingVersion: { tripRevision: 2, planRevision: 2 },
  currentObservedVersion: { tripRevision: 3, planRevision: 3 },
  processingState: "processed",
  recomputeStatus: "accepted",
  fingerprint: "a".repeat(64),
  issueCodes: [],
  issuesTruncated: false,
};

export const rollbackResultFixture = {
  rollbackContractVersion: "4.23-rollback-1",
  requestId: "rollback-example",
  idempotencyKey: "rollback-example",
  originalReceiptId: id,
  outcome: "accepted",
  issueCodes: [],
  observedVersion: { tripRevision: 3, planRevision: 3 },
  resultingVersion: { tripRevision: 4, planRevision: 4 },
  applyReceiptId: "50000000-0000-4000-8000-000000000001",
  replay: { duplicate: false },
  transaction: { status: "committed" },
} as const;
