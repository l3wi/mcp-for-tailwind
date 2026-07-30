/**
 * Standard envelope for MCP tool results so AI agents always know:
 * what happened, what to do next, and where files/data live.
 */

export interface AgentNextStep {
  action: string;
  tool?: string;
  detail?: string;
}

export interface AgentPaths {
  /** Human-readable path map */
  [label: string]: string;
}

export function agentEnvelope<T extends Record<string, unknown>>(opts: {
  summary: string;
  data?: T;
  nextSteps?: AgentNextStep[];
  paths?: AgentPaths;
  warnings?: string[];
  errors?: string[];
}): Record<string, unknown> {
  return {
    summary: opts.summary,
    ...(opts.data ? { data: opts.data } : {}),
    paths: opts.paths ?? defaultPaths(),
    nextSteps: opts.nextSteps ?? [],
    warnings: opts.warnings ?? [],
    ...(opts.errors?.length ? { errors: opts.errors } : {}),
    agentNotes: [
      "Prefer tool results over guessing Tailwind Plus URLs or component slugs.",
      "UI block source requires auth + get_variant. Templates/kits/Catalyst zips are account downloads — this MCP does not redistribute them.",
      "Data for this unofficial server lives in ~/.tailwind-plus-mcp (not ~/.tailwind-mcp).",
    ],
  };
}

export function defaultPaths(): AgentPaths {
  return {
    dataDir: "~/.tailwind-plus-mcp",
    cookies: "~/.tailwind-plus-mcp/cookies.json",
    uiBlockCatalog: "~/.tailwind-plus-mcp/catalog-v3.json",
    codeCache: "~/.tailwind-plus-mcp/cache/",
    legacyMcpDataDir: "~/.tailwind-mcp (mcp-for-tailwind only — do not mix)",
  };
}

export function jsonResult(payload: Record<string, unknown>, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}
