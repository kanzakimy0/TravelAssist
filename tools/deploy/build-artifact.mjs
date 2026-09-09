import { buildLocalRelease } from "./artifact.mjs";

const result = await buildLocalRelease();
process.stdout.write(
  `${JSON.stringify(
    {
      status: "built",
      target: result.target,
      manifest: result.manifest,
      artifactAudit: {
        ok: result.verification.ok,
        fileCount: result.verification.fileCount,
      },
    },
    null,
    2,
  )}\n`,
);
