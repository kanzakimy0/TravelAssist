import type { Instrumentation } from "next";

export function register() {
  // Intentionally no external SDK: external transport is off by default.
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  _request,
  context,
) => {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { serverObservationReporter } = await import("./observability/server");
  await serverObservationReporter.reportRequestError({
    error,
    routeTemplate: context.routePath,
    code: "next_request_error",
  });
};
