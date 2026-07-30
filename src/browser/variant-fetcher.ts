/**
 * Variant-level fetcher for Tailwind Plus UI blocks.
 * Handles format / version / theme selection with resilient DOM controls.
 */
import type { Browser, Page } from "puppeteer-core";
import type {
  Block,
  ComponentVariant,
  VariantCode,
  Context,
  CodeFormat,
  Theme,
  TailwindVersion,
} from "../types/index.ts";
import {
  UI_BLOCKS_URL,
  RATE_LIMIT,
  RETRY_CONFIG,
  TIMEOUTS,
  DEFAULT_TAILWIND_VERSION,
  DEFAULT_THEME,
  getRandomUserAgent,
} from "../config.ts";
import { RateLimiter } from "../utils/rate-limiter.ts";
import { withRetry } from "../utils/retry.ts";
import { toKebabCase } from "../utils/slug.ts";
import { parseDependencies } from "./shared.ts";
import {
  clickCodeTab,
  extractVisibleCode,
  notesForCode,
  selectFormat,
  selectTheme,
  selectVersion,
} from "./page-controls.ts";
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
          if (!hasCookies) throw new AuthRequiredError();

          const url = `${UI_BLOCKS_URL}/${category}/${subcategory}/${blockSlug}`;
          console.log(`Fetching variants from: ${url}`);

          await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: TIMEOUTS.navigation,
          });

          if (page.url().includes("/login")) throw new AuthRequiredError();

          await page.waitForSelector("h1", { timeout: TIMEOUTS.selector });

          const result = await page.evaluate(() => {
            const h1 = document.querySelector("h1");
            const blockName = h1?.textContent?.trim() || "";
            const description =
              document.querySelector("h1 + p")?.textContent?.trim() || "";

            const variants: Array<{
              index: number;
              name: string;
              componentId: string;
            }> = [];

            const headings = document.querySelectorAll("h2");
            headings.forEach((h2) => {
              const link = h2.querySelector('a[href*="#component-"]');
              if (link) {
                const href = link.getAttribute("href") || "";
                const componentId = href.replace("#", "");
                const name = h2.textContent?.trim() || `Variant ${variants.length}`;
                variants.push({
                  index: variants.length,
                  name,
                  componentId,
                });
              }
            });

            return { blockName, description, variants };
          });

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
    version: TailwindVersion = DEFAULT_TAILWIND_VERSION,
    theme: Theme = DEFAULT_THEME
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
          if (!hasCookies) throw new AuthRequiredError();

          const url = `${UI_BLOCKS_URL}/${category}/${subcategory}/${blockSlug}`;
          console.log(
            `Fetching variant code: ${blockSlug}[${variantIndex}] (${format}, ${version}, ${theme})`
          );

          await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: TIMEOUTS.navigation,
          });

          if (page.url().includes("/login")) throw new AuthRequiredError();

          await page
            .waitForSelector('[role="tabpanel"], h2 a[href*="#component-"]', {
              timeout: TIMEOUTS.selector,
            })
            .catch(() => {});

          const variantInfo = await page.evaluate((targetIndex) => {
            const headings = Array.from(document.querySelectorAll("h2"));
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

            return { variantName, componentId };
          }, variantIndex);

          // Recount properly
          const total = await page.evaluate(() => {
            let n = 0;
            document.querySelectorAll("h2").forEach((h2) => {
              if (h2.querySelector('a[href*="#component-"]')) n++;
            });
            return n;
          });

          if (!variantInfo.variantName) {
            throw new VariantIndexOutOfRangeError(variantIndex, total);
          }

          const clicked = await clickCodeTab(page, variantIndex);
          if (!clicked) {
            throw new CodeFetchError(variantIndex);
          }

          await page.waitForSelector("code", { timeout: 5000 }).catch(() => {});

          await selectFormat(page, format);
          const versionResult = await selectVersion(page, version);
          await selectTheme(page, theme);

          const code = await extractVisibleCode(page, variantIndex);
          if (!code) throw new CodeFetchError(variantIndex);

          const notes = notesForCode(code, format);

          return {
            category,
            blockSlug,
            variantSlug: toKebabCase(variantInfo.variantName),
            variantName: variantInfo.variantName,
            componentId: variantInfo.componentId,
            format,
            version,
            resolvedVersion: versionResult.resolved ?? undefined,
            theme,
            code,
            dependencies: parseDependencies(code),
            notes: notes.length ? notes : undefined,
            cachedAt: Date.now(),
          };
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
   * Prefetch all formats/versions for variants on a block (multi page-load path).
   */
  async fetchAllVariantCodes(
    category: Context,
    subcategory: string,
    blockSlug: string,
    formats: CodeFormat[] = ["react", "vue", "html"],
    versions: TailwindVersion[] = [DEFAULT_TAILWIND_VERSION, "v3.4"],
    theme: Theme = DEFAULT_THEME,
    onProgress?: (current: number, total: number, variant: string) => void
  ): Promise<VariantCode[]> {
    const { variants } = await this.fetchBlockVariants(category, subcategory, blockSlug);
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
            if (error instanceof AuthRequiredError) throw error;
          }
        }
      }
    }

    return results;
  }

  /**
   * Efficient single-page-session fetch of all formats/versions for known variants.
   */
  async fetchBlockCodeEfficient(
    category: Context,
    subcategory: string,
    blockSlug: string,
    variants: ComponentVariant[],
    formats: CodeFormat[] = ["react", "vue", "html"],
    versions: TailwindVersion[] = [DEFAULT_TAILWIND_VERSION, "v3.4"],
    theme: Theme = DEFAULT_THEME,
    onProgress?: (variant: string, format: CodeFormat, version: TailwindVersion) => void
  ): Promise<VariantCode[]> {
    if (variants.length === 0) return [];

    await this.rateLimiter.acquire();

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    const results: VariantCode[] = [];

    try {
      await page.setUserAgent(getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });

      const hasCookies = await this.setupPage(page);
      if (!hasCookies) throw new AuthRequiredError();

      const url = `${UI_BLOCKS_URL}/${category}/${subcategory}/${blockSlug}`;
      console.log(`Loading page: ${url}`);

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: TIMEOUTS.navigation,
      });

      if (page.url().includes("/login")) throw new AuthRequiredError();

      await page
        .waitForSelector('[role="tabpanel"], h2 a[href*="#component-"]', {
          timeout: TIMEOUTS.selector,
        })
        .catch(() => {});

      for (const variant of variants) {
        const clicked = await clickCodeTab(page, variant.index);
        if (!clicked) {
          console.warn(`  Could not find Code tab for variant ${variant.index}`);
          continue;
        }

        await page.waitForSelector("code", { timeout: 5000 }).catch(() => {});

        for (const format of formats) {
          await selectFormat(page, format);

          for (const version of versions) {
            onProgress?.(variant.name, format, version);

            const versionResult = await selectVersion(page, version);
            await selectTheme(page, theme);

            const code = await extractVisibleCode(page, variant.index);
            if (code) {
              results.push({
                category,
                blockSlug,
                variantSlug: variant.slug,
                variantName: variant.name,
                componentId: variant.componentId,
                format,
                version,
                resolvedVersion: versionResult.resolved ?? undefined,
                theme,
                code,
                dependencies: parseDependencies(code),
                notes: notesForCode(code, format),
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
   * One page load: metadata + optional code for all formats/versions.
   */
  async fetchBlockComplete(
    category: Context,
    subcategory: string,
    blockSlug: string,
    formats: CodeFormat[] = ["react", "vue", "html"],
    versions: TailwindVersion[] = [DEFAULT_TAILWIND_VERSION, "v3.4"],
    theme: Theme = DEFAULT_THEME,
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
      if (!hasCookies) throw new AuthRequiredError();

      const url = `${UI_BLOCKS_URL}/${category}/${subcategory}/${blockSlug}`;
      console.log(`  Loading: ${url}`);

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: TIMEOUTS.navigation,
      });

      if (page.url().includes("/login")) throw new AuthRequiredError();

      await page.waitForSelector("h1", { timeout: TIMEOUTS.selector });

      const pageData = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const blockName = h1?.textContent?.trim() || "";
        const description =
          document.querySelector("h1 + p")?.textContent?.trim() || "";

        const variants: Array<{
          index: number;
          name: string;
          componentId: string;
        }> = [];

        document.querySelectorAll("h2").forEach((h2) => {
          const link = h2.querySelector('a[href*="#component-"]');
          if (link) {
            const href = link.getAttribute("href") || "";
            variants.push({
              index: variants.length,
              name: h2.textContent?.trim() || `Variant ${variants.length}`,
              componentId: href.replace("#", ""),
            });
          }
        });

        return { blockName, description, variants };
      });

      const variants: ComponentVariant[] = pageData.variants.map((v) => ({
        index: v.index,
        name: v.name,
        slug: toKebabCase(v.name),
        componentId: v.componentId,
      }));

      console.log(`  Found ${variants.length} variants`);

      if (formats.length > 0 && versions.length > 0 && variants.length > 0) {
        await page
          .waitForSelector('[role="tabpanel"]', { timeout: TIMEOUTS.selector })
          .catch(() => {});

        for (const variant of variants) {
          const clicked = await clickCodeTab(page, variant.index);
          if (!clicked) continue;

          await page.waitForSelector("code", { timeout: 5000 }).catch(() => {});

          for (const format of formats) {
            await selectFormat(page, format);

            for (const version of versions) {
              onProgress?.(variant.name, format, version);

              const versionResult = await selectVersion(page, version);
              await selectTheme(page, theme);

              const code = await extractVisibleCode(page, variant.index);
              if (code) {
                codes.push({
                  category,
                  blockSlug,
                  variantSlug: variant.slug,
                  variantName: variant.name,
                  componentId: variant.componentId,
                  format,
                  version,
                  resolvedVersion: versionResult.resolved ?? undefined,
                  theme,
                  code,
                  dependencies: parseDependencies(code),
                  notes: notesForCode(code, format),
                  cachedAt: Date.now(),
                });
              }
            }
          }
        }
      }

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
