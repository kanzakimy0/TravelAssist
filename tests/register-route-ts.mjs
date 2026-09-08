import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only")
      return {
        url: "data:text/javascript,export{}",
        shortCircuit: true,
      };
    try {
      return next(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
        try {
          return next(specifier + ".ts", context);
        } catch {
          return next(specifier + "/index.ts", context);
        }
      }
      throw error;
    }
  },
});
