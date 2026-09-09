import "server-only";

import type { RouteResult } from "../../shared/contracts/routes";
import { routeError } from "./types";

export type EkiworldEntitlement = "evaluation" | "production";

export interface EkiworldConfiguration {
  endpoint: "https://api.ekispert.jp/v1/json/search/course/extreme";
  accessKey: string;
  entitlement: EkiworldEntitlement;
}

export const EKIWORLD_ENDPOINT =
  "https://api.ekispert.jp/v1/json/search/course/extreme" as const;

export function readEkiworldConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): RouteResult<EkiworldConfiguration> {
  const nodeEnvironment = environment.NODE_ENV ?? "development";
  const providerMode = environment.ROUTING_PROVIDER_MODE?.trim();
  const accessKey = environment.EKIWORLD_ACCESS_KEY?.trim();
  const productionApproved =
    environment.ROUTING_EKIWORLD_PRODUCTION_APPROVED?.trim().toLowerCase() ===
    "true";

  if (providerMode !== "evaluation" && providerMode !== "production") {
    return {
      ok: false,
      error: routeError("provider_unavailable", {
        retryable: false,
        category: "availability",
        message: "Routing provider mode is not explicitly configured.",
        metadata: { provider: "ekiworld", reason: "mode_missing" },
      }),
    };
  }
  if (!accessKey) {
    return {
      ok: false,
      error: routeError("provider_unavailable", {
        retryable: false,
        category: "availability",
        message: "Routing provider credential is not available on the server.",
        metadata: { provider: "ekiworld", reason: "credential_missing" },
      }),
    };
  }
  if (nodeEnvironment === "production" && providerMode === "evaluation") {
    return {
      ok: false,
      error: routeError("provider_unavailable", {
        retryable: false,
        category: "availability",
        message: "Evaluation routing is disabled in production.",
        metadata: { provider: "ekiworld", reason: "evaluation_in_production" },
      }),
    };
  }
  if (providerMode === "production" && !productionApproved) {
    return {
      ok: false,
      error: routeError("provider_unavailable", {
        retryable: false,
        category: "availability",
        message: "Production routing entitlement has not been approved.",
        metadata: { provider: "ekiworld", reason: "production_gate_open" },
      }),
    };
  }

  return {
    ok: true,
    value: {
      endpoint: EKIWORLD_ENDPOINT,
      accessKey,
      entitlement: providerMode,
    },
  };
}
