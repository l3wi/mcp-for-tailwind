import { Hono } from "hono";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPTransport } from "@hono/mcp";
import { z } from "zod";
import type { Context, CodeFormat, Theme, TailwindVersion } from "./types/index.ts";
import { getBrowser, setupPage, checkAuthState, login } from "./browser/browser.ts";
import { VariantFetcher } from "./browser/variant-fetcher.ts";
import { CatalogManager } from "./data/catalog-manager.ts";
import { CacheManager } from "./cache/cache-manager.ts";
import { search, suggest } from "./data/search.ts";

// Singletons
const catalogManager = new CatalogManager();
const cacheManager = new CacheManager();

// Create variant fetcher
function createVariantFetcher() {
  return new VariantFetcher(getBrowser, setupPage);
}

// Create and configure an MCP server instance
function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: "mcp-for-tailwind", version: "0.2.0" },
    { capabilities: { tools: {} } }
  );

  // Tool 1: list_categories
  server.registerTool(
    "list_categories",
    {
      title: "List Categories",
      description: `List all top-level Tailwind Plus UI categories.

CATEGORIES:
- marketing: Landing pages, hero sections, pricing (~32 blocks)
- application-ui: Dashboards, forms, tables, modals (~45 blocks)
- ecommerce: Products, carts, checkout (~18 blocks)

Each category contains multiple blocks, and each block has multiple variants.`,
      inputSchema: {},
    },
    async () => {
      const categories = catalogManager.getCategoryInfo();

      if (categories.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: "CATALOG_EMPTY",
                  message: "No catalog found. Run sync-catalog first.",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ categories }, null, 2),
          },
        ],
      };
    }
  );

  // Tool 2: list_blocks
  server.registerTool(
    "list_blocks",
    {
      title: "List Blocks",
      description: `List all blocks in a category with variant counts.

EXAMPLES:
- category="marketing" → Heroes, Testimonials, Pricing, CTAs...
- category="application-ui", subcategory="forms" → Form layouts, Sign-in...

Returns block names, slugs, descriptions, and variant counts.`,
      inputSchema: {
        category: z
          .enum(["marketing", "application-ui", "ecommerce"])
          .describe("Category to list blocks for"),
        subcategory: z.string().optional().describe("Filter by subcategory (e.g., 'sections', 'forms')"),
      },
    },
    async ({ category, subcategory }) => {
      const blocks = catalogManager.getBlocks(category as Context, subcategory);

      if (blocks.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: "NO_BLOCKS",
                  message: subcategory
                    ? `No blocks found in ${category}/${subcategory}. Try without subcategory filter.`
                    : `No blocks found in ${category}. Run sync-catalog first.`,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const result = {
        category,
        subcategory: subcategory || "all",
        blockCount: blocks.length,
        blocks: blocks.map((b) => ({
          name: b.name,
          slug: b.slug,
          subcategory: b.subcategory,
          variantCount: b.variantCount,
          description: b.description,
        })),
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool 3: list_variants
  server.registerTool(
    "list_variants",
    {
      title: "List Variants",
      description: `List all variants for a specific block.

EXAMPLE:
- category="marketing", block="testimonials"
- Returns: Simple centered, With large avatar, Grid, etc.

Use these variant slugs with get_variant to fetch code.`,
      inputSchema: {
        category: z
          .enum(["marketing", "application-ui", "ecommerce"])
          .describe("Category containing the block"),
        block: z.string().describe("Block slug (e.g., 'testimonials', 'heroes')"),
      },
    },
    async ({ category, block: blockSlug }) => {
      // Find the block - need to search across subcategories
      const blocks = catalogManager.getBlocks(category as Context);
      const block = blocks.find((b) => b.slug === blockSlug);

      if (!block) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: "BLOCK_NOT_FOUND",
                  message: `Block '${blockSlug}' not found in ${category}. Use list_blocks to see available blocks.`,
                  availableBlocks: blocks.slice(0, 10).map((b) => b.slug),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const result = {
        block: {
          name: block.name,
          slug: block.slug,
          category: block.category,
          subcategory: block.subcategory,
          description: block.description,
        },
        variantCount: block.variants.length,
        variants: block.variants.map((v) => ({
          index: v.index,
          name: v.name,
          slug: v.slug,
        })),
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool 4: get_variant
  server.registerTool(
    "get_variant",
    {
      title: "Get Variant Code",
      description: `Fetch the full source code for a specific variant.

AUTHENTICATION: Requires valid Tailwind Plus subscription.
If not authenticated, use the 'login' tool to open a browser for authentication.

PARAMETERS:
- category: "marketing", "application-ui", or "ecommerce"
- block: Block slug (e.g., "testimonials")
- variant: Variant slug (e.g., "simple-centered")
- format: "react", "vue", or "html"
- version: "v4.1" (latest) or "v3.4" (legacy)
- theme: "light" or "dark"

Code is cached for 7 days after first fetch.`,
      inputSchema: {
        category: z.enum(["marketing", "application-ui", "ecommerce"]).describe("Category"),
        block: z.string().describe("Block slug"),
        variant: z.string().describe("Variant slug (kebab-case)"),
        format: z.enum(["react", "vue", "html"]).optional().default("react"),
        version: z.enum(["v4.1", "v3.4"]).optional().default("v4.1"),
        theme: z.enum(["light", "dark"]).optional().default("light"),
      },
    },
    async ({ category, block: blockSlug, variant: variantSlug, format = "react", version = "v4.1", theme = "light" }) => {
      // Check auth
      const authState = checkAuthState();
      if (!authState.isAuthenticated) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: "AUTH_REQUIRED",
                  message: "Authentication required to fetch component code.",
                  action: "Use the 'login' tool to open a browser and authenticate with your Tailwind Plus account.",
                  cookiesExist: authState.cookiesExist,
                  cookiesExpired: authState.cookiesExpired,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // Check cache first
      const cached = await cacheManager.getVariant(
        category as Context,
        blockSlug,
        variantSlug,
        format as CodeFormat,
        theme as Theme,
        version as TailwindVersion
      );

      if (cached) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  block: cached.blockSlug,
                  variant: cached.variantSlug,
                  variantName: cached.variantName,
                  format: cached.format,
                  version: cached.version,
                  theme: cached.theme,
                  code: cached.code,
                  dependencies: cached.dependencies,
                  cached: true,
                  cachedAt: cached.cachedAt,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Find block to get subcategory and variant index
      const blocks = catalogManager.getBlocks(category as Context);
      const block = blocks.find((b) => b.slug === blockSlug);

      if (!block) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: "BLOCK_NOT_FOUND",
                  message: `Block '${blockSlug}' not found. Use list_blocks first.`,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const variant = block.variants.find((v) => v.slug === variantSlug);

      if (!variant) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: "VARIANT_NOT_FOUND",
                  message: `Variant '${variantSlug}' not found in ${blockSlug}. Use list_variants first.`,
                  availableVariants: block.variants.map((v) => v.slug),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // Fetch from website
      try {
        const fetcher = createVariantFetcher();
        const code = await fetcher.fetchVariantCode(
          category as Context,
          block.subcategory,
          blockSlug,
          variant.index,
          format as CodeFormat,
          version as TailwindVersion,
          theme as Theme
        );

        // Cache for future use
        await cacheManager.setVariant(code);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  block: code.blockSlug,
                  variant: code.variantSlug,
                  variantName: code.variantName,
                  format: code.format,
                  version: code.version,
                  theme: code.theme,
                  code: code.code,
                  dependencies: code.dependencies,
                  cached: false,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
          isError: true,
        };
      }
    }
  );

  // Tool 5: search
  server.registerTool(
    "search",
    {
      title: "Search Components",
      description: `Search across all blocks and variants.

EXAMPLES:
- "testimonial grid" → Grid testimonial variant
- "pricing table" → Pricing blocks and variants
- "modal dialog" → Modal and dialog components

Returns ranked results by relevance.`,
      inputSchema: {
        query: z.string().describe("Search term"),
        category: z
          .enum(["marketing", "application-ui", "ecommerce"])
          .optional()
          .describe("Limit to category"),
        limit: z.number().optional().default(10).describe("Max results"),
      },
    },
    async ({ query, category, limit = 10 }) => {
      const results = search(query, catalogManager, {
        category: category as Context | undefined,
        limit,
        includeVariants: true,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                query,
                category: category || "all",
                resultCount: results.length,
                results,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Tool 6: suggest
  server.registerTool(
    "suggest",
    {
      title: "Suggest Components",
      description: `Get context-aware suggestions based on what you're building.

EXAMPLES:
- "SaaS landing page" → Heroes, pricing, testimonials, CTAs
- "admin dashboard" → Sidebars, tables, stats, forms
- "ecommerce store" → Products, carts, checkout

Helps find complementary components.`,
      inputSchema: {
        building: z.string().describe("What you're building"),
        alreadyUsed: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Block slugs to exclude"),
      },
    },
    async ({ building, alreadyUsed = [] }) => {
      const suggestions = suggest(building, catalogManager, alreadyUsed);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                building,
                excludedCount: alreadyUsed.length,
                suggestionCount: suggestions.length,
                suggestions,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Tool 7: check_status
  server.registerTool(
    "check_status",
    {
      title: "Check Status",
      description: `Check authentication status, catalog availability, and cache statistics.

Use this tool to diagnose issues or verify the system is ready to fetch components.

RETURNS:
- authentication: Login status and guidance if action needed
- catalog: Whether component metadata is synced
- cache: Number of cached variants and storage used`,
      inputSchema: {},
    },
    async () => {
      const authState = checkAuthState();
      const catalogStats = catalogManager.getEnhancedStats();
      const cacheStats = cacheManager.getVariantStats();

      // Determine auth status and action
      let authStatus: "authenticated" | "expired" | "not_logged_in";
      let authAction: string | undefined;

      if (authState.isAuthenticated) {
        authStatus = "authenticated";
      } else if (authState.cookiesExpired) {
        authStatus = "expired";
        authAction = "Use the 'login' tool to re-authenticate.";
      } else {
        authStatus = "not_logged_in";
        authAction = "Use the 'login' tool to authenticate with your Tailwind Plus account.";
      }

      const result = {
        authentication: {
          status: authStatus,
          lastLoginAt: authState.lastLoginAt ? new Date(authState.lastLoginAt).toISOString() : undefined,
          action: authAction,
        },
        catalog: {
          status: catalogStats ? "synced" : "not_synced",
          totalBlocks: catalogStats?.totalBlocks ?? 0,
          totalVariants: catalogStats?.totalVariants ?? 0,
          action: catalogStats ? undefined : "Run CLI: bun run src/index.ts sync-catalog",
        },
        cache: {
          totalCachedVariants: cacheStats.totalVariants,
          sizeBytes: cacheStats.totalSize,
        },
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool 8: login
  server.registerTool(
    "login",
    {
      title: "Login to Tailwind Plus",
      description: `Launch a browser window for Tailwind Plus authentication.

IMPORTANT: This opens a visible browser window. The user must be present at the machine to complete login.

FLOW:
1. Browser opens to Tailwind Plus login page
2. User logs in with their credentials
3. Browser closes automatically after successful login
4. Cookies are saved for future requests

TIMEOUT: 5 minutes to complete login.`,
      inputSchema: {},
    },
    async () => {
      // Check if already authenticated
      const authState = checkAuthState();
      if (authState.isAuthenticated) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "already_authenticated",
                  message: "Already logged in to Tailwind Plus.",
                  lastLoginAt: authState.lastLoginAt ? new Date(authState.lastLoginAt).toISOString() : undefined,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      try {
        // Launch browser for login
        await login();

        // Verify login succeeded
        const newAuthState = checkAuthState();
        if (newAuthState.isAuthenticated) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    status: "success",
                    message: "Successfully logged in to Tailwind Plus!",
                    nextSteps: [
                      "Use 'list_categories' to browse available components",
                      "Use 'search' to find specific components",
                      "Use 'get_variant' to fetch component code",
                    ],
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    status: "failed",
                    message: "Login was not completed. Please try again.",
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "error",
                  message: `Login failed: ${message}`,
                  hint: "Ensure you have a browser installed and are at the machine to complete login.",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}

// Create the Hono app
const app = new Hono();

// MCP endpoint
app.all("/mcp", async (c) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPTransport();
  await server.connect(transport);
  return transport.handleRequest(c);
});

// Health check endpoint
app.get("/health", (c) => {
  const authState = checkAuthState();
  const stats = cacheManager.getVariantStats();

  return c.json({
    status: "ok",
    server: "mcp-for-tailwind",
    version: "0.2.0",
    authenticated: authState.isAuthenticated,
    cache: {
      totalVariants: stats.totalVariants,
      totalSize: stats.totalSize,
    },
  });
});

// Root endpoint
app.get("/", (c) => {
  return c.json({
    name: "mcp-for-tailwind",
    version: "0.2.0",
    description: "MCP server for Tailwind Plus UI components with variant-level access",
    endpoints: {
      mcp: "/mcp",
      health: "/health",
    },
    tools: [
      "list_categories",
      "list_blocks",
      "list_variants",
      "get_variant",
      "search",
      "suggest",
      "check_status",
      "login",
    ],
  });
});

export { app };
export default app;

// Start server for local development
export async function startServer(port = 3000) {
  const { serve } = await import("@hono/node-server");

  console.log(`mcp-for-tailwind v0.2.0`);
  console.log(`Running on http://localhost:${port}`);
  console.log(`MCP endpoint: http://localhost:${port}/mcp`);
  console.log("");

  const authState = checkAuthState();
  if (authState.isAuthenticated) {
    console.log("Authentication: Valid cookies found");
  } else if (authState.cookiesExpired) {
    console.log("Authentication: Cookies expired - run 'login' to refresh");
  } else {
    console.log("Authentication: Not logged in - run 'login' first");
  }

  const catalogStats = catalogManager.getEnhancedStats();
  if (catalogStats) {
    console.log(`Catalog: ${catalogStats.totalBlocks} blocks, ${catalogStats.totalVariants} variants`);
  } else {
    console.log("Catalog: Not synced - run 'sync-catalog' first");
  }
  console.log("");

  serve({
    fetch: app.fetch,
    port,
  });
}

// Start server in stdio mode (for MCP clients like Claude Desktop)
export async function startStdioServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
}
