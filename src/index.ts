import { startServer, startStdioServer } from "./server.ts";
import {
  login,
  clearCache,
  closeBrowser,
  getBrowser,
  setupPage,
  checkAuthState,
  fetchBlockIndex,
} from "./browser/browser.ts";
import { VariantFetcher } from "./browser/variant-fetcher.ts";
import { CacheManager } from "./cache/cache-manager.ts";
import { CatalogManager } from "./data/catalog-manager.ts";
import { search } from "./data/search.ts";
import {
  listKits,
  listTemplatesOnly,
  productOverview,
  CATALYST_COMPONENTS,
  TEMPLATES,
} from "./data/products.ts";
import {
  getCatalystComponent,
  getCatalystSetupGuide,
  listCatalystCustomizations,
  CATALYST_COMPONENTS as CATALYST_FULL,
} from "./data/catalyst.ts";
import { generateCatalystUiKit } from "./generate/ui-kit.ts";
import { BRAND } from "./brand.ts";
import { TIMING, PACKAGE_VERSION, CONFIG_DIR } from "./config.ts";
import type { Context, CodeFormat, Theme, TailwindVersion, Block } from "./types/index.ts";

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
${BRAND.displayName} v${PACKAGE_VERSION}

USAGE:
  tailwind-plus-mcp                    Start MCP server (stdio transport)
  tailwind-plus-mcp --remote [port]    Start MCP server (HTTP transport, default: 3000)

COMMANDS:
  login                           Interactive login to Tailwind Plus
  status                          Show auth, catalog, products, and cache status

  list-categories                 List UI-block categories
  list-blocks [opts]              List blocks in a category
  list-variants [opts]            List variants for a block
  get-variant [opts]              Get code for a specific variant
  search <query> [opts]           Search blocks, variants, templates, kits

  list-products                   Overview of UI blocks / templates / kits / Catalyst
  list-templates                  List site templates
  list-kits                       List kits (e.g. Oatmeal)
  list-catalyst                   List Catalyst UI kit components
  catalyst-setup                  Full Catalyst getting-started + customizations
  catalyst-component <slug>       Full component API (props, colors, exports)
  generate-ui-kit --out=<dir>     Scaffold custom Catalyst UI kit project

  sync-catalog [opts]             Sync UI-block catalog (and optionally code)
  clear-cache [opts]              Clear cached components

OPTIONS:
  --category=<ctx>                Category: marketing, application-ui, ecommerce
  --subcategory=<sub>             Subcategory filter (e.g., sections, forms)
  --block=<slug>                  Block slug (e.g., testimonials, heroes)
  --variant=<slug>                Variant slug (e.g., simple-centered)
  --format=<fmt>                  Code format: react, vue, html (default: react)
  --version=<ver>                 Tailwind version: v4 (latest), v3.4 (default: v4)
  --theme=<theme>                 Theme: light, dark, system (default: light)
  --expired                       Only clear expired cache entries
  --force                         Force re-sync even if already synced
  --metadata-only                 Only sync metadata, skip code download (fast)
  --verbose                       Show detailed progress and debug info
  --out=<dir>                     Output directory for generate-ui-kit
  --name=<name>                   Project name for generate-ui-kit
  --lang=typescript|javascript    Language for scaffold (default typescript)
  --router=next|remix|inertia|plain  Link integration (default next)
  --brand=<color>                 Brand Tailwind color for @theme (default indigo)

DATA DIR: ${CONFIG_DIR}
  (isolated from legacy mcp-for-tailwind at ~/.tailwind-mcp)

EXAMPLES:
  tailwind-plus-mcp login
  tailwind-plus-mcp list-products
  tailwind-plus-mcp list-templates
  tailwind-plus-mcp list-blocks --category=marketing
  tailwind-plus-mcp get-variant --category=marketing --block=heroes --variant=simple-centered --theme=system
  tailwind-plus-mcp sync-catalog --metadata-only
`);
}

function parseArgs(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const arg of args.slice(1)) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      if (key) result[key] = value || "true";
    } else if (!arg.startsWith("-")) {
      // Positional arg (for search query)
      result._query = arg;
    }
  }
  return result;
}

async function main() {
  const opts = parseArgs();
  const catalogManager = new CatalogManager();
  const cacheManager = new CacheManager();

  switch (command) {
    case "help":
    case "--help":
    case "-h":
      printHelp();
      process.exit(0);
      break;

    case "login":
      await login();
      process.exit(0);
      break;

    case "status": {
      const authState = checkAuthState();
      const enhancedStats = catalogManager.getEnhancedStats();
      const cacheStats = cacheManager.getVariantStats();
      const lastUpdated = catalogManager.getEnhancedLastUpdated();
      const products = productOverview();

      console.log(`\n=== ${BRAND.displayName} v${PACKAGE_VERSION} ===\n`);
      console.log(`Data dir: ${CONFIG_DIR}`);
      console.log("(Isolated from legacy mcp-for-tailwind ~/.tailwind-mcp)\n");

      console.log("Authentication:");
      if (authState.isAuthenticated) {
        console.log("  Status: Authenticated");
        if (authState.lastLoginAt) {
          console.log(`  Last login: ${new Date(authState.lastLoginAt).toLocaleString()}`);
        }
        if (authState.source) console.log(`  Cookie source: ${authState.source}`);
      } else if (authState.cookiesExpired) {
        console.log("  Status: Cookies expired");
        console.log("  Action: Run 'login' to refresh");
      } else {
        console.log("  Status: Not logged in");
        console.log("  Action: Run 'login' first");
      }

      console.log("\nUI Block Catalog:");
      if (enhancedStats) {
        const ageHours = lastUpdated ? Math.round((Date.now() - lastUpdated) / 3600000) : 0;
        console.log("  Status: Available (v3.0)");
        console.log(`  Blocks: ${enhancedStats.totalBlocks}`);
        console.log(`  Variants: ${enhancedStats.totalVariants}`);
        console.log(`  Age: ${ageHours} hours`);
        console.log(`  Needs refresh: ${catalogManager.enhancedNeedsRefresh() ? "Yes" : "No"}`);
      } else {
        console.log("  Status: Not synced");
        console.log("  Action: Run 'sync-catalog --metadata-only' to build");
      }

      console.log("\nProducts (static catalog):");
      for (const s of products.surfaces) {
        const count = "count" in s && s.count != null ? ` (${s.count})` : "";
        console.log(`  - ${s.name}${count}`);
      }

      console.log("\nCache:");
      console.log(`  Cached variants: ${cacheStats.totalVariants}`);
      console.log(`  Size: ${(cacheStats.totalSize / 1024).toFixed(1)} KB`);
      if (Object.keys(cacheStats.byFormat).length > 0) {
        console.log(`  By format: ${JSON.stringify(cacheStats.byFormat)}`);
      }

      console.log("");
      process.exit(0);
      break;
    }

    case "list-products": {
      console.log(JSON.stringify(productOverview(), null, 2));
      process.exit(0);
      break;
    }

    case "list-templates": {
      const includeKits = opts["include-kits"] === "true";
      const items = includeKits ? TEMPLATES : listTemplatesOnly();
      console.log(`\n=== Templates (${items.length}) ===\n`);
      for (const t of items) {
        console.log(`${t.name} (${t.slug}) [${t.kind}]`);
        console.log(`  ${t.tagline}`);
        console.log(`  ${t.url}`);
        console.log("");
      }
      process.exit(0);
      break;
    }

    case "list-kits": {
      const kits = listKits();
      console.log(`\n=== Kits (${kits.length}) ===\n`);
      for (const t of kits) {
        console.log(`${t.name} (${t.slug})`);
        console.log(`  ${t.description.slice(0, 120)}...`);
        console.log(`  ${t.url}`);
        console.log(`  Stack: ${t.stack.join(", ")}`);
        console.log("");
      }
      process.exit(0);
      break;
    }

    case "list-catalyst": {
      console.log(`\n=== Catalyst components (${CATALYST_FULL.length}) ===\n`);
      const byGroup = new Map<string, typeof CATALYST_FULL>();
      for (const c of CATALYST_FULL) {
        const list = byGroup.get(c.group) || [];
        list.push(c);
        byGroup.set(c.group, list);
      }
      for (const [group, comps] of byGroup) {
        console.log(`${group}:`);
        for (const c of comps) {
          const colors = c.colors ? ` [${c.colors.length} colors]` : "";
          console.log(`  - ${c.name} (${c.slug})${colors} → ${c.docsUrl}`);
        }
        console.log("");
      }
      process.exit(0);
      break;
    }

    case "catalyst-setup": {
      console.log(JSON.stringify(getCatalystSetupGuide(), null, 2));
      process.exit(0);
      break;
    }

    case "catalyst-component": {
      const slug = opts._query || args[1] || opts.slug;
      if (!slug) {
        console.error("Usage: catalyst-component <slug>");
        process.exit(1);
      }
      const c = getCatalystComponent(slug);
      if (!c) {
        console.error(`Unknown component '${slug}'. Try: list-catalyst`);
        process.exit(1);
      }
      console.log(JSON.stringify(c, null, 2));
      process.exit(0);
      break;
    }

    case "catalyst-customizations": {
      console.log(JSON.stringify(listCatalystCustomizations(), null, 2));
      process.exit(0);
      break;
    }

    case "generate-ui-kit": {
      const out = opts.out;
      if (!out) {
        console.error("Usage: generate-ui-kit --out=./my-kit [--name=my-kit] [--router=next] [--brand=indigo]");
        process.exit(1);
      }
      const result = generateCatalystUiKit({
        outDir: out,
        name: opts.name,
        lang: (opts.lang as "typescript" | "javascript") || "typescript",
        router: (opts.router as "next" | "remix" | "inertia" | "plain") || "next",
        brandColor: opts.brand || "indigo",
        force: opts.force === "true",
      });
      console.log(`\nScaffolded Catalyst UI kit at ${result.outDir}`);
      console.log(`Files: ${result.filesWritten.length}`);
      console.log("\nNext steps:");
      for (const s of result.nextSteps) console.log(`  - ${s}`);
      process.exit(0);
      break;
    }

    case "list-categories": {
      const categories = catalogManager.getCategoryInfo();

      if (categories.length === 0) {
        console.error("No catalog found. Run 'sync-catalog' first.");
        process.exit(1);
      }

      console.log("\n=== Categories ===\n");
      for (const cat of categories) {
        console.log(`${cat.name} (${cat.slug})`);
        console.log(`  Blocks: ${cat.blockCount}`);
        console.log(`  Subcategories: ${cat.subcategories.join(", ")}`);
        console.log("");
      }
      process.exit(0);
      break;
    }

    case "list-blocks": {
      const category = opts.category as Context | undefined;
      if (!category) {
        console.error("Error: --category is required");
        console.error("Usage: list-blocks --category=marketing");
        process.exit(1);
      }

      const blocks = catalogManager.getBlocks(category, opts.subcategory);

      if (blocks.length === 0) {
        console.error(`No blocks found in ${category}. Run 'sync-catalog' first.`);
        process.exit(1);
      }

      console.log(`\n=== Blocks in ${category} ===\n`);
      for (const block of blocks) {
        console.log(`${block.name} (${block.slug})`);
        console.log(`  Subcategory: ${block.subcategory}`);
        console.log(`  Variants: ${block.variantCount}`);
        if (block.description) {
          console.log(`  Description: ${block.description.slice(0, 60)}...`);
        }
        console.log("");
      }
      process.exit(0);
      break;
    }

    case "list-variants": {
      const category = opts.category as Context | undefined;
      const blockSlug = opts.block;

      if (!category || !blockSlug) {
        console.error("Error: --category and --block are required");
        console.error("Usage: list-variants --category=marketing --block=testimonials");
        process.exit(1);
      }

      const blocks = catalogManager.getBlocks(category);
      const block = blocks.find((b) => b.slug === blockSlug);

      if (!block) {
        console.error(`Block '${blockSlug}' not found in ${category}.`);
        console.error(`Available: ${blocks.slice(0, 5).map((b) => b.slug).join(", ")}...`);
        process.exit(1);
      }

      console.log(`\n=== Variants for ${block.name} ===\n`);
      for (const variant of block.variants) {
        console.log(`[${variant.index}] ${variant.name} (${variant.slug})`);
      }
      console.log("");
      process.exit(0);
      break;
    }

    case "get-variant": {
      const category = opts.category as Context | undefined;
      const blockSlug = opts.block;
      const variantSlug = opts.variant;
      const format = (opts.format || "react") as CodeFormat;
      const version = (opts.version || "v4") as TailwindVersion;
      const theme = (opts.theme || "light") as Theme;

      if (!category || !blockSlug || !variantSlug) {
        console.error("Error: --category, --block, and --variant are required");
        console.error("Usage: get-variant --category=marketing --block=testimonials --variant=simple-centered");
        process.exit(1);
      }

      const authState = checkAuthState();
      if (!authState.isAuthenticated) {
        console.error("Error: Not authenticated. Run 'login' first.");
        process.exit(1);
      }

      // Check cache first
      const cached = await cacheManager.getVariant(category, blockSlug, variantSlug, format, theme, version);
      if (cached) {
        console.log(`\n=== ${cached.variantName} (cached) ===\n`);
        console.log(`Format: ${format}, Version: ${version}, Theme: ${theme}`);
        console.log(`Dependencies: ${cached.dependencies.join(", ") || "none"}`);
        console.log(`\n--- Code ---\n`);
        console.log(cached.code);
        process.exit(0);
      }

      // Find block to get subcategory
      const blocks = catalogManager.getBlocks(category);
      const block = blocks.find((b) => b.slug === blockSlug);

      if (!block) {
        console.error(`Block '${blockSlug}' not found.`);
        process.exit(1);
      }

      const variant = block.variants.find((v) => v.slug === variantSlug);
      if (!variant) {
        console.error(`Variant '${variantSlug}' not found.`);
        console.error(`Available: ${block.variants.map((v) => v.slug).join(", ")}`);
        process.exit(1);
      }

      console.log(`\nFetching ${variant.name}...`);

      try {
        const fetcher = new VariantFetcher(getBrowser, setupPage);
        const code = await fetcher.fetchVariantCode(
          category,
          block.subcategory,
          blockSlug,
          variant.index,
          format,
          version,
          theme
        );

        // Cache it
        await cacheManager.setVariant(code);

        console.log(`\n=== ${code.variantName} ===\n`);
        console.log(`Format: ${format}, Version: ${version}, Theme: ${theme}`);
        console.log(`Dependencies: ${code.dependencies.join(", ") || "none"}`);
        console.log(`\n--- Code ---\n`);
        console.log(code.code);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      } finally {
        await closeBrowser();
      }
      process.exit(0);
      break;
    }

    case "search": {
      const query = opts._query || args[1];
      if (!query) {
        console.error("Error: Search query required");
        console.error("Usage: search \"pricing table\"");
        process.exit(1);
      }

      const results = search(query, catalogManager, {
        category: opts.category as Context | undefined,
        limit: 10,
        includeVariants: true,
      });

      const q = query.toLowerCase();
      const productHits: Array<{ type: string; name: string; slug: string; url: string }> = [];
      for (const t of TEMPLATES) {
        const hay = `${t.name} ${t.tagline} ${t.description} ${t.slug}`.toLowerCase();
        if (hay.includes(q) || q.split(/\s+/).every((w) => hay.includes(w))) {
          productHits.push({ type: t.kind, name: t.name, slug: t.slug, url: t.url });
        }
      }
      for (const c of CATALYST_COMPONENTS) {
        const hay = `${c.name} ${c.slug} ${c.group}`.toLowerCase();
        if (hay.includes(q)) {
          productHits.push({ type: "catalyst", name: c.name, slug: c.slug, url: c.docsUrl });
        }
      }

      if (results.length === 0 && productHits.length === 0) {
        console.log(`No results found for "${query}"`);
        process.exit(0);
      }

      console.log(`\n=== Search Results for "${query}" ===\n`);
      if (productHits.length) {
        console.log("-- Products --");
        for (const p of productHits) {
          console.log(`[${p.type}] ${p.name} (${p.slug})`);
          console.log(`         ${p.url}`);
          console.log("");
        }
      }
      if (results.length) {
        console.log("-- UI Blocks --");
        for (const result of results) {
          if (result.type === "block") {
            console.log(`[block] ${result.blockName} (${result.category}/${result.block})`);
            console.log(`        ${result.variantCount} variants, relevance: ${(result.relevance * 100).toFixed(0)}%`);
          } else {
            console.log(`[variant] ${result.variantName} in ${result.blockName}`);
            console.log(`          ${result.category}/${result.block}/${result.variant}, relevance: ${(result.relevance * 100).toFixed(0)}%`);
          }
          console.log("");
        }
      }
      process.exit(0);
      break;
    }

    case "sync-catalog": {
      const authState = checkAuthState();
      if (!authState.isAuthenticated) {
        console.error("Error: Not authenticated. Run 'login' first.");
        process.exit(1);
      }

      const category = opts.category as Context | undefined;
      const blockSlug = opts.block;
      const forceSync = opts.force === "true";
      const metadataOnly = opts["metadata-only"] === "true";
      const verbose = opts.verbose === "true";
      const formats: CodeFormat[] = metadataOnly ? [] : ["react", "vue", "html"];
      const versions: TailwindVersion[] = metadataOnly ? [] : ["v4", "v3.4"];
      const theme: Theme = "light";

      // Browser recycling config - recycle every N blocks to free memory
      const BROWSER_RECYCLE_INTERVAL = TIMING.browserRecycleInterval;

      console.log("\n=== Syncing Catalog (Optimized) ===\n");
      if (forceSync) {
        console.log("Force mode: re-syncing all blocks\n");
      }
      if (metadataOnly) {
        console.log("Metadata-only mode: skipping code download\n");
      }
      if (verbose) {
        console.log("Verbose mode: showing detailed progress\n");
      }

      // If specific block requested, sync just that block using fetchBlockComplete
      if (blockSlug && category) {
        console.log(`Syncing ${category}/${blockSlug}...`);

        // Get subcategory from existing catalog
        const existingBlocks = catalogManager.getBlocks(category);
        const existingBlock = existingBlocks.find((b) => b.slug === blockSlug);

        if (!existingBlock) {
          console.error(`Block '${blockSlug}' not found. Run full sync first.`);
          process.exit(1);
        }

        const variantFetcher = new VariantFetcher(getBrowser, setupPage);
        const { block, codes } = await variantFetcher.fetchBlockComplete(
          category,
          existingBlock.subcategory,
          blockSlug,
          formats,
          versions,
          theme,
          (variant, format, version) => {
            process.stdout.write(`\r  ${variant} (${format}, ${version})...`);
          }
        );

        catalogManager.setBlock(block);
        for (const code of codes) {
          await cacheManager.setVariant(code);
        }

        console.log(`\r  ${block.variantCount} variants, ${codes.length} code files                    `);
      } else {
        // Phase 1: Get ALL block URLs from master index (1 page load)
        console.log("Phase 1: Loading block index from https://tailwindcss.com/plus/ui-blocks...");
        const allBlocks = await fetchBlockIndex();
        console.log(`Found ${allBlocks.length} blocks across all categories\n`);

        // Filter by category if specified
        const blocksToSync = category
          ? allBlocks.filter((b) => b.category === category)
          : allBlocks;

        console.log(`Phase 2: Syncing ${blocksToSync.length} blocks${category ? ` (${category})` : ""}...\n`);

        const variantFetcher = new VariantFetcher(getBrowser, setupPage);
        let totalBlocks = 0;
        let totalVariants = 0;
        let totalCodes = 0;
        let skippedBlocks = 0;
        let processedSinceRecycle = 0;

        for (let i = 0; i < blocksToSync.length; i++) {
          const entry = blocksToSync[i]!;

          // Browser recycling - close and recreate browser to free memory
          if (processedSinceRecycle >= BROWSER_RECYCLE_INTERVAL) {
            console.log(`\n  [Memory cleanup] Recycling browser after ${processedSinceRecycle} blocks...`);
            await closeBrowser();
            await new Promise((r) => setTimeout(r, TIMING.browserRecyclePauseMs));
            processedSinceRecycle = 0;
            if (verbose) {
              console.log(`  [Memory cleanup] Browser recycled, continuing...\n`);
            }
          }

          // Check if block already complete (has variants and all codes cached)
          if (!forceSync) {
            const existingBlock = catalogManager.getBlock(entry.category, entry.subcategory, entry.slug);
            if (existingBlock && existingBlock.variants && existingBlock.variants.length > 0) {
              // Check if all code is cached
              let allCodeCached = true;
              if (!metadataOnly) {
                for (const v of existingBlock.variants) {
                  for (const format of ["react", "vue", "html"] as CodeFormat[]) {
                    for (const version of ["v4", "v3.4"] as TailwindVersion[]) {
                      if (!cacheManager.hasVariant(entry.category, entry.slug, v.slug, format, theme, version)) {
                        allCodeCached = false;
                        break;
                      }
                    }
                    if (!allCodeCached) break;
                  }
                  if (!allCodeCached) break;
                }
              }

              if (allCodeCached || metadataOnly) {
                console.log(`  ${entry.slug}: skipped (complete)`);
                skippedBlocks++;
                totalVariants += existingBlock.variants.length;
                continue;
              }
            }
          }

          // ONE page load gets metadata + all code
          const blockStartTime = Date.now();
          if (verbose) {
            console.log(`  [${i + 1}/${blocksToSync.length}] Starting ${entry.category}/${entry.subcategory}/${entry.slug}...`);
          }

          try {
            const { block, codes } = await variantFetcher.fetchBlockComplete(
              entry.category,
              entry.subcategory,
              entry.slug,
              formats,
              versions,
              theme,
              verbose
                ? (variant, format, version) => {
                    console.log(`    → Fetching: ${variant} (${format}, ${version})`);
                  }
                : (variant, format, version) => {
                    process.stdout.write(`\r    ${variant} (${format}, ${version})...`);
                  }
            );

            // Save block and codes
            catalogManager.setBlock(block);
            for (const code of codes) {
              await cacheManager.setVariant(code);
            }

            totalBlocks++;
            totalVariants += block.variantCount;
            totalCodes += codes.length;
            processedSinceRecycle++;

            const elapsed = ((Date.now() - blockStartTime) / 1000).toFixed(1);
            if (verbose) {
              console.log(`  [${i + 1}/${blocksToSync.length}] ✓ ${entry.slug}: ${block.variantCount} variants, ${codes.length} code files (${elapsed}s)`);
            } else {
              console.log(`\r  ${entry.slug}: ${block.variantCount} variants, ${codes.length} code files                    `);
            }

            // Warn if we got 0 variants (possible rate limiting)
            if (block.variantCount === 0) {
              console.warn(`  ⚠️  WARNING: 0 variants found - possible rate limiting or page structure change`);
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : "";

            console.error(`  ${entry.slug}: Error - ${msg}`);
            if (verbose && stack) {
              console.error(`    Stack: ${stack.split("\n").slice(0, 3).join("\n    ")}`);
            }

            if (msg.includes("AUTH_REQUIRED")) {
              console.error("\nAuthentication expired. Run 'login' to refresh.");
              break;
            }

            // Still count as processed for recycling purposes
            processedSinceRecycle++;
          }
        }

        console.log(`\n=== Done ===`);
        console.log(`Synced: ${totalBlocks} blocks, ${totalVariants} variants, ${totalCodes} code files`);
        console.log(`Skipped: ${skippedBlocks} blocks (already complete)`);
      }

      await closeBrowser();
      process.exit(0);
      break;
    }

    case "clear-cache": {
      const expiredOnly = opts.expired === "true";

      if (expiredOnly) {
        const pruned = await cacheManager.pruneExpired();
        console.log(`Cleared ${pruned} expired cache entries`);
      } else {
        clearCache();
      }

      process.exit(0);
      break;
    }

    case "--remote":
    case undefined:
    default: {
      // Check for --remote flag or --remote as command
      const remote = opts.remote === "true" || command === "--remote";

      if (remote) {
        // HTTP streaming mode (for remote access/development)
        const portArg = args.find((a) => !a.startsWith("-") && a !== "serve");
        const port = parseInt(portArg || opts.port || process.env.PORT || "3000", 10);
        await startServer(port);

        process.on("SIGINT", async () => {
          console.log("\nShutting down...");
          await closeBrowser();
          process.exit(0);
        });

        process.on("SIGTERM", async () => {
          console.log("\nShutting down...");
          await closeBrowser();
          process.exit(0);
        });
      } else {
        // stdio mode (default for MCP clients like Claude Desktop)
        await startStdioServer();
      }
      break;
    }
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
