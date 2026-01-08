import type { Context, CodeFormat, Theme, TailwindVersion } from "./index.ts";

export function isContext(value: string): value is Context {
  return ["marketing", "application-ui", "ecommerce"].includes(value);
}

export function isCodeFormat(value: string): value is CodeFormat {
  return ["react", "vue", "html"].includes(value);
}

export function isTheme(value: string): value is Theme {
  return ["light", "dark"].includes(value);
}

export function isTailwindVersion(value: string): value is TailwindVersion {
  return ["v4.1", "v3.4"].includes(value);
}
