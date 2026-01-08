/**
 * Variant-level fetcher for Tailwind Plus components.
 * Handles fetching individual component variants with format/version/theme selection.
 */
import type { Browser, Page } from "puppeteer";
import type {
  Block,
  ComponentVariant,
  VariantCode,
  Context,
  CodeFormat,
  Theme,
  TailwindVersion,
} from "../types/index.ts";
import { UI_BLOCKS_URL, RATE_LIMIT, RETRY_CONFIG, TIMEOUTS, TIMING, getRandomUserAgent } from "../config.ts";
import { RateLimiter } from "../utils/rate-limiter.ts";
import { withRetry } from "../utils/retry.ts";
import { toKebabCase } from "../utils/slug.ts";
import { parseDependencies } from "./shared.ts";
import {
  AuthRequiredError,
  VariantIndexOutOfRangeError,
  CodeFetchError,
} from "../errors/index.ts";

export class VariantFetcher {
  private rateLimiter: RateLimiter;

  constructor(
    private getBrowser: () => Promise<Browser>,
    private setupPage: (page: Page) => Promise<boolean>
  ) {
    this.rateLimiter = new RateLimiter(RATE_LIMIT.delayBetweenRequests);
  }

  /**
   * Fetch all variants from a block page (metadata only).
   * Returns variant names, slugs, and component IDs.
   */
  async fetchBlockVariants(
    category: Context,
    subcategory: string,
    blockSlug: string
  ): Promise<{ block: Partial<Block>; variants: ComponentVariant[] }> {
    await this.rateLimiter.acquire();

    return withRetry(
      async () => {
        const browser = await this.getBrowser();
        const page = await browser.newPage();

        try {
          await page.setUserAgent(getRandomUserAgent());
          await page.setViewport({ width: 1920, height: 1080 });

          const hasCookies = await this.setupPage(page);
          if (!hasCookies) {
            throw new AuthRequiredError();
          }

          const url = `${UI_BLOCKS_URL}/${category}/${subcategory}/${blockSlug}`;
          console.log(`Fetching variants from: ${url}`);

          await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: TIMEOUTS.navigation,
          });

          if (page.url().includes("/login")) {
            throw new AuthRequiredError();
          }

          // Wait for page to load
          await page.waitForSelector("h1", { timeout: TIMEOUTS.selector });

          // Fetch block info and variants
          const result = await page.evaluate(() => {
            // Get block name and description
            const h1 = document.querySelector("h1");
            const blockName = h1?.textContent?.trim() || "";

            // Description is typically in a paragraph after h1
            const description =
              document.querySelector("h1 + p")?.textContent?.trim() || "";

            // Find all variant headings with component anchors
            const variants: Array<{
              index: number;
              name: string;
              componentId: string;
            }> = [];

            const headings = document.querySelectorAll("h2");
            headings.forEach((h2, index) => {
              const link = h2.querySelector('a[href*="#component-"]');
              if (link) {
                const href = link.getAttribute("href") || "";
                const componentId = href.replace("#", "");
                const name = h2.textContent?.trim() || `Variant ${index}`;

                variants.push({
                  index,
                  name,
                  componentId,
                });
              }
            });

            return { blockName, description, variants };
          });

          // Convert to ComponentVariant with slugs
          const variants: ComponentVariant[] = result.variants.map((v) => ({
            index: v.index,
            name: v.name,
            slug: toKebabCase(v.name),
            componentId: v.componentId,
          }));

          const block: Partial<Block> = {
            name: result.blockName,
            slug: blockSlug,
            category,
            subcategory,
            url: `${UI_BLOCKS_URL}/${category}/${subcategory}/${blockSlug}`,
            description: result.description,
            variantCount: variants.length,
          };

          return { block, variants };
        } finally {
          await page.close();
        }
      },
      {
        ...RETRY_CONFIG,
        onRetry: (attempt, error) => {
          console.log(
            `Retry ${attempt}/${RETRY_CONFIG.maxAttempts} for ${blockSlug}: ${error.message}`
          );
        },
      }
    );
  }

  /**
   * Fetch code for a specific variant.
   */
  async fetchVariantCode(
    category: Context,
    subcategory: string,
    blockSlug: string,
    variantIndex: number,
    format: CodeFormat = "react",
    version: TailwindVersion = "v4.1",
    theme: Theme = "light"
  ): Promise<VariantCode> {
    await this.rateLimiter.acquire();

    return withRetry(
      async () => {
        const browser = await this.getBrowser();
        const page = await browser.newPage();

        try {
          await page.setUserAgent(getRandomUserAgent());
          await page.setViewport({ width: 1920, height: 1080 });

          const hasCookies = await this.setupPage(page);
          if (!hasCookies) {
            throw new AuthRequiredError();
          }

          const url = `${UI_BLOCKS_URL}/${category}/${subcategory}/${blockSlug}`;
          console.log(
            `Fetching variant code: ${blockSlug}[${variantIndex}] (${format}, ${version}, ${theme})`
          );

          await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: TIMEOUTS.navigation,
          });

          if (page.url().includes("/login")) {
            throw new AuthRequiredError();
          }

          // Wait for components to load
          await page.waitForSelector('[role="tabpanel"]', {
            timeout: TIMEOUTS.selector,
          });

          // Get variant info
          const variantInfo = await page.evaluate((targetIndex) => {
            const headings = document.querySelectorAll("h2");
            let variantCount = 0;
            let variantName = "";
            let componentId = "";

            for (const h2 of headings) {
              const link = h2.querySelector('a[href*="#component-"]');
              if (link) {
                if (variantCount === targetIndex) {
                  variantName = h2.textContent?.trim() || "";
                  componentId = (link.getAttribute("href") || "").replace("#", "");
                  break;
                }
                variantCount++;
              }
            }

            return { variantName, componentId, totalVariants: variantCount + 1 };
          }, variantIndex);

          if (!variantInfo.variantName) {
            throw new VariantIndexOutOfRangeError(variantIndex, variantInfo.totalVariants);
          }

          // Click on the variant's Code tab
          const codeTabs = await page.$$('[role="tab"]');
          let codeTabCount = 0;

          for (const tab of codeTabs) {
            const text = await tab.evaluate((el) => el.textContent);
            if (text === "Code") {
              if (codeTabCount === variantIndex) {
                await tab.click();
                break;
              }
              codeTabCount++;
            }
          }

          // Wait for code panel to appear
          await page
            .waitForSelector("code", { timeout: 5000 })
            .catch(() => {});

          // Select format
          const formatMap: Record<CodeFormat, string> = {
            react: "React",
            vue: "Vue",
            html: "HTML",
          };

          // Find format selector for this variant
          const formatSelectors = await page.$$("select");
          if (formatSelectors.length > variantIndex) {
            const formatSelect = formatSelectors[variantIndex];
            if (formatSelect) {
              await formatSelect.select(formatMap[format]);
            }
          } else if (formatSelectors.length > 0) {
            // Global format selector
            await formatSelectors[0]!.select(formatMap[format]);
          }

          // Wait for format change to apply
          await new Promise((r) => setTimeout(r, TIMING.formatChangeDelayMs));

          // Select version (appears after Code tab is clicked)
          const versionSelectors = await page.$$("select");
          for (const select of versionSelectors) {
            const options = await select.$$eval("option", (opts) =>
              opts.map((o) => o.textContent?.trim())
            );
            if (options.includes("v4.1") || options.includes("v3.4")) {
              await select.select(version);
              break;
            }
          }

          // Wait for version change
          await new Promise((r) => setTimeout(r, TIMING.versionChangeDelayMs));

          // Select theme if dark
          if (theme === "dark") {
            const darkRadio = await page.$(
              'input[type="radio"][value="dark"], [aria-label*="Dark"]'
            );
            if (darkRadio) {
              await darkRadio.click();
              await new Promise((r) => setTimeout(r, TIMING.versionChangeDelayMs));
            }
          }

          // Fetch the code
          const code = await page.evaluate((targetVariantIndex) => {
            // Find all code elements
            const codeElements = document.querySelectorAll("code");

            // Try to find code in tabpanels first
            const tabPanels = document.querySelectorAll('[role="tabpanel"]');
            let codeTabCount = 0;

            for (const panel of tabPanels) {
              const tabName = panel.getAttribute("aria-label");
              if (tabName === "Code") {
                if (codeTabCount === targetVariantIndex) {
                  const codeEl = panel.querySelector("code");
                  if (codeEl?.textContent) {
                    return codeEl.textContent;
                  }
                }
                codeTabCount++;
              }
            }

            // Fallback: find visible code element
            for (const el of codeElements) {
              const text = el.textContent || "";
              // Look for code with imports or HTML structure
              if (
                text.includes("import") ||
                text.includes("export") ||
                text.includes("<template>") ||
                text.includes("<section") ||
                text.includes("<div")
              ) {
                // Check if element is visible
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  return text;
                }
              }
            }

            return null;
          }, variantIndex);

          if (!code) {
            throw new CodeFetchError(variantIndex);
          }

          const variantCode: VariantCode = {
            category,
            blockSlug,
            variantSlug: toKebabCase(variantInfo.variantName),
            variantName: variantInfo.variantName,
            componentId: variantInfo.componentId,
            format,
            version,
            theme,
            code,
            dependencies: parseDependencies(code),
            cachedAt: Date.now(),
          };

          return variantCode;
        } finally {
          await page.close();
        }
      },
      {
        ...RETRY_CONFIG,
        onRetry: (attempt, error) => {
          console.log(
            `Retry ${attempt}/${RETRY_CONFIG.maxAttempts} for ${blockSlug}[${variantIndex}]: ${error.message}`
          );
        },
      }
    );
  }

  /**
   * Fetch all variants for a block with all formats.
   * Used for prefetching.
   */
  async fetchAllVariantCodes(
    category: Context,
    subcategory: string,
    blockSlug: string,
    formats: CodeFormat[] = ["react", "vue", "html"],
    versions: TailwindVersion[] = ["v4.1", "v3.4"],
    theme: Theme = "light",
    onProgress?: (current: number, total: number, variant: string) => void
  ): Promise<VariantCode[]> {
    // First, get variant metadata
    const { variants } = await this.fetchBlockVariants(
      category,
      subcategory,
      blockSlug
    );

    const results: VariantCode[] = [];
    const total = variants.length * formats.length * versions.length;
    let current = 0;

    for (const variant of variants) {
      for (const format of formats) {
        for (const version of versions) {
          current++;
          onProgress?.(current, total, `${variant.name} (${format}, ${version})`);

          try {
            const code = await this.fetchVariantCode(
              category,
              subcategory,
              blockSlug,
              variant.index,
              format,
              version,
              theme
            );
            results.push(code);
            console.log(`  ✓ ${variant.name} (${format}, ${version})`);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`  ✗ ${variant.name} (${format}, ${version}): ${message}`);

            if (error instanceof AuthRequiredError) {
              throw error;
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Fetch all code for a block in a SINGLE page session.
   * Much more efficient - loads page once, fetches all formats/versions.
   */
  async fetchBlockCodeEfficient(
    category: Context,
    subcategory: string,
    blockSlug: string,
    variants: ComponentVariant[],
    formats: CodeFormat[] = ["react", "vue", "html"],
    versions: TailwindVersion[] = ["v4.1", "v3.4"],
    theme: Theme = "light",
    onProgress?: (variant: string, format: CodeFormat, version: TailwindVersion) => void
  ): Promise<VariantCode[]> {
    if (variants.length === 0) {
      return [];
    }

    await this.rateLimiter.acquire();

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    const results: VariantCode[] = [];

    try {
      await page.setUserAgent(getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });

      const hasCookies = await this.setupPage(page);
      if (!hasCookies) {
        throw new AuthRequiredError();
      }

      const url = `${UI_BLOCKS_URL}/${category}/${subcategory}/${blockSlug}`;
      console.log(`Loading page: ${url}`);

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: TIMEOUTS.navigation,
      });

      if (page.url().includes("/login")) {
        throw new AuthRequiredError();
      }

      // Wait for components to load
      await page.waitForSelector('[role="tabpanel"]', {
        timeout: TIMEOUTS.selector,
      });

      const formatMap: Record<CodeFormat, string> = {
        react: "React",
        vue: "Vue",
        html: "HTML",
      };

      // Process each variant
      for (const variant of variants) {
        // Click on this variant's Code tab
        const codeTabs = await page.$$('[role="tab"]');
        let codeTabCount = 0;
        let clickedTab = false;

        for (const tab of codeTabs) {
          const text = await tab.evaluate((el) => el.textContent);
          if (text === "Code") {
            if (codeTabCount === variant.index) {
              await tab.click();
              clickedTab = true;
              break;
            }
            codeTabCount++;
          }
        }

        if (!clickedTab) {
          console.warn(`  Could not find Code tab for variant ${variant.index}`);
          continue;
        }

        // Wait for code to appear
        await page.waitForSelector("code", { timeout: 5000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, TIMING.versionChangeDelayMs));

        // Loop through formats and versions
        for (const format of formats) {
          // Select format
          const formatSelectors = await page.$$("select");
          let formatSelected = false;

          for (const select of formatSelectors) {
            const options = await select.$$eval("option", (opts) =>
              opts.map((o) => o.textContent?.trim())
            );
            if (options.includes("React") || options.includes("Vue") || options.includes("HTML")) {
              try {
                await select.select(formatMap[format]);
                formatSelected = true;
                break;
              } catch {
                // Selector might be stale
              }
            }
          }

          if (!formatSelected) {
            console.warn(`  Could not select format ${format} for ${variant.name}`);
          }

          await new Promise((r) => setTimeout(r, TIMING.uiInteractionDelayMs));

          for (const version of versions) {
            onProgress?.(variant.name, format, version);

            // Select version
            const versionSelectors = await page.$$("select");
            for (const select of versionSelectors) {
              const options = await select.$$eval("option", (opts) =>
                opts.map((o) => o.textContent?.trim())
              );
              if (options.includes("v4.1") || options.includes("v3.4")) {
                try {
                  await select.select(version);
                } catch {
                  // Selector might be stale
                }
                break;
              }
            }

            await new Promise((r) => setTimeout(r, TIMING.uiInteractionDelayMs));

            // Fetch code
            const code = await page.evaluate((targetVariantIndex) => {
              // Find all code elements
              const codeElements = document.querySelectorAll("code");

              // Try to find code in tabpanels first
              const tabPanels = document.querySelectorAll('[role="tabpanel"]');
              let codeTabCount = 0;

              for (const panel of tabPanels) {
                const tabName = panel.getAttribute("aria-label");
                if (tabName === "Code") {
                  if (codeTabCount === targetVariantIndex) {
                    const codeEl = panel.querySelector("code");
                    if (codeEl?.textContent) {
                      return codeEl.textContent;
                    }
                  }
                  codeTabCount++;
                }
              }

              // Fallback: find visible code element
              for (const el of codeElements) {
                const text = el.textContent || "";
                if (
                  text.includes("import") ||
                  text.includes("export") ||
                  text.includes("<template>") ||
                  text.includes("<section") ||
                  text.includes("<div")
                ) {
                  const rect = el.getBoundingClientRect();
                  if (rect.width > 0 && rect.height > 0) {
                    return text;
                  }
                }
              }

              return null;
            }, variant.index);

            if (code) {
              results.push({
                category,
                blockSlug,
                variantSlug: variant.slug,
                variantName: variant.name,
                componentId: variant.componentId,
                format,
                version,
                theme,
                code,
                dependencies: parseDependencies(code),
                cachedAt: Date.now(),
              });
            }
          }
        }
      }

      return results;
    } finally {
      await page.close();
    }
  }

  /**
   * Fetch a block completely in ONE page load.
   * Fetches variant metadata AND all code for all formats/versions.
   * This is the most efficient method - use this for sync-catalog.
   */
  async fetchBlockComplete(
    category: Context,
    subcategory: string,
    blockSlug: string,
    formats: CodeFormat[] = ["react", "vue", "html"],
    versions: TailwindVersion[] = ["v4.1", "v3.4"],
    theme: Theme = "light",
    onProgress?: (variant: string, format: CodeFormat, version: TailwindVersion) => void
  ): Promise<{ block: Block; codes: VariantCode[] }> {
    await this.rateLimiter.acquire();

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    const codes: VariantCode[] = [];

    try {
      await page.setUserAgent(getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });

      const hasCookies = await this.setupPage(page);
      if (!hasCookies) {
        throw new AuthRequiredError();
      }

      const url = `${UI_BLOCKS_URL}/${category}/${subcategory}/${blockSlug}`;
      console.log(`  Loading: ${url}`);

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: TIMEOUTS.navigation,
      });

      if (page.url().includes("/login")) {
        throw new AuthRequiredError();
      }

      // Wait for page to load
      await page.waitForSelector("h1", { timeout: TIMEOUTS.selector });

      // Step 1: Fetch block metadata and variant info
      const pageData = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const blockName = h1?.textContent?.trim() || "";
        const description = document.querySelector("h1 + p")?.textContent?.trim() || "";

        // Find all variant headings with component anchors
        const variants: Array<{
          index: number;
          name: string;
          componentId: string;
        }> = [];

        const headings = document.querySelectorAll("h2");
        let variantIndex = 0;
        headings.forEach((h2) => {
          const link = h2.querySelector('a[href*="#component-"]');
          if (link) {
            const href = link.getAttribute("href") || "";
            const componentId = href.replace("#", "");
            const name = h2.textContent?.trim() || `Variant ${variantIndex}`;

            variants.push({
              index: variantIndex,
              name,
              componentId,
            });
            variantIndex++;
          }
        });

        return { blockName, description, variants };
      });

      // Build variants with slugs
      const variants: ComponentVariant[] = pageData.variants.map((v) => ({
        index: v.index,
        name: v.name,
        slug: toKebabCase(v.name),
        componentId: v.componentId,
      }));

      console.log(`  Found ${variants.length} variants`);

      // Step 2: If we need code, fetch it for all variants
      if (formats.length > 0 && versions.length > 0 && variants.length > 0) {
        // Wait for tabpanels to load
        await page.waitForSelector('[role="tabpanel"]', { timeout: TIMEOUTS.selector }).catch(() => {});

        const formatMap: Record<CodeFormat, string> = {
          react: "React",
          vue: "Vue",
          html: "HTML",
        };

        for (const variant of variants) {
          // Click on this variant's Code tab
          const codeTabs = await page.$$('[role="tab"]');
          let codeTabCount = 0;
          let clickedTab = false;

          for (const tab of codeTabs) {
            const text = await tab.evaluate((el) => el.textContent);
            if (text === "Code") {
              if (codeTabCount === variant.index) {
                await tab.click();
                clickedTab = true;
                break;
              }
              codeTabCount++;
            }
          }

          if (!clickedTab) {
            continue;
          }

          // Wait for code to appear
          await page.waitForSelector("code", { timeout: 5000 }).catch(() => {});
          await new Promise((r) => setTimeout(r, TIMING.versionChangeDelayMs));

          // Loop through formats and versions
          for (const format of formats) {
            // Select format
            const formatSelectors = await page.$$("select");
            for (const select of formatSelectors) {
              const options = await select.$$eval("option", (opts) =>
                opts.map((o) => o.textContent?.trim())
              );
              if (options.includes("React") || options.includes("Vue") || options.includes("HTML")) {
                try {
                  await select.select(formatMap[format]);
                } catch {
                  // Selector might be stale
                }
                break;
              }
            }

            await new Promise((r) => setTimeout(r, TIMING.uiInteractionDelayMs));

            for (const version of versions) {
              onProgress?.(variant.name, format, version);

              // Select version
              const versionSelectors = await page.$$("select");
              for (const select of versionSelectors) {
                const options = await select.$$eval("option", (opts) =>
                  opts.map((o) => o.textContent?.trim())
                );
                if (options.includes("v4.1") || options.includes("v3.4")) {
                  try {
                    await select.select(version);
                  } catch {
                    // Selector might be stale
                  }
                  break;
                }
              }

              await new Promise((r) => setTimeout(r, TIMING.uiInteractionDelayMs));

              // Fetch code
              const code = await page.evaluate((targetVariantIndex) => {
                const codeElements = document.querySelectorAll("code");
                const tabPanels = document.querySelectorAll('[role="tabpanel"]');
                let codeTabCount = 0;

                for (const panel of tabPanels) {
                  const tabName = panel.getAttribute("aria-label");
                  if (tabName === "Code") {
                    if (codeTabCount === targetVariantIndex) {
                      const codeEl = panel.querySelector("code");
                      if (codeEl?.textContent) {
                        return codeEl.textContent;
                      }
                    }
                    codeTabCount++;
                  }
                }

                // Fallback: find visible code element
                for (const el of codeElements) {
                  const text = el.textContent || "";
                  if (
                    text.includes("import") ||
                    text.includes("export") ||
                    text.includes("<template>") ||
                    text.includes("<section") ||
                    text.includes("<div")
                  ) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                      return text;
                    }
                  }
                }

                return null;
              }, variant.index);

              if (code) {
                codes.push({
                  category,
                  blockSlug,
                  variantSlug: variant.slug,
                  variantName: variant.name,
                  componentId: variant.componentId,
                  format,
                  version,
                  theme,
                  code,
                  dependencies: parseDependencies(code),
                  cachedAt: Date.now(),
                });
              }
            }
          }
        }
      }

      // Build the complete block
      const block: Block = {
        name: pageData.blockName,
        slug: blockSlug,
        category,
        subcategory,
        url,
        description: pageData.description,
        variantCount: variants.length,
        variants,
        lastFetchedAt: Date.now(),
      };

      return { block, codes };
    } finally {
      await page.close();
    }
  }
}
