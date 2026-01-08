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
import { TIMING } from "./config.ts";
import type { Context, CodeFormat, Theme, TailwindVersion, Block } from "./types/index.ts";

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
mcp-for-tailwind v0.1.0 - MCP Server for Tailwind Plus

USAGE:
  mcp-for-tailwind                    Start MCP server (stdio transport)
  mcp-for-tailwind --remote [port]    Start MCP server (HTTP transport, default: 3000)

COMMANDS:
  login                           Interactive login to Tailwind Plus
  status                          Show auth, catalog, and cache status

  list-categories                 List all top-level categories
  list-blocks [opts]              List blocks in a category
  list-variants [opts]            List variants for a block
  get-variant [opts]              Get code for a specific variant
  search <query> [opts]           Search across blocks and variants

  sync-catalog [opts]             Sync catalog and fetch all component code
  clear-cache [opts]              Clear cached components

OPTIONS:
  --category=<ctx>                Category: marketing, application-ui, ecommerce
  --subcategory=<sub>             Subcategory filter (e.g., sections, forms)
  --block=<slug>                  Block slug (e.g., testimonials, heroes)
  --variant=<slug>                Variant slug (e.g., simple-centered)
  --format=<fmt>                  Code format: react, vue, html (default: react)
  --version=<ver>                 Tailwind version: v4.1, v3.4 (default: v4.1)
  --theme=<theme>                 Theme: light, dark (default: light)
  --expired                       Only clear expired cache entries
  --force                         Force re-sync even if already synced
  --metadata-only                 Only sync metadata, skip code download (fast)
  --verbose                       Show detailed progress and debug info

EXAMPLES:
  mcp-for-tailwind login
  mcp-for-tailwind list-categories
  mcp-for-tailwind list-blocks --category=marketing
  mcp-for-tailwind list-variants --category=marketing --block=testimonials
  mcp-for-tailwind get-variant --category=marketing --block=testimonials --variant=simple-centered
  mcp-for-tailwind search "pricing table"
  mcp-for-tailwind sync-catalog
  mcp-for-tailwind sync-catalog --category=marketing --metadata-only
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

      console.log("\n=== Tailwind Plus MCP Status ===\n");

      console.log("Authentication:");
      if (authState.isAuthenticated) {
        console.log("  Status: Authenticated");
        if (authState.lastLoginAt) {
          console.log(`  Last login: ${new Date(authState.lastLoginAt).toLocaleString()}`);
        }
      } else if (authState.cookiesExpired) {
        console.log("  Status: Cookies expired");
        console.log("  Action: Run 'login' to refresh");
      } else {
        console.log("  Status: Not logged in");
        console.log("  Action: Run 'login' first");
      }

      console.log("\nCatalog:");
      if (enhancedStats) {
        const ageHours = lastUpdated ? Math.round((Date.now() - lastUpdated) / 3600000) : 0;
        console.log("  Status: Available (v3.0)");
        console.log(`  Blocks: ${enhancedStats.totalBlocks}`);
        console.log(`  Variants: ${enhancedStats.totalVariants}`);
        console.log(`  Age: ${ageHours} hours`);
        console.log(`  Needs refresh: ${catalogManager.enhancedNeedsRefresh() ? "Yes" : "No"}`);
      } else {
        console.log("  Status: Not synced");
        console.log("  Action: Run 'sync-catalog' to build");
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
      const version = (opts.version || "v4.1") as TailwindVersion;
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

      if (results.length === 0) {
        console.log(`No results found for "${query}"`);
        process.exit(0);
      }

      console.log(`\n=== Search Results for "${query}" ===\n`);
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
      const versions: TailwindVersion[] = metadataOnly ? [] : ["v4.1", "v3.4"];
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
                    for (const version of ["v4.1", "v3.4"] as TailwindVersion[]) {
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
