import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../../types/database.generated";
import type {
  CompanionInputV1,
  CompanionGroupInputV1,
} from "../../features/companions/domain/companion-v1";
import {
  CompanionApiError,
  companionErrorStatuses,
  type CompanionErrorCode,
} from "../../features/companions/persistence/companion-resource";
import { toCompanionColumns, fromCompanionRow, fromGroupRow } from "./mapper";
type Row = Database["public"]["Tables"]["companions"]["Row"];
type GroupRow = Database["public"]["Tables"]["companion_groups"]["Row"];
type MemberRow = Database["public"]["Tables"]["companion_group_members"]["Row"];
// Only the verified request client/owner enters here. All reads are owner-scoped,
// and RPCs use auth.uid() plus invoker RLS (no service key or supplied owner).
export function companionRepository(
  client: SupabaseClient<Database>,
  owner: string,
) {
  function dbError(
    error: { code: string; message: string },
    group = false,
  ): never {
    if (
      error.code === "P0001" &&
      Object.hasOwn(companionErrorStatuses, error.message)
    )
      throw new CompanionApiError(error.message as CompanionErrorCode);
    if (["23514", "22007", "22008", "22P02", "23502"].includes(error.code))
      throw new CompanionApiError(
        group ? "INVALID_COMPANION_GROUP_INPUT" : "INVALID_COMPANION_INPUT",
      );
    if (error.code === "23503")
      throw new CompanionApiError("COMPANION_GROUP_MEMBER_INVALID");
    throw new CompanionApiError("COMPANION_UNAVAILABLE");
  }
  async function listCompanions() {
    const { data, error } = await client
      .from("companions")
      .select("*")
      .eq("owner_user_id", owner)
      .order("created_at")
      .order("id");
    if (error) dbError(error);
    return data!.map(fromCompanionRow);
  }
  async function getCompanion(id: string) {
    const { data, error } = await client
      .from("companions")
      .select("*")
      .eq("owner_user_id", owner)
      .eq("id", id)
      .maybeSingle();
    if (error) dbError(error);
    if (!data) throw new CompanionApiError("COMPANION_NOT_FOUND");
    return fromCompanionRow(data);
  }
  async function listGroups() {
    // One PostgREST SQL statement gives group revision and memberships the same snapshot.
    const { data, error } = await client
      .from("companion_groups")
      .select("*,companion_group_members(*)")
      .eq("owner_user_id", owner)
      .order("created_at")
      .order("id");
    if (error) dbError(error, true);
    return data!.map((row) => fromGroupRow(row, row.companion_group_members));
  }
  async function getGroup(id: string) {
    const { data, error } = await client
      .from("companion_groups")
      .select("*,companion_group_members(*)")
      .eq("owner_user_id", owner)
      .eq("id", id)
      .maybeSingle();
    if (error) dbError(error, true);
    if (!data) throw new CompanionApiError("COMPANION_GROUP_NOT_FOUND");
    return fromGroupRow(data, data.companion_group_members);
  }
  async function mutateCompanion(
    action: "create" | "update" | "delete",
    id?: string,
    revision?: number,
    input?: CompanionInputV1,
  ) {
    const { data, error } = await client.rpc("mutate_companion_v1", {
      p_action: action,
      p_id: id ?? undefined,
      p_expected_revision: revision ?? undefined,
      p_input: input ? toCompanionColumns(input) : undefined,
    });
    if (error) dbError(error);
    return action === "delete"
      ? null
      : fromCompanionRow(data as unknown as Row);
  }
  async function mutateGroup(
    action: "create" | "update" | "delete",
    id?: string,
    revision?: number,
    input?: CompanionGroupInputV1,
  ) {
    const { data, error } = await client.rpc("mutate_companion_group_v1", {
      p_action: action,
      p_id: id ?? undefined,
      p_expected_revision: revision ?? undefined,
      p_name: input?.name ?? undefined,
      p_includes_owner: input?.includesOwner ?? undefined,
      p_member_ids: input?.memberIds ?? undefined,
    });
    if (error) dbError(error, true);
    if (action === "delete") return null;
    const result = data as Json as unknown as {
      group: GroupRow;
      members: MemberRow[];
    };
    return fromGroupRow(result.group, result.members);
  }
  return {
    listCompanions,
    getCompanion,
    listGroups,
    getGroup,
    mutateCompanion,
    mutateGroup,
  };
}
