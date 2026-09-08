import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DETAIL_DRAFT_STORAGE_KEY,
  detailUrl,
  parseDetailDraft,
} from "../model/detail-workspace";
import type {
  DetailDraftState,
  TripWorkspaceMode,
} from "../model/detail-workspace";
import type { TripState } from "../model/trip-model";
import {
  parseSavedTrip,
  restoreTrip,
  sameTrip,
  saveBrowserTrip,
  SAVED_TRIP_KEY,
  tripSnapshot,
} from "../model/browser-trip";
import type { SavedTrip, TripSnapshot } from "../model/browser-trip";

export function useBrowserTrip({
  trip,
  draft,
  mode,
  day,
  restore,
  setDraft,
  onLeave,
}: {
  trip: TripState;
  draft: DetailDraftState;
  mode: TripWorkspaceMode;
  day: number;
  restore: (trip: TripState) => void;
  setDraft: (draft: DetailDraftState) => void;
  onLeave?: () => void;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<SavedTrip | null>(null);
  const [baseline, setBaseline] = useState<TripSnapshot | null>(null);
  const [status, setStatus] = useState("正在读取浏览器行程…");
  const [destination, setDestination] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [overwritePending, setOverwritePending] = useState(false);
  const overwriteLeave = useRef(false);
  const expectedRaw = useRef<string | null>(null);
  const initialized = useRef(false);
  const dirty =
    mode === "detail" &&
    baseline !== null &&
    !sameTrip(tripSnapshot(trip, draft), baseline);

  useEffect(() => {
    if (initialized.current) return;
    const timer = window.setTimeout(() => {
      initialized.current = true;
      try {
        const raw = window.localStorage.getItem(SAVED_TRIP_KEY);
        expectedRaw.current = raw;
        const existing = parseSavedTrip(raw, trip);
        setSaved(existing);
        if (mode === "detail" && existing) {
          restore(restoreTrip(trip, existing.snapshot));
          setDraft(structuredClone(existing.snapshot.draft));
          setBaseline(existing.snapshot);
          setStatus("已载入上次保存 · 仅此浏览器");
        } else {
          const legacy = parseDetailDraft(
            window.localStorage.getItem(DETAIL_DRAFT_STORAGE_KEY),
          );
          setDraft(legacy);
          if (mode === "detail") setBaseline(tripSnapshot(trip, legacy));
          setStatus(
            raw && !existing
              ? "保存记录无效，原记录未改动"
              : "尚未保存 · 仅此浏览器",
          );
        }
      } catch {
        if (mode === "detail") setBaseline(tripSnapshot(trip, draft));
        setStatus("浏览器存储不可用，仍可编辑但暂不能保存");
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [trip, draft, mode, restore, setDraft]);

  function applySnapshot(snapshot: TripSnapshot) {
    restore(restoreTrip(trip, snapshot));
    setDraft(structuredClone(snapshot.draft));
    setBaseline(snapshot);
  }
  function enterDetail() {
    if (!ready) return;
    setBaseline(tripSnapshot(trip, draft));
    onLeave?.();
    setError("");
    setStatus(
      saved && sameTrip(tripSnapshot(trip, draft), saved.snapshot)
        ? "已保存到此浏览器"
        : "尚未保存 · 仅此浏览器",
    );
    router.push(detailUrl(trip.ui.focusedDay), { scroll: false });
  }
  function openSaved() {
    try {
      const raw = window.localStorage.getItem(SAVED_TRIP_KEY);
      const existing = parseSavedTrip(raw, trip);
      if (!existing) {
        setError("未找到有效的保存记录，当前行程未改变。");
        return;
      }
      expectedRaw.current = raw;
      setSaved(existing);
      applySnapshot(existing.snapshot);
      setError("");
      setStatus("已载入上次保存 · 仅此浏览器");
      router.push(detailUrl(1), { scroll: false });
    } catch {
      setError("无法读取浏览器存储，当前行程未改变。");
    }
  }
  function save(confirmedOverwrite = false, prepared?: TripSnapshot) {
    if (!ready || mode !== "detail") return false;
    if (
      saved &&
      saved.snapshot.currentPlanId !== trip.ui.currentPlanId &&
      !confirmedOverwrite
    ) {
      setOverwritePending(true);
      return false;
    }
    try {
      const snapshot = prepared ?? tripSnapshot(trip, draft);
      if (
        !parseSavedTrip(
          JSON.stringify({
            version: 1,
            savedAt: new Date().toISOString(),
            snapshot,
          }),
          trip,
        )
      )
        throw new Error("行程数据未通过检查，未覆盖已保存版本。");
      const next = saveBrowserTrip(
        window.localStorage,
        snapshot,
        expectedRaw.current,
      );
      expectedRaw.current = JSON.stringify(next);
      setSaved(next);
      setBaseline(snapshot);
      if (prepared) applySnapshot(snapshot);
      setStatus("已保存到此浏览器 · 刷新可恢复");
      setError("");
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name === "Error"
          ? cause.message
          : "保存失败：存储空间不足或浏览器禁止存储。您的修改仍保留，请勿关闭页面。",
      );
      return false;
    }
  }
  function leave(target: string) {
    overwriteLeave.current = false;
    setDestination(null);
    onLeave?.();
    router.push(target, { scroll: false });
  }
  function requestLeave(target = "/planner") {
    if (dirty) setDestination(target);
    else leave(target);
  }

  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    function linkClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const target = new URL(link.href);
      if (
        target.origin !== window.location.origin ||
        (target.pathname === "/planner" &&
          target.searchParams.get("view") === "detail")
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setDestination(target.pathname + target.search + target.hash);
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", linkClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", linkClick, true);
    };
  }, [dirty]);

  // Search-param back navigation stays within this mounted workspace. Reopen
  // Detail before asking; no remount of the map and no silent draft loss.
  useEffect(() => {
    if (!dirty) return;
    function onPop(event: PopStateEvent) {
      const target = new URL(window.location.href);
      if (
        target.pathname !== "/planner" ||
        target.searchParams.get("view") !== "detail"
      ) {
        event.stopImmediatePropagation();
        window.history.pushState(null, "", detailUrl(day));
        setDestination(target.pathname + target.search + target.hash);
      }
    }
    const navigation = (window as Window & { navigation?: EventTarget })
      .navigation;
    function onNavigate(event: Event) {
      const navigate = event as Event & {
        navigationType: string;
        destination: { url: string };
      };
      if (navigate.navigationType !== "traverse" || !event.cancelable) return;
      const target = new URL(navigate.destination.url);
      if (
        target.origin === window.location.origin &&
        (target.pathname !== "/planner" ||
          target.searchParams.get("view") !== "detail")
      ) {
        event.preventDefault();
        setDestination(target.pathname + target.search + target.hash);
      }
    }
    navigation?.addEventListener("navigate", onNavigate);
    window.addEventListener("popstate", onPop, true);
    return () => {
      navigation?.removeEventListener("navigate", onNavigate);
      window.removeEventListener("popstate", onPop, true);
    };
  }, [dirty, day]);

  return {
    overwritePending,
    cancelOverwrite: () => {
      setOverwritePending(false);
      overwriteLeave.current = false;
    },
    confirmOverwrite: () => {
      if (save(true)) {
        setOverwritePending(false);
        if (overwriteLeave.current) leave(destination ?? "/planner");
        overwriteLeave.current = false;
      }
    },
    ready,
    saved,
    dirty,
    status: error || (dirty ? "有未保存修改 · 仅此浏览器" : status),
    error,
    destination,
    enterDetail,
    openSaved,
    save,
    savePrepared: (
      nextTrip: TripState,
      nextDraft: DetailDraftState,
      overwrite: boolean,
    ) => save(overwrite, tripSnapshot(nextTrip, nextDraft)),
    requestLeave,
    cancelLeave: () => {
      setDestination(null);
      overwriteLeave.current = false;
    },
    discardAndLeave: () => {
      if (baseline) applySnapshot(baseline);
      leave(destination ?? "/planner");
    },
    saveAndLeave: () => {
      overwriteLeave.current = true;
      if (save()) leave(destination ?? "/planner");
    },
  };
}
