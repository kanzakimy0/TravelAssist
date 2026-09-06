"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "../personal-center.module.css";

type NavigableEvent = { preventDefault: () => void };

type PendingNavigation =
  { kind: "route"; href: string } | { kind: "history"; href: string };

type NavigationGuardContextValue = {
  isDirty: boolean;
  setIsDirty: (isDirty: boolean) => void;
  requestNavigation: (href: string, event?: NavigableEvent) => boolean;
};

const NavigationGuardContext = createContext<NavigationGuardContextValue>({
  isDirty: false,
  setIsDirty: () => undefined,
  requestNavigation: () => false,
});

type BrowserNavigateEvent = Event & {
  canIntercept?: boolean;
  destination?: { url?: string };
  navigationType?: string;
};

type BrowserNavigation = {
  addEventListener: (
    type: "navigate",
    listener: (event: BrowserNavigateEvent) => void,
  ) => void;
  removeEventListener: (
    type: "navigate",
    listener: (event: BrowserNavigateEvent) => void,
  ) => void;
};

export function PersonalNavigationGuardProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const bypassNavigationRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pending, setPending] = useState<PendingNavigation | null>(null);

  const openGuard = useCallback((next: PendingNavigation) => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setPending(next);
  }, []);

  const requestNavigation = useCallback(
    (href: string, event?: NavigableEvent) => {
      if (!isDirty || bypassNavigationRef.current) return false;
      event?.preventDefault();
      openGuard({ kind: "route", href });
      return true;
    },
    [isDirty, openGuard],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (pending && !dialog.open) dialog.showModal();
    if (!pending && dialog.open) dialog.close();
  }, [pending]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const navigation = (window as Window & { navigation?: BrowserNavigation })
      .navigation;
    if (!navigation) return;

    const handleNavigate = (event: BrowserNavigateEvent) => {
      if (
        bypassNavigationRef.current ||
        event.navigationType !== "traverse" ||
        !event.cancelable ||
        event.canIntercept === false
      ) {
        return;
      }
      const destination = event.destination?.url;
      if (!destination) return;
      event.preventDefault();
      openGuard({ kind: "history", href: destination });
    };

    navigation.addEventListener("navigate", handleNavigate);
    return () => navigation.removeEventListener("navigate", handleNavigate);
  }, [isDirty, openGuard]);

  const continueEditing = useCallback(() => {
    setPending(null);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  }, []);

  const discardChanges = useCallback(() => {
    if (!pending) return;
    const destination = pending;
    bypassNavigationRef.current = true;
    setIsDirty(false);
    setPending(null);
    if (destination.kind === "route") {
      router.push(destination.href);
    } else {
      window.location.assign(destination.href);
    }
    window.setTimeout(() => {
      bypassNavigationRef.current = false;
    }, 0);
  }, [pending, router]);

  const value = useMemo(
    () => ({ isDirty, setIsDirty, requestNavigation }),
    [isDirty, requestNavigation],
  );

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
      <dialog
        ref={dialogRef}
        className={styles.unsavedDialog}
        aria-labelledby="unsaved-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          continueEditing();
        }}
      >
        <div className={styles.unsavedDialogBody}>
          <span className={styles.unsavedMark} aria-hidden="true">
            !
          </span>
          <div>
            <h2 id="unsaved-dialog-title">您有尚未保存的修改</h2>
            <p>离开后，本次修改将不会保留。</p>
          </div>
        </div>
        <div className={styles.unsavedDialogActions}>
          <button type="button" onClick={discardChanges}>
            放弃修改
          </button>
          <button type="button" onClick={continueEditing} autoFocus>
            继续编辑
          </button>
        </div>
      </dialog>
    </NavigationGuardContext.Provider>
  );
}

export function usePersonalNavigationGuard() {
  return useContext(NavigationGuardContext);
}
