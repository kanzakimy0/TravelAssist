import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/server") return next("next/server.js", context);
    if (specifier.startsWith("@/"))
      specifier = new URL("../src/" + specifier.slice(2), import.meta.url).href;
    try {
      return next(specifier, context);
    } catch (original) {
      if (
        (specifier.startsWith(".") || specifier.startsWith("file:")) &&
        !/\.[a-z]+$/i.test(specifier)
      ) {
        try {
          return next(specifier + ".ts", context);
        } catch {}
        try {
          return next(specifier + "/index.ts", context);
        } catch {}
      }
      throw original;
    }
  },
});
