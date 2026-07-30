/**
 * Product brand identity for Tailwind Plus MCP (Unofficial).
 * Isolated from the legacy mcp-for-tailwind package so both can run side-by-side.
 */

export const BRAND = {
  /** npm package name / CLI binary */
  packageName: "tailwind-plus-mcp",
  /** Human-readable product name */
  displayName: "Tailwind Plus MCP (Unofficial)",
  /** Short name used in logs */
  shortName: "tailwind-plus-mcp",
  /** MCP server name advertised to clients */
  mcpServerName: "tailwind-plus-mcp-unofficial",
  /** Semver for this unofficial fork line */
  version: "0.3.1",
  /** One-line description */
  description:
    "Unofficial MCP server giving Tailwind Plus license holders programmatic access to UI blocks, templates, kits, and Catalyst metadata for LLM-assisted development.",
} as const;

export const CLI_BIN = "tailwind-plus-mcp";
