"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { TripLibraryApiError } from "../../../shared/contracts/trip-library/index";
import { tripLibraryClient } from "./client";
import {
  readAllTrips,
  tripLibraryErrorMessage,
  type TripSummary,
} from "./live-trip-model";
const client = tripLibraryClient();
export function useTripLibrary() {
  const [items, setItems] = useState<TripSummary[] | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [feedback, setFeedback] = useState("");
  const mounted = useRef(false),
    writing = useRef(false),
    readVersion = useRef(0),
    readAbort = useRef<AbortController | null>(null);
  const copyKeys = useRef(new Map<string, string>());
  const load = useCallback(async () => {
    readAbort.current?.abort();
    const controller = new AbortController(),
      version = ++readVersion.current;
    readAbort.current = controller;
    setBusy(true);
    setItems(null);
    setError("");
    const reader = tripLibraryClient((url, options) =>
      fetch(url, { ...options, signal: controller.signal }),
    );
    try {
      const next = await readAllTrips(reader.list, controller.signal);
      if (mounted.current && version === readVersion.current) setItems(next);
      return true;
    } catch (cause) {
      if (
        mounted.current &&
        !controller.signal.aborted &&
        version === readVersion.current
      )
        setError(
          cause instanceof TripLibraryApiError && cause.code === "AUTH_REQUIRED"
            ? tripLibraryErrorMessage(cause)
            : "读取旅行资料失败，请重试。",
        );
      return false;
    } finally {
      if (
        mounted.current &&
        !controller.signal.aborted &&
        version === readVersion.current
      )
        setBusy(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const timer = setTimeout(() => void load(), 0);
    return () => {
      mounted.current = false;
      clearTimeout(timer);
      readAbort.current?.abort();
    };
  }, [load]);
  async function mutate(trip: TripSummary, copy: boolean) {
    if (writing.current || busy || !items) return false;
    writing.current = true;
    setBusy(true);
    setError("");
    setFeedback("");
    let acknowledged = false;
    try {
      if (copy) {
        const key = trip.id + ":" + trip.storageRevision;
        // Retain an idempotency key after a lost/failed response; a retry has the same intent.
        if (!copyKeys.current.has(key))
          copyKeys.current.set(key, crypto.randomUUID());
        await client.copy(
          trip.id,
          trip.storageRevision,
          copyKeys.current.get(key)!,
        );
        acknowledged = true;
        copyKeys.current.delete(key);
        if (mounted.current) {
          setFeedback("副本已保存为新草稿。");
          // A failed refresh must not turn an acknowledged copy into a false write failure.
          await load();
        }
      } else {
        await client.delete(trip.id, trip.storageRevision);
        acknowledged = true;
        if (mounted.current) {
          setItems(
            (current) => current?.filter((item) => item.id !== trip.id) ?? null,
          );
          setFeedback("草稿已删除。");
        }
      }
      return true;
    } catch (cause) {
      if (mounted.current) {
        if (
          cause instanceof TripLibraryApiError &&
          cause.code === "AUTH_REQUIRED"
        )
          setItems(null);
        setError(tripLibraryErrorMessage(cause));
      }
      return acknowledged;
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return {
    items,
    busy,
    error,
    feedback,
    load,
    remove: (trip: TripSummary) => mutate(trip, false),
    copy: (trip: TripSummary) => mutate(trip, true),
  };
}
