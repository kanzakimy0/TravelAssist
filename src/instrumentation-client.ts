import {
  installClientObservability,
  recordRouteTransition,
} from "./observability/client";

try {
  installClientObservability(window, {
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_RELEASE_SHA,
  });
} catch {
  // Monitoring initialization must not delay or break hydration.
}

export function onRouterTransitionStart(url: string) {
  try {
    recordRouteTransition(url);
  } catch {
    // Navigation remains authoritative if observation fails.
  }
}
