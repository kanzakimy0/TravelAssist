async function response(url, options) {
  return fetch(url, { signal: AbortSignal.timeout(5_000), ...options });
}

export async function runSmoke(baseUrl) {
  const checks = [];
  for (const [name, pathname] of [
    ["liveness", "/api/health/live"],
    ["readiness", "/api/health/ready"],
    ["home", "/"],
    ["planner", "/planner"],
  ]) {
    const result = await response(`${baseUrl}${pathname}`);
    checks.push({
      name,
      status: result.status,
      cacheControl: result.headers.get("cache-control"),
    });
    if (!result.ok)
      throw new Error(`${name} smoke failed with ${result.status}.`);
  }
  const route = await response(`${baseUrl}/api/routes/calculate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  checks.push({ name: "production-route-guard", status: route.status });
  if (route.status < 400)
    throw new Error("Production rehearsal unexpectedly enabled routing.");
  return checks;
}

if (process.argv[1]?.endsWith("smoke.mjs")) {
  const baseUrl = process.argv[2] ?? "http://127.0.0.1:3132";
  const checks = await runSmoke(baseUrl);
  process.stdout.write(
    `${JSON.stringify({ status: "pass", checks }, null, 2)}\n`,
  );
}
