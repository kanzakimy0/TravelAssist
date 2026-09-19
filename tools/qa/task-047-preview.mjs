// Local-only manual acceptance. Credentials remain inside the runtime process.
import { preferenceLocalRuntime } from "../../tests/task-045-local-helpers.mjs";
import { startApp } from "../../tests/task-018-local-helpers.mjs";
const local = preferenceLocalRuntime();
const app = await startApp(local);
console.log(
  "TASK-047 Local preview: " + app.origin + "/personal-center/companions",
);
console.log("Create/sign in with Local Auth; local email inbox: " + local.mail);
async function stop() {
  await app.stop();
  await local.db.end();
  process.exit(0);
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
await new Promise(() => {});
