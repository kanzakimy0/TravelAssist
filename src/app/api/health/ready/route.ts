import { deploymentEnvironmentReport } from "../../../../server/environment/config";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
} as const;

export function GET() {
  const ready = deploymentEnvironmentReport().ok;
  return Response.json(
    { status: ready ? "ready" : "unavailable" },
    { status: ready ? 200 : 503, headers },
  );
}
