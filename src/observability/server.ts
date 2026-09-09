import "server-only";

import { createErrorObservation, type ObservationEventV1 } from "./contract";
import { ObservationQueue, type ObservationSink } from "./queue";

const defaultSink: ObservationSink = (events) => {
  for (const event of events)
    console.warn(
      JSON.stringify({
        observability: "travelassist",
        ...event,
      }),
    );
};

export function createServerObservationReporter(options?: {
  sink?: ObservationSink;
  environment?: Readonly<Record<string, string | undefined>>;
}) {
  const environment = options?.environment ?? process.env;
  const queue = new ObservationQueue({
    sink: options?.sink ?? defaultSink,
    capacity: 64,
    maxBatch: 8,
    sampleRate: 1,
    dedupeWindowMs: 60_000,
    maxRetries: 1,
    sinkTimeoutMs: 750,
  });
  return {
    async reportRequestError(input: {
      error: unknown;
      routeTemplate?: string;
      code?: string;
    }) {
      const event = createErrorObservation({
        source: "next_server",
        route: input.routeTemplate,
        code: input.code ?? "next_request_error",
        error: input.error,
        environment:
          environment.VERCEL_ENV === "preview"
            ? "preview"
            : environment.NODE_ENV,
        release: environment.VERCEL_GIT_COMMIT_SHA ?? environment.RELEASE_SHA,
      });
      queue.enqueue(event);
      await queue.flush();
      return event;
    },
    stats: () => queue.snapshot(),
    pending: (): readonly ObservationEventV1[] => queue.pending(),
  };
}

export const serverObservationReporter = createServerObservationReporter();
