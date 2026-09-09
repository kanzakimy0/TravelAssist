import {
  createErrorObservation,
  createMetricObservation,
  routeTemplateFromPath,
  type ObservationEventV1,
} from "./contract";
import { ObservationQueue, type ObservationSink } from "./queue";

const LOCAL_BUFFER = Symbol.for("travelassist.observability.local-buffer");
const CLIENT_INSTALLATION = Symbol.for(
  "travelassist.observability.client-installation",
);
const MAX_LOCAL_EVENTS = 32;

type ObservationGlobal = typeof globalThis & {
  [LOCAL_BUFFER]?: ObservationEventV1[];
  [CLIENT_INSTALLATION]?: ClientInstallation;
};

export interface ClientEventTarget {
  addEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => void;
  removeEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => void;
  location?: { pathname?: string };
}

export interface ClientInstallation {
  record: (event: ObservationEventV1) => void;
  flush: () => Promise<void>;
  snapshot: () => readonly ObservationEventV1[];
  stats: () => ReturnType<ObservationQueue["snapshot"]>;
  cleanup: () => void;
}

function localSink(events: readonly ObservationEventV1[]) {
  const scope = globalThis as ObservationGlobal;
  const buffer = scope[LOCAL_BUFFER] ?? [];
  buffer.push(...events.map((event) => ({ ...event })));
  if (buffer.length > MAX_LOCAL_EVENTS)
    buffer.splice(0, buffer.length - MAX_LOCAL_EVENTS);
  scope[LOCAL_BUFFER] = buffer;
}

export function readLocalObservationBuffer(): readonly ObservationEventV1[] {
  return ((globalThis as ObservationGlobal)[LOCAL_BUFFER] ?? []).map(
    (event) => ({
      ...event,
    }),
  );
}

export function clearLocalObservationBuffer() {
  delete (globalThis as ObservationGlobal)[LOCAL_BUFFER];
}

export function installClientObservability(
  target: ClientEventTarget = window,
  options: {
    sink?: ObservationSink;
    sampleRate?: number;
    environment?: string;
    release?: string;
  } = {},
): ClientInstallation {
  const scope = globalThis as ObservationGlobal;
  const existing = scope[CLIENT_INSTALLATION];
  if (existing && target === globalThis.window) return existing;
  const queue = new ObservationQueue({
    sink: options.sink ?? localSink,
    capacity: MAX_LOCAL_EVENTS,
    maxBatch: 8,
    sampleRate: options.sampleRate ?? 1,
    dedupeWindowMs: 60_000,
    maxRetries: 2,
    sinkTimeoutMs: 500,
  });
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  let cleaned = false;
  const route = () => routeTemplateFromPath(target.location?.pathname);
  const schedule = () => {
    if (flushTimer || cleaned) return;
    flushTimer = setTimeout(() => {
      flushTimer = undefined;
      void queue.flush().catch(() => {});
    }, 100);
  };
  const record = (event: ObservationEventV1) => {
    try {
      if (queue.enqueue(event)) schedule();
    } catch {
      // Observability must never become a second application failure.
    }
  };
  const onError: EventListener = (raw) => {
    const event = raw as ErrorEvent;
    record(
      createErrorObservation({
        source: "browser_runtime",
        route: route(),
        code: "browser_uncaught_error",
        error: event.error,
        environment: options.environment,
        release: options.release,
      }),
    );
  };
  const onRejection: EventListener = (raw) => {
    const event = raw as PromiseRejectionEvent;
    const reason = event.reason;
    const category =
      reason instanceof DOMException && reason.name === "AbortError"
        ? "cancelled"
        : "unexpected";
    record(
      createErrorObservation({
        source: "browser_runtime",
        route: route(),
        code:
          category === "cancelled"
            ? "browser_expected_cancellation"
            : "browser_unhandled_rejection",
        error: reason,
        category,
        environment: options.environment,
        release: options.release,
      }),
    );
  };
  const installation: ClientInstallation = {
    record,
    flush: () => queue.flush().catch(() => {}),
    snapshot: () => readLocalObservationBuffer(),
    stats: () => queue.snapshot(),
    cleanup() {
      if (cleaned) return;
      cleaned = true;
      if (flushTimer) clearTimeout(flushTimer);
      target.removeEventListener("error", onError);
      target.removeEventListener("unhandledrejection", onRejection);
      target.removeEventListener("pagehide", onPageHide);
      void queue.flush().catch(() => {});
      if (scope[CLIENT_INSTALLATION] === installation)
        delete scope[CLIENT_INSTALLATION];
    },
  };
  const onPageHide: EventListener = () => installation.cleanup();
  target.addEventListener("error", onError);
  target.addEventListener("unhandledrejection", onRejection);
  target.addEventListener("pagehide", onPageHide);
  if (target === globalThis.window) scope[CLIENT_INSTALLATION] = installation;
  return installation;
}

export function recordWebVital(input: {
  name: string;
  value: number;
  rating?: string;
}) {
  const scope = globalThis as ObservationGlobal;
  const event = createMetricObservation({
    ...input,
    route: typeof location === "undefined" ? undefined : location.pathname,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_RELEASE_SHA,
  });
  if (event) scope[CLIENT_INSTALLATION]?.record(event);
}

export function recordRouteTransition(path: string) {
  const scope = globalThis as ObservationGlobal;
  const routeTemplate = routeTemplateFromPath(path);
  const event = createErrorObservation({
    source: "planner_workspace",
    route: routeTemplate,
    code: "navigation_started",
    category: "performance",
    severity: "info",
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_RELEASE_SHA,
  });
  scope[CLIENT_INSTALLATION]?.record({ ...event, type: "timing" });
}
