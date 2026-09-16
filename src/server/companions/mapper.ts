import type { Database } from "../../types/database.generated";
import {
  parseCompanionInputV1,
  parseCompanionGroupInputV1,
  type CompanionInputV1,
} from "../../features/companions/domain/companion-v1";
import type {
  CompanionResource,
  CompanionGroupResource,
} from "../../features/companions/persistence/companion-resource";
type CompanionRow = Database["public"]["Tables"]["companions"]["Row"];
type GroupRow = Database["public"]["Tables"]["companion_groups"]["Row"];
export function toCompanionColumns(input: CompanionInputV1) {
  return {
    display_name: input.displayName,
    relationship_code: input.relationshipCode,
    relationship_label: input.relationshipLabel,
    birth_date: input.birthDate,
    age_group_fallback: input.ageGroupFallback,
    gender_code: input.genderCode,
    avatar_path: input.avatarPath,
    travel_profile: { ...input.travelProfile },
  };
}
export function fromCompanionRow(row: CompanionRow): CompanionResource {
  return {
    ...parseCompanionInputV1(
      {
        displayName: row.display_name,
        relationshipCode: row.relationship_code,
        relationshipLabel: row.relationship_label,
        birthDate: row.birth_date,
        ageGroupFallback: row.age_group_fallback,
        genderCode: row.gender_code,
        avatarPath: row.avatar_path,
        travelProfile: row.travel_profile,
      },
      new Date().toISOString().slice(0, 10),
    ),
    id: row.id,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
export function fromGroupRow(
  row: GroupRow,
  members: { companion_id: string; sort_order: number }[],
): CompanionGroupResource {
  return {
    ...parseCompanionGroupInputV1({
      name: row.name,
      includesOwner: row.includes_owner,
      memberIds: [...members]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((m) => m.companion_id),
    }),
    id: row.id,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
