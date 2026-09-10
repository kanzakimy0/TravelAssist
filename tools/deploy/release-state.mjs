import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

async function manifestFor(root, commitSha) {
  if (!/^[0-9a-f]{40}$/.test(commitSha))
    throw new Error("Release SHA is invalid.");
  const release = path.resolve(root, "releases", commitSha);
  const relative = path.relative(path.resolve(root, "releases"), release);
  if (relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error("Release path escapes its root.");
  const manifest = JSON.parse(
    await readFile(path.join(release, "release-manifest.json"), "utf8"),
  );
  if (manifest.commitSha !== commitSha)
    throw new Error("Release manifest does not match the requested SHA.");
  return manifest;
}

export async function readActiveRelease(root) {
  try {
    return JSON.parse(
      await readFile(path.resolve(root, "active-release.json"), "utf8"),
    );
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT")
      return null;
    throw error;
  }
}

export async function activateRelease(root, commitSha, expectedCurrent = null) {
  await manifestFor(root, commitSha);
  const current = await readActiveRelease(root);
  if ((current?.commitSha ?? null) !== expectedCurrent)
    throw new Error("Active release changed; refusing stale promotion.");
  const target = path.resolve(root, "active-release.json");
  const temporary = `${target}.tmp`;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(
    temporary,
    `${JSON.stringify({ commitSha, previousCommitSha: current?.commitSha ?? null }, null, 2)}\n`,
  );
  await rename(temporary, target);
  return readActiveRelease(root);
}

export async function rollbackRelease(root, commitSha, expectedCurrent) {
  return activateRelease(root, commitSha, expectedCurrent);
}
