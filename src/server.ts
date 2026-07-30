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
import {
  buildProductsCatalog,
  getTemplate,
  listKits,
  listTemplatesOnly,
  productOverview,
  CATALYST_COMPONENTS,
  TEMPLATES,
} from "./data/products.ts";
import {
  CATALYST_COMPONENTS as CATALYST_FULL,
  getCatalystComponent,
  getCatalystSetupGuide,
  listCatalystByGroup,
  listCatalystCustomizations,
  CATALYST_CONTROL_COLORS,
  CATALYST_BADGE_COLORS,
  CATALYST_ADAPTIVE_COLORS,
  CATALYST_SOLID_COLORS,
} from "./data/catalyst.ts";
import { generateCatalystUiKit } from "./generate/ui-kit.ts";
import { BRAND } from "./brand.ts";
import {
  DEFAULT_FORMAT,
  DEFAULT_TAILWIND_VERSION,
  DEFAULT_THEME,
  PACKAGE_VERSION,
} from "./config.ts";

const catalogManager = new CatalogManager();
const cacheManager = new CacheManager();

function createVariantFetcher() {
  return new VariantFetcher(getBrowser, setupPage);
}

const versionSchema = z
  .string()
  .optional()
  .default(DEFAULT_TAILWIND_VERSION)
  .describe("Tailwind version: 'v4' (latest v4.x on page) or 'v3.4' (legacy). Concrete labels like v4.0 also accepted.");

const themeSchema = z
  .enum(["light", "dark", "system"])
  .optional()
  .default(DEFAULT_THEME)
  .describe("Theme mode: light, dark, or system (dual-mode snippet)");

function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: BRAND.mcpServerName, version: PACKAGE_VERSION },
    { capabilities: { tools: {} } }
  );

  server.registerTool(
    "list_categories",
    {
      title: "List UI Block Categories",
      description: `List top-level Tailwind Plus UI block categories.

CATEGORIES:
- marketing: Landing pages, heroes, pricing
- application-ui: Dashboards, forms, tables, modals
- ecommerce: Products, carts, checkout

For templates / kits / Catalyst use list_products, list_templates, list_kits, list_catalyst.`,
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
                  message:
                    "No UI-block catalog found. Run: tailwind-plus-mcp sync-catalog --metadata-only",
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
            text: JSON.stringify({ categories, server: BRAND.displayName }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "list_blocks",
    {
      title: "List Blocks",
      description: `List all UI blocks in a category with variant counts.

EXAMPLES:
- category="marketing" → Heroes, Testimonials, Pricing...
- category="application-ui", subcategory="forms" → Form layouts, Sign-in...`,
      inputSchema: {
        category: z.enum(["marketing", "application-ui", "ecommerce"]).describe("Category"),
        subcategory: z.string().optional().describe("Filter by subcategory (e.g. sections, forms)"),
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
                    ? `No blocks found in ${category}/${subcategory}.`
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

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
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
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "list_variants",
    {
      title: "List Variants",
      description: `List all variants for a UI block.

EXAMPLE: category="marketing", block="testimonials"
→ Simple centered, With large avatar, Grid, …`,
      inputSchema: {
        category: z.enum(["marketing", "application-ui", "ecommerce"]).describe("Category"),
        block: z.string().describe("Block slug (e.g. testimonials, heroes)"),
      },
    },
    async ({ category, block: blockSlug }) => {
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
                  message: `Block '${blockSlug}' not found in ${category}.`,
                  availableBlocks: blocks.slice(0, 15).map((b) => b.slug),
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
            text: JSON.stringify(
              {
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
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_variant",
    {
      title: "Get Variant Code",
      description: `Fetch full source for a UI-block variant (requires Tailwind Plus auth).

PARAMETERS:
- format: react | vue | html
- version: v4 (latest v4.x) or v3.4 — site currently ships Tailwind CSS v4.3 content under the v4 picker
- theme: light | dark | system (Aug 2025+ dual-mode support)

HTML interactive snippets may need Tailwind Plus Elements (notes returned when detected).
Code is cached 7 days.`,
      inputSchema: {
        category: z.enum(["marketing", "application-ui", "ecommerce"]),
        block: z.string().describe("Block slug"),
        variant: z.string().describe("Variant slug (kebab-case)"),
        format: z.enum(["react", "vue", "html"]).optional().default(DEFAULT_FORMAT),
        version: versionSchema,
        theme: themeSchema,
      },
    },
    async ({
      category,
      block: blockSlug,
      variant: variantSlug,
      format = DEFAULT_FORMAT,
      version = DEFAULT_TAILWIND_VERSION,
      theme = DEFAULT_THEME,
    }) => {
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
                  action: "Use the 'login' tool to authenticate with your Tailwind Plus account.",
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
                  resolvedVersion: cached.resolvedVersion,
                  theme: cached.theme,
                  code: cached.code,
                  dependencies: cached.dependencies,
                  notes: cached.notes,
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

      const blocks = catalogManager.getBlocks(category as Context);
      const block = blocks.find((b) => b.slug === blockSlug);

      if (!block) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "BLOCK_NOT_FOUND",
                message: `Block '${blockSlug}' not found. Use list_blocks first.`,
              }),
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
              text: JSON.stringify({
                error: "VARIANT_NOT_FOUND",
                message: `Variant '${variantSlug}' not found in ${blockSlug}.`,
                availableVariants: block.variants.map((v) => v.slug),
              }),
            },
          ],
          isError: true,
        };
      }

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
                  resolvedVersion: code.resolvedVersion,
                  theme: code.theme,
                  code: code.code,
                  dependencies: code.dependencies,
                  notes: code.notes,
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

  server.registerTool(
    "search",
    {
      title: "Search Components",
      description: `Search UI blocks/variants, plus templates, kits, and Catalyst by keyword.`,
      inputSchema: {
        query: z.string().describe("Search term"),
        category: z
          .enum(["marketing", "application-ui", "ecommerce"])
          .optional()
          .describe("Limit UI-block search to a category"),
        limit: z.number().optional().default(10),
        includeProducts: z
          .boolean()
          .optional()
          .default(true)
          .describe("Also search templates, kits, and Catalyst"),
      },
    },
    async ({ query, category, limit = 10, includeProducts = true }) => {
      const results = search(query, catalogManager, {
        category: category as Context | undefined,
        limit,
        includeVariants: true,
      });

      const productHits: Array<Record<string, unknown>> = [];
      if (includeProducts) {
        const q = query.toLowerCase();
        for (const t of TEMPLATES) {
          const hay = `${t.name} ${t.tagline} ${t.description} ${t.slug}`.toLowerCase();
          if (hay.includes(q) || q.split(/\s+/).some((w) => hay.includes(w))) {
            productHits.push({
              type: t.kind === "kit" ? "kit" : "template",
              name: t.name,
              slug: t.slug,
              tagline: t.tagline,
              url: t.url,
              relevance: hay.includes(q) ? 0.95 : 0.7,
            });
          }
        }
        for (const c of CATALYST_COMPONENTS) {
          const hay = `${c.name} ${c.slug} ${c.group}`.toLowerCase();
          if (hay.includes(q)) {
            productHits.push({
              type: "catalyst",
              name: c.name,
              slug: c.slug,
              group: c.group,
              docsUrl: c.docsUrl,
              relevance: 0.85,
            });
          }
        }
        productHits.sort((a, b) => (b.relevance as number) - (a.relevance as number));
      }

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
                products: productHits.slice(0, limit),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "suggest",
    {
      title: "Suggest Components",
      description: `Context-aware UI-block suggestions for what you're building.

EXAMPLES: "SaaS landing page", "admin dashboard", "ecommerce store"`,
      inputSchema: {
        building: z.string().describe("What you're building"),
        alreadyUsed: z.array(z.string()).optional().default([]).describe("Block slugs to exclude"),
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

  server.registerTool(
    "list_products",
    {
      title: "List Tailwind Plus Product Surfaces",
      description: `Overview of everything in Tailwind Plus: UI Blocks, Templates, Kits (Oatmeal), and Catalyst UI Kit — with how this MCP accesses each.`,
      inputSchema: {},
    },
    async () => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                server: BRAND.displayName,
                version: PACKAGE_VERSION,
                ...productOverview(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "list_templates",
    {
      title: "List Templates",
      description: `List Tailwind Plus site templates (Next.js). Metadata + product URLs only — zips download from your account, not via this MCP.`,
      inputSchema: {
        includeKits: z
          .boolean()
          .optional()
          .default(false)
          .describe("Include kit products (e.g. Oatmeal) in the list"),
      },
    },
    async ({ includeKits = false }) => {
      const items = includeKits ? TEMPLATES : listTemplatesOnly();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: items.length,
                templates: items,
                note: "Templates are zip downloads from Tailwind Plus. This tool provides discovery metadata for license holders.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "list_kits",
    {
      title: "List Kits",
      description: `List Tailwind Plus kits (e.g. Oatmeal multi-theme marketing kit).`,
      inputSchema: {},
    },
    async () => {
      const kits = listKits();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: kits.length,
                kits,
                note: "Kits are mix-and-match section libraries delivered as downloads. Oatmeal uses Tailwind Plus Elements.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_template",
    {
      title: "Get Template / Kit Details",
      description: `Get metadata for a template or kit by slug (oatmeal, radiant, compass, …).`,
      inputSchema: {
        slug: z.string().describe("Template or kit slug"),
      },
    },
    async ({ slug }) => {
      const t = getTemplate(slug);
      if (!t) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "NOT_FOUND",
                message: `No template/kit '${slug}'.`,
                available: TEMPLATES.map((x) => x.slug),
              }),
            },
          ],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ template: t }, null, 2) }],
      };
    }
  );

  server.registerTool(
    "list_catalyst",
    {
      title: "List Catalyst Components",
      description: `List all Catalyst UI Kit components from the official docs (26 components including Select). Group filter optional. For full APIs use get_catalyst_component.`,
      inputSchema: {
        group: z.string().optional().describe("Filter by group: Layouts, Forms, Elements, …"),
      },
    },
    async ({ group }) => {
      let items = CATALYST_FULL;
      if (group) {
        const g = group.toLowerCase();
        items = items.filter((c) => c.group.toLowerCase().includes(g));
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: items.length,
                byGroup: listCatalystByGroup(),
                components: items.map((c) => ({
                  name: c.name,
                  slug: c.slug,
                  group: c.group,
                  exports: c.exports,
                  docsUrl: c.docsUrl,
                  hasColors: Boolean(c.colors?.length),
                  defaultColor: c.defaultColor,
                })),
                productUrl: "https://tailwindcss.com/plus/ui-kit",
                docs: "https://catalyst.tailwindui.com/docs",
                download: "https://tailwindcss.com/plus/templates/catalyst/download",
                stack: ["Tailwind CSS v4+", "React 19", "Headless UI v2", "motion", "clsx"],
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_catalyst_component",
    {
      title: "Get Catalyst Component (full API)",
      description: `Full Catalyst component docs model: exports, props, color options, className policy, icon sizes, examples, related components.`,
      inputSchema: {
        slug: z.string().describe("Component slug (e.g. button, select, sidebar-layout)"),
      },
    },
    async ({ slug }) => {
      const c = getCatalystComponent(slug);
      if (!c) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "NOT_FOUND",
                available: CATALYST_FULL.map((x) => x.slug),
              }),
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                component: c,
                note: "Source files live in catalyst-ui-kit.zip from your Tailwind Plus account. This tool returns the public API/customization surface from the docs.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_catalyst_setup",
    {
      title: "Catalyst Setup Guide",
      description: `Complete Getting Started checklist from catalyst.tailwindui.com/docs: download, deps, Link router integration (Next/Remix/Inertia), Inter @theme font, Heroicons sizes, theming boundaries.`,
      inputSchema: {},
    },
    async () => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(getCatalystSetupGuide(), null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "list_catalyst_customizations",
    {
      title: "List All Catalyst Customizations",
      description: `100% inventory of customization features mentioned in Catalyst docs: colors (adaptive + solid + badge), button styles, form states, Link routers, fonts, icons, className policy, theme policy, dependencies.`,
      inputSchema: {},
    },
    async () => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(listCatalystCustomizations(), null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "list_catalyst_colors",
    {
      title: "List Catalyst Color Systems",
      description: `Color prop coverage for Catalyst controls and badges (from docs color references).`,
      inputSchema: {
        kind: z
          .enum(["control", "badge", "all"])
          .optional()
          .default("all")
          .describe("control = Button/Checkbox/Switch/Radio; badge = Badge colors"),
      },
    },
    async ({ kind = "all" }) => {
      const payload: Record<string, unknown> = {
        adaptive: CATALYST_ADAPTIVE_COLORS,
        solid: CATALYST_SOLID_COLORS,
        defaultControl: "dark/zinc",
        defaultBadge: "zinc",
        usage:
          "Prefer color prop over custom classes. Adaptive colors (dark/zinc, dark/white) flip for light/dark contrast.",
      };
      if (kind === "control" || kind === "all") {
        payload.controlColors = CATALYST_CONTROL_COLORS;
        payload.controlCount = CATALYST_CONTROL_COLORS.length;
        payload.controlComponents = ["button", "checkbox", "switch", "radio", "dropdown-button"];
      }
      if (kind === "badge" || kind === "all") {
        payload.badgeColors = CATALYST_BADGE_COLORS;
        payload.badgeCount = CATALYST_BADGE_COLORS.length;
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
      };
    }
  );

  server.registerTool(
    "generate_ui_kit",
    {
      title: "Generate Custom Catalyst UI Kit Scaffold",
      description: `Scaffold a project for building your own component system on Catalyst: package.json deps, Link for Next/Remix/Inertia, Inter @theme CSS, brand color mapping, color maps, component barrel + stubs, CATALYST_SETUP.md.

Does NOT include Catalyst zip source (download with your license). Stubs throw until you copy files from the zip.`,
      inputSchema: {
        outDir: z.string().describe("Absolute or relative output directory"),
        name: z.string().optional().describe("Project name"),
        lang: z.enum(["typescript", "javascript"]).optional().default("typescript"),
        router: z
          .enum(["next", "remix", "inertia", "plain"])
          .optional()
          .default("next")
          .describe("Client-side Link integration"),
        brandColor: z
          .string()
          .optional()
          .default("indigo")
          .describe("Tailwind palette name for brand CSS variables (e.g. indigo, cyan, rose)"),
        interFont: z.boolean().optional().default(true),
        heroicons: z.boolean().optional().default(true),
        force: z.boolean().optional().default(false).describe("Overwrite existing stubs"),
      },
    },
    async ({
      outDir,
      name,
      lang = "typescript",
      router = "next",
      brandColor = "indigo",
      interFont = true,
      heroicons = true,
      force = false,
    }) => {
      try {
        const result = generateCatalystUiKit({
          outDir,
          name,
          lang,
          router,
          brandColor,
          interFont,
          heroicons,
          force,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "ok",
                  outDir: result.outDir,
                  filesWritten: result.filesWritten.length,
                  files: result.filesWritten,
                  nextSteps: result.nextSteps,
                  customizationsCovered: Object.keys(result.customizations),
                  note: "Copy licensed Catalyst components from the zip into the components directory to replace STUBs.",
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "check_status",
    {
      title: "Check Status",
      description: `Auth, UI-block catalog, product catalog, and cache stats for ${BRAND.displayName}.`,
      inputSchema: {},
    },
    async () => {
      const authState = checkAuthState();
      const catalogStats = catalogManager.getEnhancedStats();
      const cacheStats = cacheManager.getVariantStats();
      const products = buildProductsCatalog();

      let authStatus: "authenticated" | "expired" | "not_logged_in";
      let authAction: string | undefined;

      if (authState.isAuthenticated) authStatus = "authenticated";
      else if (authState.cookiesExpired) {
        authStatus = "expired";
        authAction = "Use the 'login' tool to re-authenticate.";
      } else {
        authStatus = "not_logged_in";
        authAction = "Use the 'login' tool to authenticate with your Tailwind Plus account.";
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                server: BRAND.displayName,
                package: BRAND.packageName,
                version: PACKAGE_VERSION,
                dataDir: "~/.tailwind-plus-mcp",
                note: "Isolated from legacy mcp-for-tailwind (~/.tailwind-mcp) so both can run side-by-side.",
                authentication: {
                  status: authStatus,
                  lastLoginAt: authState.lastLoginAt
                    ? new Date(authState.lastLoginAt).toISOString()
                    : undefined,
                  source: authState.source,
                  action: authAction,
                },
                catalog: {
                  status: catalogStats ? "synced" : "not_synced",
                  totalBlocks: catalogStats?.totalBlocks ?? 0,
                  totalVariants: catalogStats?.totalVariants ?? 0,
                  action: catalogStats
                    ? undefined
                    : "Run: tailwind-plus-mcp sync-catalog --metadata-only",
                },
                products: {
                  templates: products.templates.filter((t) => t.kind === "template").length,
                  kits: products.templates.filter((t) => t.kind === "kit").length,
                  catalystComponents: products.catalyst.length,
                },
                cache: {
                  totalCachedVariants: cacheStats.totalVariants,
                  sizeBytes: cacheStats.totalSize,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "login",
    {
      title: "Login to Tailwind Plus",
      description: `Open a browser for Tailwind Plus authentication. Cookies are saved under ~/.tailwind-plus-mcp (not the legacy mcp-for-tailwind dir).`,
      inputSchema: {},
    },
    async () => {
      const authState = checkAuthState();
      if (authState.isAuthenticated) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                status: "already_authenticated",
                message: "Already logged in to Tailwind Plus.",
                lastLoginAt: authState.lastLoginAt
                  ? new Date(authState.lastLoginAt).toISOString()
                  : undefined,
                source: authState.source,
              }),
            },
          ],
        };
      }

      try {
        await login();
        const newAuthState = checkAuthState();
        if (newAuthState.isAuthenticated) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  status: "success",
                  message: "Successfully logged in to Tailwind Plus!",
                  nextSteps: [
                    "sync-catalog --metadata-only (CLI) to build UI block index",
                    "list_products to see templates / kits / Catalyst",
                    "get_variant to fetch UI block code",
                  ],
                }),
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                status: "failed",
                message: "Login was not completed. Please try again.",
              }),
            },
          ],
          isError: true,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                status: "error",
                message: `Login failed: ${message}`,
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}

const app = new Hono();

app.all("/mcp", async (c) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPTransport();
  await server.connect(transport);
  return transport.handleRequest(c);
});

app.get("/health", (c) => {
  const authState = checkAuthState();
  const stats = cacheManager.getVariantStats();

  return c.json({
    status: "ok",
    server: BRAND.mcpServerName,
    displayName: BRAND.displayName,
    version: PACKAGE_VERSION,
    authenticated: authState.isAuthenticated,
    cache: {
      totalVariants: stats.totalVariants,
      totalSize: stats.totalSize,
    },
  });
});

app.get("/", (c) => {
  return c.json({
    name: BRAND.displayName,
    package: BRAND.packageName,
    version: PACKAGE_VERSION,
    description: BRAND.description,
    endpoints: { mcp: "/mcp", health: "/health" },
    tools: [
      "list_categories",
      "list_blocks",
      "list_variants",
      "get_variant",
      "search",
      "suggest",
      "list_products",
      "list_templates",
      "list_kits",
      "get_template",
      "list_catalyst",
      "get_catalyst_component",
      "get_catalyst_setup",
      "list_catalyst_customizations",
      "list_catalyst_colors",
      "generate_ui_kit",
      "check_status",
      "login",
    ],
  });
});

export { app };
export default app;

export async function startServer(port = 3000) {
  const { serve } = await import("@hono/node-server");

  console.log(`${BRAND.displayName} v${PACKAGE_VERSION}`);
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
    console.log(
      `Catalog: ${catalogStats.totalBlocks} blocks, ${catalogStats.totalVariants} variants`
    );
  } else {
    console.log("Catalog: Not synced - run 'sync-catalog' first");
  }
  console.log("");

  serve({ fetch: app.fetch, port });
}

export async function startStdioServer() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
