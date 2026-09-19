"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AccountDraft,
  type EmergencyContact,
  initialAccountDraft,
} from "../profile-data";
import {
  ProfileApiError,
  type ProfileAccountViewV1,
} from "../domain/profile-account-v1";
import {
  accountDraft,
  accountPatch,
  contactDraft,
  contactInput,
} from "./profile-adapter";
import { profileClient, profileErrorMessage } from "./profile-client";
const client = profileClient();
export function useProfileResource() {
  const [resource, setResource] = useState<ProfileAccountViewV1 | null>(null);
  const [saved, setSaved] = useState<AccountDraft>(() =>
    structuredClone(initialAccountDraft),
  );
  const [draft, setDraft] = useState<AccountDraft>(() =>
    structuredClone(initialAccountDraft),
  );
  const [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const mounted = useRef(false),
    inFlight = useRef(false);
  const accept = useCallback((next: ProfileAccountViewV1) => {
    setResource(next);
    setSaved(accountDraft(next));
    setDraft(accountDraft(next));
    setError("");
  }, []);
  const fail = useCallback((cause: unknown) => {
    if (cause instanceof ProfileApiError && cause.code === "AUTH_REQUIRED") {
      setResource(null);
      setSaved(structuredClone(initialAccountDraft));
      setDraft(structuredClone(initialAccountDraft));
    }
    setError(profileErrorMessage(cause));
  }, []);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      try {
        const next = await client.read(signal);
        if (mounted.current && !signal?.aborted) accept(next);
      } catch (cause) {
        if (mounted.current && !signal?.aborted) fail(cause);
      } finally {
        inFlight.current = false;
        if (mounted.current && !signal?.aborted) setBusy(false);
      }
    },
    [accept, fail],
  );
  useEffect(() => {
    mounted.current = true;
    const abort = new AbortController(),
      timer = setTimeout(() => void load(abort.signal), 0);
    return () => {
      mounted.current = false;
      clearTimeout(timer);
      abort.abort();
    };
  }, [load]);
  async function mutate(run: () => Promise<void>) {
    if (!resource || inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await run();
      return true;
    } catch (cause) {
      if (mounted.current) fail(cause);
      return false;
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function updateContacts(contacts: EmergencyContact[]) {
    // Contacts have their own explicit save. Preserve an unsaved profile/settings draft.
    setSaved((current) => ({ ...current, contacts }));
    setDraft((current) => ({ ...current, contacts }));
  }
  return {
    resource,
    saved,
    draft,
    setDraft,
    busy,
    error,
    load,
    cancel() {
      if (!inFlight.current) {
        setDraft(structuredClone(saved));
        setError("");
      }
    },
    save: () =>
      mutate(async () => {
        const patch = accountPatch(saved, draft);
        if (patch) {
          const next = await client.patch(patch);
          if (mounted.current) accept(next);
        }
      }),
    saveContact: (form: EmergencyContact, id?: string) =>
      mutate(async () => {
        const next = contactDraft(
          await client.saveContact(contactInput(form), id),
        );
        if (mounted.current)
          updateContacts(
            id
              ? saved.contacts.map((c) => (c.id === id ? next : c))
              : [...saved.contacts, next],
          );
      }),
    deleteContact: (id: string) =>
      mutate(async () => {
        await client.deleteContact(id);
        if (mounted.current)
          updateContacts(saved.contacts.filter((c) => c.id !== id));
      }),
  };
}
