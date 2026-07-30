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
import { agentEnvelope, defaultPaths, jsonResult } from "./agent-response.ts";

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
        return jsonResult(
          agentEnvelope({
            summary: "Cannot fetch UI block code: not authenticated with Tailwind Plus.",
            errors: ["AUTH_REQUIRED"],
            nextSteps: [
              {
                action: "Open browser login for Tailwind Plus",
                tool: "login",
                detail: "User must complete login in the browser; cookies save to ~/.tailwind-plus-mcp/cookies.json",
              },
              {
                action: "Retry get_variant with the same arguments",
                tool: "get_variant",
              },
            ],
            data: {
              cookiesExist: authState.cookiesExist,
              cookiesExpired: authState.cookiesExpired,
            },
          }),
          true
        );
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
        return jsonResult(
          agentEnvelope({
            summary: `Returned cached ${cached.format} code for ${category}/${blockSlug}/${variantSlug} (theme=${cached.theme}, version=${cached.resolvedVersion || cached.version}).`,
            data: {
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
            paths: {
              ...defaultPaths(),
              thisCacheFile: `~/.tailwind-plus-mcp/cache/${category}--${blockSlug}--${variantSlug}--${format}--${theme}--${version}.json`,
            },
            nextSteps: [
              {
                action: "Paste or adapt the code into the user project",
                detail: "Install listed dependencies if missing (e.g. @headlessui/react, @heroicons/react).",
              },
              ...(cached.notes?.length
                ? [{ action: "Honor notes", detail: cached.notes.join(" | ") }]
                : []),
            ],
          })
        );
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

        return jsonResult(
          agentEnvelope({
            summary: `Fetched fresh ${code.format} code for ${category}/${blockSlug}/${variantSlug} from Tailwind Plus (theme=${code.theme}, resolvedVersion=${code.resolvedVersion || code.version}). Cached for 7 days.`,
            data: {
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
            paths: {
              ...defaultPaths(),
              thisCacheFile: `~/.tailwind-plus-mcp/cache/${category}--${blockSlug}--${variantSlug}--${format}--${theme}--${version}.json`,
            },
            nextSteps: [
              {
                action: "Write the code into the appropriate project file",
                detail: "Match the requested format (react/vue/html). Install dependencies listed in data.dependencies.",
              },
              ...(code.notes?.length
                ? [{ action: "Read data.notes", detail: code.notes.join(" | ") }]
                : []),
            ],
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return jsonResult(
          agentEnvelope({
            summary: `Failed to fetch variant code: ${message}`,
            errors: [message],
            nextSteps: [
              { action: "Call check_status", tool: "check_status" },
              { action: "If auth expired, call login", tool: "login" },
              {
                action: "Confirm block/variant slugs",
                tool: "list_variants",
                detail: `category=${category} block=${blockSlug}`,
              },
            ],
          }),
          true
        );
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
      const guide = getCatalystSetupGuide();
      return jsonResult(
        agentEnvelope({
          summary:
            "Catalyst Getting Started guide loaded (public docs). Source still requires licensed zip download.",
          data: guide,
          paths: {
            ...defaultPaths(),
            docs: "https://catalyst.tailwindui.com/docs",
            download: "https://tailwindcss.com/plus/templates/catalyst/download",
            product: "https://tailwindcss.com/plus/ui-kit",
            demo: "https://catalyst-demo.tailwindui.com",
          },
          nextSteps: [
            {
              action: "If scaffolding a project, call generate_ui_kit with outDir",
              tool: "generate_ui_kit",
            },
            {
              action: "Inspect a component API",
              tool: "get_catalyst_component",
              detail: "e.g. slug=button or slug=select",
            },
            {
              action: "List color systems before choosing brand colors",
              tool: "list_catalyst_colors",
            },
          ],
        })
      );
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
      return jsonResult(
        agentEnvelope({
          summary: "Full Catalyst customization inventory from official docs.",
          data: listCatalystCustomizations(),
          nextSteps: [
            {
              action: "Scaffold a project with these options applied",
              tool: "generate_ui_kit",
              detail: "router, brandColor, lang map to setup steps",
            },
            { action: "Deep-dive one component", tool: "get_catalyst_component" },
          ],
        })
      );
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
        return jsonResult(
          agentEnvelope({
            summary: `Scaffolded a Catalyst-based UI kit project at ${result.outDir} (${result.filesWritten.length} files). Component STUBs are placeholders until the licensed zip is copied in.`,
            data: {
              status: "ok",
              outDir: result.outDir,
              filesWrittenCount: result.filesWritten.length,
              files: result.filesWritten,
              customizationsCovered: Object.keys(result.customizations),
            },
            paths: {
              ...defaultPaths(),
              projectRoot: result.outDir,
              setupDoc: `${result.outDir}/CATALYST_SETUP.md`,
              readme: `${result.outDir}/README.md`,
              manifest: `${result.outDir}/catalyst-manifest.json`,
              packageJson: `${result.outDir}/package.json`,
              themeCss: `${result.outDir}/src/styles/theme.css`,
              colorMap: `${result.outDir}/src/theme/catalyst-theme.ts`,
              componentsDir: `${result.outDir}/src/components/`,
              linkComponent: `${result.outDir}/src/components/link.tsx`,
              componentBarrel: `${result.outDir}/src/components/index.ts`,
              recipes: `${result.outDir}/src/recipes/`,
              catalystDownload: "https://tailwindcss.com/plus/templates/catalyst/download",
              catalystDocs: "https://catalyst.tailwindui.com/docs",
            },
            nextSteps: [
              {
                action: "Tell the user the scaffold path and that Catalyst zip source is NOT included",
                detail: result.outDir,
              },
              {
                action: "Install npm dependencies in the scaffold",
                detail: `cd ${result.outDir} && npm install`,
              },
              {
                action: "User downloads catalyst-ui-kit.zip (licensed)",
                detail: "https://tailwindcss.com/plus/templates/catalyst/download",
              },
              {
                action: "Copy typescript/javascript components from the zip into src/components/, replacing STUB files",
                detail: "Keep the generated link.tsx unless the zip provides a better starting Link.",
              },
              {
                action: "Import theme CSS in the app entry",
                detail: "import './src/styles/theme.css' (or equivalent)",
              },
              {
                action: "Use documented color props from catalyst-theme, not ad-hoc color classes",
                tool: "list_catalyst_colors",
              },
              {
                action: "Read CATALYST_SETUP.md in the project for the full checklist",
                detail: `${result.outDir}/CATALYST_SETUP.md`,
              },
            ],
            warnings: [
              "Do not commit or redistribute Catalyst zip contents.",
              "STUB components throw until replaced with licensed files.",
            ],
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult(
          agentEnvelope({
            summary: `UI kit scaffold failed: ${message}`,
            errors: [message],
            nextSteps: [
              { action: "Verify outDir is writable", detail: outDir },
              { action: "Retry generate_ui_kit with force=true if overwriting", tool: "generate_ui_kit" },
            ],
          }),
          true
        );
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

      const nextSteps: { action: string; tool?: string; detail?: string }[] = [];
      if (authStatus !== "authenticated") {
        nextSteps.push({ action: "Authenticate", tool: "login", detail: authAction });
      }
      if (!catalogStats) {
        nextSteps.push({
          action: "Sync UI block catalog (CLI)",
          detail: "tailwind-plus-mcp sync-catalog --metadata-only",
        });
      }
      if (authStatus === "authenticated" && catalogStats) {
        nextSteps.push(
          { action: "Browse product surfaces", tool: "list_products" },
          { action: "Fetch UI block code", tool: "get_variant", detail: "list_blocks → list_variants → get_variant" },
          { action: "Catalyst UI kit", tool: "get_catalyst_setup" },
          { action: "Scaffold custom kit", tool: "generate_ui_kit", detail: "Requires outDir" }
        );
      }

      const summaryParts = [
        `${BRAND.displayName} v${PACKAGE_VERSION}`,
        `auth=${authStatus}`,
        catalogStats
          ? `catalog=${catalogStats.totalBlocks} blocks / ${catalogStats.totalVariants} variants`
          : "catalog=not_synced",
        `cache=${cacheStats.totalVariants} variants`,
      ];

      return jsonResult(
        agentEnvelope({
          summary: summaryParts.join(" · "),
          data: {
            server: BRAND.displayName,
            package: BRAND.packageName,
            version: PACKAGE_VERSION,
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
            workflow: {
              uiBlocks: "list_categories → list_blocks → list_variants → get_variant",
              templates: "list_templates → get_template → user downloads zip from account",
              kits: "list_kits → get_template(oatmeal) → user downloads zip",
              catalyst:
                "get_catalyst_setup → list_catalyst / get_catalyst_component → generate_ui_kit → user copies zip into src/components",
            },
          },
          nextSteps,
          warnings:
            authStatus !== "authenticated"
              ? ["get_variant will fail until login succeeds"]
              : !catalogStats
                ? ["UI block listing needs sync-catalog first"]
                : [],
        })
      );
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
        return jsonResult(
          agentEnvelope({
            summary: "Already authenticated with Tailwind Plus; no login needed.",
            data: {
              status: "already_authenticated",
              lastLoginAt: authState.lastLoginAt
                ? new Date(authState.lastLoginAt).toISOString()
                : undefined,
              source: authState.source,
            },
            nextSteps: [
              { action: "Fetch UI block code", tool: "get_variant" },
              { action: "Browse products", tool: "list_products" },
            ],
          })
        );
      }

      try {
        await login();
        const newAuthState = checkAuthState();
        if (newAuthState.isAuthenticated) {
          return jsonResult(
            agentEnvelope({
              summary: "Login succeeded. Cookies saved for this unofficial MCP only.",
              data: { status: "success" },
              paths: {
                ...defaultPaths(),
                cookiesJustWritten: "~/.tailwind-plus-mcp/cookies.json",
              },
              nextSteps: [
                {
                  action: "If catalog empty, sync UI blocks (CLI)",
                  detail: "tailwind-plus-mcp sync-catalog --metadata-only",
                },
                { action: "List product surfaces", tool: "list_products" },
                {
                  action: "Fetch a component",
                  tool: "get_variant",
                  detail: "list_categories → list_blocks → list_variants first if slugs unknown",
                },
              ],
            })
          );
        }
        return jsonResult(
          agentEnvelope({
            summary: "Login did not complete (browser closed or timed out).",
            errors: ["LOGIN_INCOMPLETE"],
            nextSteps: [{ action: "Retry login with the user present at the machine", tool: "login" }],
          }),
          true
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return jsonResult(
          agentEnvelope({
            summary: `Login failed: ${message}`,
            errors: [message],
            nextSteps: [
              { action: "Ensure Chrome/Chromium is available" },
              { action: "Retry login", tool: "login" },
            ],
          }),
          true
        );
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
