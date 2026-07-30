import type { Context, CodeFormat, Theme, TailwindVersion } from "./index.ts";

export function isContext(value: string): value is Context {
  return ["marketing", "application-ui", "ecommerce"].includes(value);
}

export function isCodeFormat(value: string): value is CodeFormat {
  return ["react", "vue", "html"].includes(value);
}

export function isTheme(value: string): value is Theme {
  return ["light", "dark", "system"].includes(value);
}

/**
 * Accepts canonical selectors (v4, v3.4) and concrete picker labels (v4.0, v4.1, …).
 */
export function isTailwindVersion(value: string): value is TailwindVersion {
  if (value === "v4" || value === "v3.4") return true;
  return /^v\d+(\.\d+)*$/.test(value);
}

/** Normalize user/tool version input to a selection strategy key */
export function normalizeVersionRequest(version: string): "v4" | "v3.4" | string {
  if (version === "v4" || version.startsWith("v4.")) return version === "v4" ? "v4" : version;
  if (version === "v3" || version.startsWith("v3.")) return version === "v3" ? "v3.4" : version;
  return version;
}
