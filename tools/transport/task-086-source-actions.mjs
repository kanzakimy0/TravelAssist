import {
  safeSourceUrl,
  safeLogText,
  sanitizeEvidence,
} from "./task-086-log-safety.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hash, invariant, compare, SOURCE_RIGHTS } from "./task-086-model.mjs";
import {
  readRows,
  readJson,
  atomicWrite,
  jsonlBytes,
} from "./task-086-batches.mjs";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const ACTION_STATES = [
  "PENDING_RESEARCH",
  "RESEARCHING",
  "SOURCE_FOUND",
  "RIGHTS_REVIEWED",
  "INGESTED",
  "NO_SOURCE_FOUND",
  "EXTERNAL_APPROVAL_REQUIRED",
  "SUPERSEDED_BY_ALTERNATIVE",
];
const transitions = {
  PENDING_RESEARCH: ["RESEARCHING", "SUPERSEDED_BY_ALTERNATIVE"],
  RESEARCHING: ["SOURCE_FOUND", "NO_SOURCE_FOUND"],
  SOURCE_FOUND: ["RESEARCHING", "RIGHTS_REVIEWED", "SUPERSEDED_BY_ALTERNATIVE"],
  RIGHTS_REVIEWED: [
    "INGESTED",
    "RESEARCHING",
    "EXTERNAL_APPROVAL_REQUIRED",
    "SUPERSEDED_BY_ALTERNATIVE",
  ],
  INGESTED: ["RESEARCHING"],
  NO_SOURCE_FOUND: [
    "RESEARCHING",
    "EXTERNAL_APPROVAL_REQUIRED",
    "SUPERSEDED_BY_ALTERNATIVE",
  ],
  EXTERNAL_APPROVAL_REQUIRED: ["RESEARCHING", "SUPERSEDED_BY_ALTERNATIVE"],
  SUPERSEDED_BY_ALTERNATIVE: [],
};
export function transitionAction(action, state, detail, observedAt) {
  invariant(
    ACTION_STATES.includes(state) && transitions[action.state].includes(state),
    "INVALID_SOURCE_ACTION_TRANSITION",
  );
  invariant(
    detail?.result && detail?.nextAction,
    "ACTION_RESULT_AND_NEXT_REQUIRED",
  );
  if (state === "SUPERSEDED_BY_ALTERNATIVE")
    invariant(detail.alternativeActionId, "ALTERNATIVE_ACTION_REQUIRED");
  if (state === "EXTERNAL_APPROVAL_REQUIRED")
    invariant(
      (detail.fixpointProofSha256 || detail.fixpointProofSha256s?.length) &&
        detail.approvalAuthority,
      "EXTERNAL_APPROVAL_NOT_PROVEN",
    );
  const event = {
    previousState: action.state,
    state,
    observedAt,
    ...detail,
    previousEventSha256: action.events?.at(-1)?.eventSha256 ?? null,
  };
  return {
    ...action,
    state,
    result: detail.result,
    nextAction: detail.nextAction,
    events: [...(action.events ?? []), { ...event, eventSha256: hash(event) }],
  };
}
export function validateCorroboratingEvidence(fact, actions) {
  for (const ref of fact.corroboratingEvidence ?? []) {
    const action = actions.find(
      (a) => a.actionId === (ref.sourceActionId ?? fact.sourceActionId),
    );
    invariant(
      action &&
        ["RIGHTS_REVIEWED", "INGESTED"].includes(action.state) &&
        [
          "RAW_PERSISTENCE_ALLOWED",
          "DERIVED_STATIC_FACTS_ALLOWED",
          "TOPOLOGY_FACT_ONLY_ALLOWED",
        ].includes(action.rightsFindings.at(-1)?.rightsClass) &&
        /^[a-f0-9]{64}$/.test(ref.observedResponseSha256 ?? "") &&
        action.sourcesChecked.some(
          (s) =>
            s.url === ref.url &&
            [200, "REFERENCE_RETRIEVED"].includes(s.status) &&
            s.contentSha256 === ref.observedResponseSha256,
        ),
      "CORROBORATING_SOURCE_NOT_BOUND:" + fact.factId,
    );
  }
  return true;
}

export function nextSourceAction(actions) {
  const phase = {
    shinkansen: 0,
    rail: 1,
    private_rail: 2,
    metro: 2,
    transfer: 3,
    airport: 4,
    ferry: 5,
    highway_bus: 6,
    special: 7,
  };
  return (
    actions
      .filter((a) =>
        [
          "PENDING_RESEARCH",
          "RESEARCHING",
          "SOURCE_FOUND",
          "RIGHTS_REVIEWED",
          "NO_SOURCE_FOUND",
        ].includes(a.state),
      )
      .sort(
        (a, b) =>
          (phase[a.mode] ?? 8) - (phase[b.mode] ?? 8) ||
          (a.priority ?? 100) - (b.priority ?? 100) ||
          compare(a.actionId, b.actionId),
      )[0] ?? null
  );
}
// Public evidence read through the web reference tool can be recorded without
// claiming possession of a byte-for-byte source payload. Its fingerprint is
// explicitly the reviewed minimal observation, never a fabricated raw hash.
export function recordReferenceEvidence(
  request,
  {
    queuePath = path.join(
      root,
      "data/transport/network/next-source-actions.jsonl",
    ),
  } = {},
) {
  const actions = readRows(queuePath),
    index = actions.findIndex((a) => a.actionId === request.actionId);
  invariant(
    index >= 0 &&
      request.observedAt &&
      request.observedVia === "web.run" &&
      request.observations?.length,
    "REFERENCE_OBSERVATION_REQUIRED",
  );
  let action = actions[index];
  if (action.state !== "RESEARCHING")
    action = transitionAction(
      action,
      "RESEARCHING",
      {
        result: "PUBLIC_REFERENCE_RESEARCH",
        nextAction: "REVIEW_REFERENCE_FACTS",
      },
      request.observedAt,
    );
  const checked = request.observations.map((o) => ({
    url: safeSourceUrl(o.url),
    purpose: o.purpose,
    status: "REFERENCE_RETRIEVED",
    observedVia: request.observedVia,
    observedAt: request.observedAt,
    fingerprintScope: "MINIMUM_REVIEWED_OBSERVATION_NOT_SOURCE_BYTES",
    contentSha256: hash(sanitizeEvidence(o)),
    observation: sanitizeEvidence(o),
    rawPayloadRetained: false,
  }));
  action.attempts.push({
    attempt: action.attempts.length + 1,
    observedAt: request.observedAt,
    requestSha256: hash(request),
    sources: checked,
    outcome: "SOURCE_FOUND_VIA_PUBLIC_REFERENCE",
  });
  action.sourcesChecked.push(...checked);
  invariant(
    checked.some((s) => s.purpose === "topology") &&
      checked.some(
        (s) =>
          s.purpose === "terms" && s.url === safeSourceUrl(request.termsUrl),
      ),
    "REFERENCE_TOPOLOGY_AND_TERMS_REQUIRED",
  );
  action = transitionAction(
    action,
    "SOURCE_FOUND",
    { result: "PUBLIC_REFERENCE_OBSERVED", nextAction: "REVIEW_MINIMUM_FACTS" },
    request.observedAt,
  );
  invariant(
    [
      "TOPOLOGY_FACT_ONLY_ALLOWED",
      "REFERENCE_ONLY_DISCOVERY",
      "LICENSE_BLOCKED",
    ].includes(request.rightsClass) && request.rightsFinding,
    "REFERENCE_RIGHTS_DECISION_REQUIRED",
  );
  action.rightsFindings.push({
    rightsClass: request.rightsClass,
    reason: safeLogText(request.rightsFinding),
    termsUrl: safeSourceUrl(request.termsUrl),
    observedAt: request.observedAt,
    rawReuseClaimed: false,
  });
  actions[index] = transitionAction(
    action,
    "RIGHTS_REVIEWED",
    {
      result: request.rightsClass,
      nextAction: ["REFERENCE_ONLY_DISCOVERY", "LICENSE_BLOCKED"].includes(
        request.rightsClass,
      )
        ? "SEARCH_NEXT_LAWFUL_ALTERNATIVE"
        : "EXTRACT_AND_BIND_MINIMAL_FACTS",
    },
    request.observedAt,
  );
  atomicWrite(queuePath, jsonlBytes(actions));
  return actions[index];
}
export async function acquireEvidence(
  request,
  {
    network = fetch,
    now = () => new Date().toISOString(),
    queuePath = path.join(
      root,
      "data/transport/network/next-source-actions.jsonl",
    ),
  } = {},
) {
  const actions = readRows(queuePath),
    index = actions.findIndex((a) => a.actionId === request.actionId);
  invariant(index >= 0, "SOURCE_ACTION_NOT_FOUND");
  const requestFingerprint = hash(
    sanitizeEvidence({
      actionId: request.actionId,
      urls: request.urls,
      termsUrl: request.termsUrl,
      rightsClass: request.rightsClass,
      sourceVersion: request.sourceVersion ?? null,
      parserVersion: request.parserVersion ?? null,
      identityVersion: request.identityVersion ?? null,
      rightsVersion: request.rightsVersion ?? null,
    }),
  );
  const reusable = actions[index].attempts?.find(
    (a) => a.requestFingerprint === requestFingerprint,
  );
  if (reusable && reusable.outcome === "NO_SOURCE_FOUND") return actions[index];
  const observedAt = now();
  actions[index] = transitionAction(
    actions[index],
    "RESEARCHING",
    {
      result: "REQUESTING_PRIMARY_EVIDENCE",
      nextAction: "REVIEW_RESPONSE_AND_TERMS",
    },
    observedAt,
  );
  const attempt = {
    attempt: actions[index].attempts.length + 1,
    observedAt,
    requestSha256: requestFingerprint,
    requestFingerprint,
    retryCondition:
      "SOURCE_VERSION_PARSER_IDENTITY_OR_RIGHTS_REVIEW_INPUT_CHANGED",
    sources: [],
    outcome: "IN_PROGRESS",
  };
  actions[index].attempts.push(attempt);
  atomicWrite(queuePath, jsonlBytes(actions));
  for (const item of request.urls) {
    const entry = { url: safeSourceUrl(item.url), purpose: item.purpose };
    try {
      const response = await network(item.url, {
        signal: AbortSignal.timeout(45000),
        headers: { "User-Agent": "TravelAssist/086 source-evidence-review" },
      });
      const raw = Buffer.from(await response.arrayBuffer());
      Object.assign(entry, {
        finalUrl: safeSourceUrl(response.url || item.url),
        status: response.status,
        contentSha256: hash(raw),
        bytes: raw.length,
        contentType: response.headers.get("content-type"),
        rawPayloadRetained: false,
      });
      if (
        request.rightsClass === "RAW_PERSISTENCE_ALLOWED" &&
        item.retainAs &&
        response.ok
      ) {
        const target = path.resolve(
          root,
          "data/transport/network/sources/raw",
          item.retainAs,
        );
        invariant(
          path.dirname(target) ===
            path.resolve(root, "data/transport/network/sources/raw"),
          "RAW_PATH_ESCAPE",
        );
        atomicWrite(target, raw);
        entry.rawPayloadRetained = true;
        entry.retainedPath = path
          .relative(root, target)
          .split(path.sep)
          .join("/");
      }
    } catch (error) {
      entry.error = safeLogText(error.message);
    }
    attempt.sources.push(entry);
    actions[index].sourcesChecked.push({
      ...entry,
      observedAt,
      attempt: attempt.attempt,
    });
    atomicWrite(queuePath, jsonlBytes(actions));
  }
  const found = attempt.sources.some(
    (s) => s.purpose === "topology" && s.status === 200,
  );
  attempt.outcome = found ? "SOURCE_FOUND" : "NO_SOURCE_FOUND";
  actions[index] = transitionAction(
    actions[index],
    attempt.outcome,
    {
      result: attempt.outcome,
      nextAction: found
        ? "REVIEW_MINIMUM_FACT_AND_TERMS_SCOPE"
        : "TRY_NEXT_LAWFUL_SOURCE",
    },
    observedAt,
  );
  atomicWrite(queuePath, jsonlBytes(actions));
  if (found && request.rightsClass) {
    invariant(
      SOURCE_RIGHTS.includes(request.rightsClass) &&
        request.rightsFinding &&
        request.termsUrl,
      "RIGHTS_REVIEW_REQUIRED",
    );
    invariant(
      attempt.sources.some(
        (s) => s.url === safeSourceUrl(request.termsUrl) && s.status === 200,
      ),
      "TERMS_NOT_OBSERVED",
    );
    actions[index].rightsFindings.push({
      rightsClass: request.rightsClass,
      reason: safeLogText(request.rightsFinding),
      termsUrl: safeSourceUrl(request.termsUrl),
      observedAt,
      rawReuseClaimed: request.rightsClass === "RAW_PERSISTENCE_ALLOWED",
    });
    actions[index] = transitionAction(
      actions[index],
      "RIGHTS_REVIEWED",
      {
        result: request.rightsClass,
        nextAction: ["REFERENCE_ONLY_DISCOVERY", "LICENSE_BLOCKED"].includes(
          request.rightsClass,
        )
          ? "SEARCH_NEXT_LAWFUL_ALTERNATIVE"
          : "EXTRACT_AND_BIND_MINIMAL_FACTS",
      },
      observedAt,
    );
  }
  atomicWrite(queuePath, jsonlBytes(actions));
  return actions[index];
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [command, argument] = process.argv.slice(2);
  if (command === "acquire")
    console.log(
      JSON.stringify(await acquireEvidence(readJson(argument)), null, 2),
    );
  else if (command === "reference")
    console.log(
      JSON.stringify(recordReferenceEvidence(readJson(argument)), null, 2),
    );
  else if (command === "next")
    console.log(
      JSON.stringify(
        nextSourceAction(
          readRows(
            path.join(root, "data/transport/network/next-source-actions.jsonl"),
          ),
        ),
        null,
        2,
      ),
    );
  else
    throw new Error(
      "Usage: task-086-source-actions.mjs acquire <review-request.json> | next",
    );
}
