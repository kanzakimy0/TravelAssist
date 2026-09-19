"use client";

import { useEffect, useRef, useState } from "react";
import {
  canonicalFromPlannerTrip,
  PlannerCanonicalAdapterError,
  plannerTripFromCanonical,
} from "../model/planner-canonical";
import {
  tripSnapshot,
  tripSnapshotFingerprint,
  type TripSnapshot,
} from "../model/browser-trip";
import type { DetailDraftState } from "../model/detail-workspace";
import type { TripState } from "../model/trip-model";
import {
  plannerCanonicalClient,
  PlannerCanonicalClientError,
} from "../persistence/canonical-trip-client";

type CanonicalHydrate = (input: {
  trip: TripState;
  snapshot: TripSnapshot;
  revision: number;
  force?: boolean;
}) => void;

function message(error: unknown) {
  if (error instanceof PlannerCanonicalAdapterError) {
    if (error.code === "EMPTY_CANONICAL_PLAN")
      return "服务器行程还没有可编辑方案；本地工作区未被覆盖。";
    if (error.code === "UNSUPPORTED_STRUCTURE")
      return "此修改超出当前 Planner 可安全同步的 Canonical 字段；本地修改仍保留。";
    return "服务器行程格式无法安全映射；本地工作区未被覆盖。";
  }
  if (error instanceof PlannerCanonicalClientError) {
    const messages: Record<string, string> = {
      AUTH_REQUIRED: "请先登录后读取或保存服务器行程。",
      FORBIDDEN: "当前会话无法保存服务器行程。",
      CANONICAL_TRIP_NOT_FOUND: "找不到该服务器行程，当前本地工作区未改变。",
      STALE_CANONICAL_REVISION:
        "服务器行程已被其他页面更新；当前本地修改已保留，请重新读取后处理冲突。",
      INVALID_CANONICAL_TRIP: "行程数据未通过服务器契约检查，未保存。",
      PAYLOAD_TOO_LARGE: "行程数据过大，未保存，当前本地修改已保留。",
      AUTH_UNAVAILABLE: "认证服务暂不可用，当前本地修改已保留。",
      CANONICAL_TRIP_UNAVAILABLE: "服务器暂不可用，当前本地修改已保留。",
    };
    return messages[error.code] ?? "服务器行程操作失败，当前本地修改已保留。";
  }
  return "服务器行程操作失败，当前本地修改已保留。";
}

/**
 * Coordinates Canonical I/O around the Store's localRevision. The pending
 * request is deliberately unable to apply a late read/save acknowledgement
 * over a changed working copy.
 */
export function usePlannerCanonicalTrip({
  tripId,
  trip,
  draft,
  localRevision,
  dirty,
  hydrate,
}: {
  tripId: string | null;
  trip: TripState;
  draft: DetailDraftState;
  localRevision: number;
  dirty: boolean;
  hydrate: CanonicalHydrate;
}) {
  const [status, setStatus] = useState(
    tripId ? "正在读取服务器行程…" : "未指定服务器行程 · 仅浏览器恢复可用",
  );
  const [loading, setLoading] = useState(Boolean(tripId));
  const tripRef = useRef(trip);
  const draftRef = useRef(draft);
  const revisionRef = useRef(localRevision);
  const dirtyRef = useRef(dirty);
  const hydrateRef = useRef(hydrate);

  useEffect(() => {
    tripRef.current = trip;
    draftRef.current = draft;
    revisionRef.current = localRevision;
    dirtyRef.current = dirty;
    hydrateRef.current = hydrate;
  }, [draft, dirty, hydrate, localRevision, trip]);

  useEffect(() => {
    if (!tripId) {
      return;
    }
    let cancelled = false;
    void plannerCanonicalClient()
      .read(tripId)
      .then((resource) => {
        if (cancelled) return;
        const next = plannerTripFromCanonical(
          resource.snapshot,
          tripRef.current,
        );
        // Server is the Canonical truth only when the Store remained clean
        // while the request was in flight. A browser cache never wins here.
        if (dirtyRef.current) {
          setStatus(
            "服务器版本已到达；当前有较新的本地修改，未覆盖。请保存或重新读取后处理。",
          );
          return;
        }
        const snapshot = tripSnapshot(next, draftRef.current);
        hydrateRef.current({
          trip: next,
          snapshot,
          revision: resource.revision,
        });
        setStatus(`已读取服务器行程 · 修订 ${resource.revision}`);
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatus(message(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  async function save(snapshot: TripSnapshot): Promise<TripSnapshot> {
    if (!tripId) return snapshot;
    const startedRevision = revisionRef.current;
    try {
      const outgoing = canonicalFromPlannerTrip(
        tripRef.current,
        snapshot.draft,
      );
      setStatus("正在保存到服务器…");
      const resource = await plannerCanonicalClient().save(tripId, outgoing);
      // The request may succeed after another edit. Report the acknowledged
      // older server version without marking the newer working copy clean.
      if (
        revisionRef.current !== startedRevision ||
        tripSnapshotFingerprint(
          tripSnapshot(tripRef.current, draftRef.current),
        ) !== tripSnapshotFingerprint(snapshot)
      ) {
        setStatus("服务器已确认较早版本；当前较新的本地修改仍未保存。");
        throw new Error("LATE_ACKNOWLEDGEMENT");
      }
      const next = plannerTripFromCanonical(resource.snapshot, tripRef.current);
      const acknowledged = tripSnapshot(next, snapshot.draft);
      hydrateRef.current({
        trip: next,
        snapshot: acknowledged,
        revision: resource.revision,
        force: true,
      });
      setStatus(`已保存到服务器 · 修订 ${resource.revision}`);
      return acknowledged;
    } catch (error) {
      if (error instanceof Error && error.message === "LATE_ACKNOWLEDGEMENT")
        throw error;
      setStatus(message(error));
      throw error;
    }
  }

  return {
    enabled: Boolean(tripId),
    loading: tripId ? loading : false,
    status: tripId ? status : "未指定服务器行程 · 仅浏览器恢复可用",
    save,
  };
}
