// Loaded only by the explicit Local acceptance server, never imported by product code.
import { writeFileSync } from "node:fs";
const destination = process.env.TASK052_NETWORK_EVIDENCE;
if (!destination) throw Error("Local network evidence destination required");
const metrics = { localRequests: 0, externalRequests: 0 };
const original = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  const url = new URL(
    typeof input === "string" || input instanceof URL ? input : input.url,
  );
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (local) metrics.localRequests++;
  else metrics.externalRequests++;
  writeFileSync(destination, JSON.stringify(metrics));
  if (!local) throw Error("Local acceptance forbids external requests");
  return original(input, init);
};
