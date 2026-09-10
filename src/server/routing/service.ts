import "server-only";

import type {
  RouteRequest,
  RouteResponse,
  RouteResult,
} from "../../shared/contracts/routes";
import {
  validateRouteRequest,
  validateRouteResponse,
} from "../../shared/contracts/routes/validation";
import { routeError, type RoutingProvider } from "./types";

export interface RoutingServiceOptions {
  provider: RoutingProvider;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  now?: () => Date;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
}

export interface RoutingService {
  calculate(
    request: RouteRequest,
    signal?: AbortSignal,
  ): Promise<RouteResult<RouteResponse>>;
}

function mergeAbortSignals(
  external: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; dispose: () => void; didTimeout: () => boolean } {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("Routing timeout", "TimeoutError"));
  }, timeoutMs);
  const abort = () => controller.abort(external?.reason);
  external?.addEventListener("abort", abort, { once: true });
  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose: () => {
      clearTimeout(timeout);
      external?.removeEventListener("abort", abort);
    },
  };
}

const defaultSleep = (milliseconds: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

export function createRoutingService(
  options: RoutingServiceOptions,
): RoutingService {
  const timeoutMs = Math.max(100, Math.min(options.timeoutMs ?? 8_000, 30_000));
  const maxRetries = Math.max(0, Math.min(options.maxRetries ?? 1, 2));
  const retryDelayMs = Math.max(
    0,
    Math.min(options.retryDelayMs ?? 150, 2_000),
  );
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? defaultSleep;

  return {
    async calculate(request, externalSignal) {
      const requestValidation = validateRouteRequest(request);
      if (!requestValidation.valid) {
        return {
          ok: false,
          error: routeError("invalid_request", {
            retryable: false,
            category: "request",
            message: "The route request is invalid.",
            metadata: { issueCount: requestValidation.issues.length },
          }),
        };
      }

      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        if (externalSignal?.aborted) {
          return {
            ok: false,
            error: routeError("provider_unavailable", {
              retryable: false,
              category: "availability",
              message: "The route request was cancelled.",
              metadata: {
                provider: options.provider.id,
                reason: "caller_abort",
              },
            }),
          };
        }
        const timeout = mergeAbortSignals(externalSignal, timeoutMs);
        const providerCall = options.provider
          .calculate(request, {
            signal: timeout.signal,
            attempt,
            now,
          })
          .catch(() => ({
            ok: false as const,
            error: routeError("provider_unavailable", {
              retryable: true,
              category: "availability",
              message: "The route provider is temporarily unavailable.",
              metadata: {
                provider: options.provider.id,
                reason: "transport_failure",
              },
            }),
          }));
        const aborted = new Promise<RouteResult<RouteResponse>>((resolve) => {
          timeout.signal.addEventListener(
            "abort",
            () =>
              resolve({
                ok: false,
                error: routeError("provider_timeout", {
                  retryable: timeout.didTimeout(),
                  category: "availability",
                  message: timeout.didTimeout()
                    ? "The route provider timed out."
                    : "The route request was cancelled.",
                  metadata: {
                    provider: options.provider.id,
                    reason: timeout.didTimeout() ? "timeout" : "caller_abort",
                  },
                }),
              }),
            { once: true },
          );
        });
        const result = await Promise.race([providerCall, aborted]);
        timeout.dispose();

        if (result.ok) {
          const validation = validateRouteResponse(result.value);
          if (!validation.valid) {
            return {
              ok: false,
              error: routeError("normalization_error", {
                retryable: false,
                category: "internal",
                message:
                  "The normalized route did not satisfy the public contract.",
                metadata: {
                  provider: options.provider.id,
                  issueCount: validation.issues.length,
                },
              }),
            };
          }
          return result;
        }
        if (!result.error.retryable || attempt === maxRetries) return result;
        try {
          await sleep(
            retryDelayMs * (attempt + 1),
            externalSignal ?? new AbortController().signal,
          );
        } catch {
          return {
            ok: false,
            error: routeError("provider_unavailable", {
              retryable: false,
              category: "availability",
              message: "The route request was cancelled.",
              metadata: {
                provider: options.provider.id,
                reason: "caller_abort",
              },
            }),
          };
        }
      }
      return {
        ok: false,
        error: routeError("unknown", {
          retryable: false,
          category: "internal",
          message: "Routing failed.",
        }),
      };
    },
  };
}
