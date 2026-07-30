/**
 * Shared utilities for browser-based fetching.
 */

/**
 * Parse npm package dependencies from code.
 * Also detects Tailwind Plus Elements script references in HTML.
 */
export function parseDependencies(code: string): string[] {
  const deps = new Set<string>();
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(code)) !== null) {
    const pkg = match[1];
    if (pkg && !pkg.startsWith(".") && !pkg.startsWith("/")) {
      const pkgName = pkg.startsWith("@")
        ? pkg.split("/").slice(0, 2).join("/")
        : pkg.split("/")[0];
      if (pkgName) deps.add(pkgName);
    }
  }

  // CDN / script style references
  if (
    code.includes("@tailwindplus/elements") ||
    code.includes("tailwindplus/elements") ||
    /el-[a-z][\w-]*/.test(code)
  ) {
    deps.add("@tailwindplus/elements");
  }

  return Array.from(deps);
}
