// Scoped Node test loader for rendering the actual TSX presentation components.
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import ts from "typescript";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.endsWith(".css"))
      return {
        url: "data:text/javascript,export default new Proxy({}, {get: (_, name) => String(name)})",
        shortCircuit: true,
      };
    if (specifier.startsWith("@/"))
      specifier = pathToFileURL(resolve("src", specifier.slice(2))).href;
    if (specifier === "next/link") return next("next/link.js", context);
    if (specifier === "next/navigation")
      return next("next/navigation.js", context);
    try {
      return next(specifier, context);
    } catch (error) {
      for (const ext of [".ts", ".tsx", "/index.ts"]) {
        try {
          return next(specifier + ext, context);
        } catch {}
      }
      throw error;
    }
  },
  load(url, context, next) {
    if (!url.endsWith(".tsx")) return next(url, context);
    return {
      format: "module",
      shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
    };
  },
});
