import registryData from "../data/master-code-registry.v1.json" with { type: "json" };

import type { MasterCodeEntryV1, MasterCodeRegistryV1 } from "./types";
import { parseMasterCodeRegistryV1 } from "./validation";

const parsed = parseMasterCodeRegistryV1(registryData);

if (!parsed.ok) {
  const summary = parsed.issues
    .map(({ path, code }) => `${path}:${code}`)
    .join(", ");
  throw new Error(`Canonical Master Code registry is invalid: ${summary}`);
}

export const masterCodeRegistry: MasterCodeRegistryV1 = parsed.value;

const byCode = new Map(
  masterCodeRegistry.entries.map((entry) => [entry.masterCode, entry] as const),
);

const activeByEntity = new Map(
  masterCodeRegistry.entries
    .filter(
      (entry): entry is MasterCodeEntryV1 & { entityRef: string } =>
        entry.lifecycleStatus === "active" && entry.entityRef !== null,
    )
    .map(
      (entry) =>
        [`${entry.entityType}\u0000${entry.entityRef}`, entry] as const,
    ),
);

export function resolveMasterCode(
  masterCode: string,
): MasterCodeEntryV1 | null {
  return byCode.get(masterCode) ?? null;
}

export function resolveActiveMasterCodeByEntity(
  entityType: MasterCodeEntryV1["entityType"],
  entityRef: string,
): MasterCodeEntryV1 | null {
  return activeByEntity.get(`${entityType}\u0000${entityRef}`) ?? null;
}
