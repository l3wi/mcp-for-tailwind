import type { Browser, Page } from "puppeteer";
import type { Component, CatalogCategory, CodeFormat, Theme, TailwindVersion, Context } from "../types/index.ts";
import { UI_BLOCKS_URL, RATE_LIMIT, RETRY_CONFIG, TIMEOUTS, getRandomUserAgent } from "../config.ts";
import { RateLimiter } from "../utils/rate-limiter.ts";
import { withRetry } from "../utils/retry.ts";
import { CacheManager } from "../cache/cache-manager.ts";
import { parseDependencies } from "./shared.ts";

export class ComponentFetcher {
  private rateLimiter: RateLimiter;
  private cacheManager: CacheManager;

  constructor(
    private getBrowser: () => Promise<Browser>,
    private setupPage: (page: Page) => Promise<boolean>
  ) {
    this.rateLimiter = new RateLimiter(RATE_LIMIT.delayBetweenRequests);
    this.cacheManager = new CacheManager();
  }

  /**
   * Fetch a single component's code.
   * Includes retry logic and progressive saving.
   */
  async fetchComponent(
    categorySlug: string,
    context: Context,
    componentIndex: number,
    format: CodeFormat = "react",
    theme: Theme = "light",
    version: TailwindVersion = "v4.1"
  ): Promise<Component> {
    // Check cache first
    const cached = this.cacheManager.get(categorySlug, context, componentIndex, format, theme, version);
    if (cached) {
      console.log(`Cache hit: ${categorySlug}[${componentIndex}]`);
      return cached;
    }

    await this.rateLimiter.acquire();

    return withRetry(
      async () => {
        const component = await this._fetchComponent(
          categorySlug,
          context,
          componentIndex,
          format,
          theme,
          version
        );

        // Save immediately after successful fetch
        this.cacheManager.set(component);

        return component;
      },
      {
        ...RETRY_CONFIG,
        onRetry: (attempt, error) => {
          console.log(`Retry ${attempt}/${RETRY_CONFIG.maxAttempts} for ${categorySlug}[${componentIndex}]: ${error.message}`);
        },
      }
    );
  }

  /**
   * Batch fetch all components for a category.
   * Progressive: saves each component as it's fetched.
   */
  async fetchCategoryComponents(
    category: CatalogCategory,
    format: CodeFormat = "react",
    theme: Theme = "light",
    version: TailwindVersion = "v4.1",
    onProgress?: (current: number, total: number, name: string) => void
  ): Promise<Component[]> {
    const components: Component[] = [];

    for (let i = 0; i < category.componentCount; i++) {
      const name = category.blocks[i]?.name || `Component ${i}`;
      onProgress?.(i + 1, category.componentCount, name);

      try {
        const component = await this.fetchComponent(
          category.slug,
          category.context,
          i,
          format,
          theme,
          version
        );
        components.push(component);
        console.log(`  ✓ ${name}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  ✗ ${name}: ${message}`);

        if (message === "AUTH_REQUIRED") {
          throw error; // Stop if auth fails
        }
        // Continue with next component (progressive saving means we don't lose work)
      }
    }

    return components;
  }

  /**
   * Internal method to fetch a component.
   */
  private async _fetchComponent(
    categorySlug: string,
    context: Context,
    componentIndex: number,
    format: CodeFormat,
    theme: Theme,
    version: TailwindVersion
  ): Promise<Component> {
    console.log(`Fetching: ${context}/${categorySlug}[${componentIndex}] (${format}, ${theme}, ${version})`);

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setUserAgent(getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });

      const hasCookies = await this.setupPage(page);
      if (!hasCookies) {
        throw new Error("AUTH_REQUIRED");
      }

      // Build URL
      const url = `${UI_BLOCKS_URL}/${context}/${categorySlug}`;
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: TIMEOUTS.navigation,
      });

      // Check if we're redirected to login
      if (page.url().includes("/login")) {
        throw new Error("AUTH_REQUIRED");
      }

      // Wait for components to load
      await page.waitForSelector('[role="tabpanel"]', { timeout: TIMEOUTS.selector });

      // Find all component sections
      const componentNames = await page.$$eval('a[href*="#component-"]', (links) =>
        links.map((link) => link.textContent?.trim() || "Unknown")
      );

      if (componentIndex >= componentNames.length) {
        throw new Error(
          `Component index ${componentIndex} out of range. Only ${componentNames.length} components available.`
        );
      }

      const componentName = componentNames[componentIndex] || "Unknown";

      // Click on the component's Code tab
      const tabGroups = await page.$$('[role="tab"]');
      let codeTabIndex = -1;

      for (let i = 0; i < tabGroups.length; i++) {
        const text = await tabGroups[i]?.evaluate((el) => el.textContent);
        if (text === "Code") {
          codeTabIndex++;
          if (codeTabIndex === componentIndex) {
            await tabGroups[i]?.click();
            break;
          }
        }
      }

      // Wait for code panel
      await page.waitForSelector('button:has-text("Copy")', { timeout: 5000 }).catch(() => {});

      // Select format (React/Vue/HTML)
      const formatMap: Record<CodeFormat, string> = {
        react: "React",
        vue: "Vue",
        html: "HTML",
      };

      try {
        const formatSelect = await page.$('select, [role="combobox"]');
        if (formatSelect) {
          await formatSelect.click();
          await page.click(`text=${formatMap[format]}`).catch(() => {});
        }
      } catch {
        // Format selection may not be available
      }

      // Select version
      try {
        const versionSelect = await page.$(`[role="combobox"]:has-text("${version}")`);
        if (versionSelect) {
          await versionSelect.click();
          await page.click(`text=${version}`).catch(() => {});
        }
      } catch {
        // Version selection may not be available
      }

      // Select theme if dark
      if (theme === "dark") {
        try {
          const darkRadio = await page.$('input[type="radio"][value="dark"], [aria-label*="Dark"]');
          if (darkRadio) {
            await darkRadio.click();
          }
        } catch {
          // Theme selection may not be available
        }
      }

      // Wait for updates
      await new Promise((r) => setTimeout(r, 500));

      // Fetch the code
      const code = await page.evaluate(() => {
        const codePanels = Array.from(document.querySelectorAll('[role="tabpanel"]'));

        // Look for code in panels
        for (const panel of codePanels) {
          const codeEl = panel.querySelector("pre, code");
          if (codeEl && codeEl.textContent && codeEl.textContent.includes("import")) {
            return codeEl.textContent;
          }
        }

        // Fallback: search all code elements
        const codeElements = Array.from(document.querySelectorAll("pre code, .code-block, [class*='prism']"));
        for (const el of codeElements) {
          if (el.textContent && el.textContent.includes("import")) {
            return el.textContent;
          }
        }

        return null;
      });

      if (!code) {
        throw new Error(`Could not fetch code for component ${componentIndex}. The page structure may have changed.`);
      }

      // Build component object
      const component: Component = {
        id: `${context}/${categorySlug}/${componentIndex}`,
        name: componentName,
        category: categorySlug.split("/").pop() || categorySlug,
        context,
        url,
        code,
        format,
        theme,
        version,
        dependencies: parseDependencies(code),
      };

      return component;
    } finally {
      await page.close();
    }
  }

  /**
   * Get cache statistics.
   */
  getCacheStats() {
    return this.cacheManager.getStats();
  }

  /**
   * Clear expired cache entries.
   */
  pruneCache(): number {
    return this.cacheManager.pruneExpired();
  }

  /**
   * Clear all cache.
   */
  clearCache(): number {
    return this.cacheManager.clearAll();
  }
}
