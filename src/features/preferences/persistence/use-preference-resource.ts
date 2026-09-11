"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyPreference,
  parsePreferenceV1,
  type PreferenceV1,
} from "../domain/preference-v1";
import { preferenceClient } from "./preference-client";
import { preferenceDraftPatch } from "./preference-adapter";
import {
  PreferenceApiError,
  type PreferenceErrorCode,
  type PreferenceResourceV1,
} from "./preference-resource";

export function usePreferenceResource() {
  const [resource, setResource] = useState<PreferenceResourceV1 | null>(null);
  const [draft, setDraft] = useState<PreferenceV1>(emptyPreference);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<PreferenceErrorCode | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);
  const mounted = useRef(false),
    inFlight = useRef(false);
  const accept = useCallback((next: PreferenceResourceV1) => {
    setResource(next);
    setDraft(parsePreferenceV1(next.preference));
    setError(null);
  }, []);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      setSavedMessage(false);
      try {
        const next = await preferenceClient.read(signal);
        if (mounted.current && !signal?.aborted) accept(next);
      } catch (cause) {
        if (mounted.current && !signal?.aborted)
          setError(
            cause instanceof PreferenceApiError
              ? cause.code
              : "PREFERENCE_UNAVAILABLE",
          );
      } finally {
        inFlight.current = false;
        if (mounted.current && !signal?.aborted) setBusy(false);
      }
    },
    [accept],
  );
  useEffect(() => {
    mounted.current = true;
    const abort = new AbortController();
    // Deferred kickoff lets StrictMode discard its first setup without duplicating requests.
    const timer = setTimeout(() => void load(abort.signal), 0);
    return () => {
      mounted.current = false;
      clearTimeout(timer);
      abort.abort();
    };
  }, [load]);
  const isDirty =
    resource !== null &&
    JSON.stringify(resource.preference) !== JSON.stringify(draft);
  async function mutate(reset = false) {
    if (!resource || inFlight.current || error === "STALE_PREFERENCE_REVISION")
      return false;
    inFlight.current = true;
    setBusy(true);
    setSavedMessage(false);
    try {
      const next = reset
        ? await preferenceClient.reset(resource.revision)
        : await preferenceClient.patch(
            resource.revision,
            preferenceDraftPatch(resource.preference, draft),
          );
      if (mounted.current) {
        accept(next);
        setSavedMessage(true);
      }
      return true;
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof PreferenceApiError
            ? cause.code
            : "PREFERENCE_UNAVAILABLE",
        );
      return false;
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function edit(next: PreferenceV1) {
    if (busy || !resource) return;
    setDraft(parsePreferenceV1(next));
    setSavedMessage(false);
  }
  function cancel() {
    if (busy) return;
    if (error === "STALE_PREFERENCE_REVISION") {
      void load();
      return;
    }
    if (resource) setDraft(parsePreferenceV1(resource.preference));
    setSavedMessage(false);
    setError(null);
  }
  return {
    resource,
    draft,
    edit,
    busy,
    error,
    savedMessage,
    isDirty,
    load,
    cancel,
    save: () => mutate(),
    reset: () => mutate(true),
  };
}
