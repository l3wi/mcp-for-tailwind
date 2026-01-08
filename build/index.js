#!/usr/bin/env node
import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// src/server.ts
import { Hono } from "hono";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPTransport } from "@hono/mcp";
import { z } from "zod";

// src/browser/browser.ts
import puppeteer from "puppeteer-core";
import { install, resolveBuildId, detectBrowserPlatform, Browser as PuppeteerBrowser } from "@puppeteer/browsers";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, chmodSync } from "node:fs";
import { join as join2 } from "node:path";
import { execSync } from "node:child_process";

// src/config.ts
import { join } from "node:path";
import { homedir } from "node:os";
var CONFIG_DIR = join(homedir(), ".tailwind-mcp");
var COOKIES_PATH = join(CONFIG_DIR, "cookies.json");
var CATALOG_PATH = join(CONFIG_DIR, "catalog.json");
var ENHANCED_CATALOG_PATH = join(CONFIG_DIR, "catalog-v3.json");
var CACHE_DIR = join(CONFIG_DIR, "cache");
var CACHE_MANIFEST_PATH = join(CACHE_DIR, "manifest.json");
var BASE_URL = "https://tailwindcss.com/plus";
var UI_BLOCKS_URL = `${BASE_URL}/ui-blocks`;
var USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
];
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
var RATE_LIMIT = {
  requestsPerMinute: 20,
  delayBetweenRequests: 3000,
  backoffMultiplier: 2,
  maxDelay: 30000
};
var RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 1e4
};
var TIMEOUTS = {
  navigation: 30000,
  selector: 1e4
};
var TIMING = {
  browserRecycleInterval: 15,
  browserRecyclePauseMs: 5000,
  formatChangeDelayMs: 500,
  versionChangeDelayMs: 300,
  uiInteractionDelayMs: 200
};
var CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
var CATALOG_REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// src/errors/index.ts
class TailwindMCPError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "TailwindMCPError";
  }
}

class AuthRequiredError extends TailwindMCPError {
  constructor(message = "Authentication required. Run 'login' first.") {
    super("AUTH_REQUIRED", message);
  }
}

class AuthExpiredError extends TailwindMCPError {
  constructor() {
    super("AUTH_EXPIRED", "Session expired. Run 'login' to refresh.");
  }
}
class CodeFetchError extends TailwindMCPError {
  constructor(variantIndex) {
    super("CODE_FETCH_FAILED", `Could not fetch code for variant ${variantIndex}. The page structure may have changed.`);
  }
}

class VariantIndexOutOfRangeError extends TailwindMCPError {
  constructor(variantIndex, totalVariants) {
    super("VARIANT_INDEX_OUT_OF_RANGE", `Variant index ${variantIndex} out of range. Only ${totalVariants} variants available.`);
  }
}

// src/browser/browser.ts
var BROWSER_CACHE_DIR = join2(CONFIG_DIR, "browsers");
var cachedChromePath = null;
async function findChrome() {
  if (cachedChromePath && existsSync(cachedChromePath)) {
    return cachedChromePath;
  }
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    cachedChromePath = process.env.CHROME_PATH;
    return cachedChromePath;
  }
  const platform = process.platform;
  const paths = [];
  if (platform === "darwin") {
    paths.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge");
  } else if (platform === "win32") {
    const programFiles = process.env["PROGRAMFILES"] || "C:\\Program Files";
    const programFilesX86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
    const localAppData = process.env["LOCALAPPDATA"] || "";
    paths.push(`${programFiles}\\Google\\Chrome\\Application\\chrome.exe`, `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`, `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`, `${programFiles}\\Microsoft\\Edge\\Application\\msedge.exe`, `${programFilesX86}\\Microsoft\\Edge\\Application\\msedge.exe`);
  } else {
    paths.push("/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium", "/usr/bin/brave-browser", "/usr/bin/microsoft-edge");
    try {
      const chromePath2 = execSync("which google-chrome || which chromium || which chromium-browser", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
      if (chromePath2 && existsSync(chromePath2)) {
        cachedChromePath = chromePath2;
        return cachedChromePath;
      }
    } catch {}
  }
  for (const p of paths) {
    if (existsSync(p)) {
      cachedChromePath = p;
      return cachedChromePath;
    }
  }
  console.log("No Chrome/Chromium found on system. Downloading Chromium...");
  const chromePath = await downloadChromium();
  cachedChromePath = chromePath;
  return cachedChromePath;
}
async function downloadChromium() {
  const browserPlatform = detectBrowserPlatform();
  if (!browserPlatform) {
    throw new Error("Unable to detect browser platform for download");
  }
  if (!existsSync(BROWSER_CACHE_DIR)) {
    mkdirSync(BROWSER_CACHE_DIR, { recursive: true });
  }
  const buildId = await resolveBuildId(PuppeteerBrowser.CHROME, browserPlatform, "stable");
  console.log(`Downloading Chrome ${buildId} for ${browserPlatform}...`);
  const result = await install({
    browser: PuppeteerBrowser.CHROME,
    buildId,
    cacheDir: BROWSER_CACHE_DIR,
    downloadProgressCallback: (downloadedBytes, totalBytes) => {
      const percent = Math.round(downloadedBytes / totalBytes * 100);
      process.stdout.write(`\rDownloading Chrome... ${percent}%`);
    }
  });
  console.log(`
Chrome downloaded successfully.`);
  return result.executablePath;
}
if (!existsSync(CONFIG_DIR)) {
  mkdirSync(CONFIG_DIR, { recursive: true });
}
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}
var browser = null;
async function getBrowser() {
  if (!browser || !browser.connected) {
    const executablePath = await findChrome();
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
    });
  }
  return browser;
}
async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
function loadCookies() {
  try {
    if (existsSync(COOKIES_PATH)) {
      const data = readFileSync(COOKIES_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch {}
  return null;
}
function saveCookies(cookies) {
  const normalizedCookies = cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain || "",
    path: c.path || "/",
    expires: c.expires || -1,
    httpOnly: c.httpOnly || false,
    secure: c.secure || false
  }));
  const data = {
    cookies: normalizedCookies,
    savedAt: Date.now()
  };
  writeFileSync(COOKIES_PATH, JSON.stringify(data, null, 2));
  chmodSync(COOKIES_PATH, 384);
}
function checkAuthState() {
  const cookieData = loadCookies();
  if (!cookieData) {
    return {
      isAuthenticated: false,
      cookiesExist: false,
      cookiesExpired: false
    };
  }
  const now = Date.now() / 1000;
  const hasValidCookies = cookieData.cookies.some((c) => c.expires > now || c.expires === -1);
  return {
    isAuthenticated: hasValidCookies,
    cookiesExist: true,
    cookiesExpired: !hasValidCookies,
    lastLoginAt: cookieData.savedAt
  };
}
async function setupPage(page) {
  await page.setUserAgent(getRandomUserAgent());
  await page.setViewport({ width: 1920, height: 1080 });
  const cookieData = loadCookies();
  if (cookieData?.cookies) {
    await page.setCookie(...cookieData.cookies);
    return true;
  }
  return false;
}
async function login() {
  console.log("Starting interactive login to Tailwind Plus...");
  console.log("");
  const executablePath = await findChrome();
  const loginBrowser = await puppeteer.launch({
    executablePath,
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await loginBrowser.newPage();
  await page.setUserAgent(getRandomUserAgent());
  try {
    await page.goto("https://tailwindcss.com/plus/login", {
      waitUntil: "networkidle2"
    });
    console.log("Please log in to Tailwind Plus in the browser window.");
    console.log("The browser will close automatically after successful login.");
    console.log("");
    await page.waitForFunction(() => {
      const url = window.location.href;
      return url.includes("/plus/ui-blocks") || url.includes("/plus/templates") || url.includes("/plus/ui-kit") || url.includes("/plus") && !url.includes("/login");
    }, { timeout: 300000 });
    console.log("Login successful! Saving cookies...");
    const cookies = await page.cookies();
    saveCookies(cookies);
    console.log(`Cookies saved to ${COOKIES_PATH}`);
  } finally {
    await loginBrowser.close();
  }
}
function clearCache(expiredOnly = false) {
  if (expiredOnly) {
    console.log("Note: Use CacheManager.pruneExpired() for expired-only clearing");
  }
  const files = readdirSync(CACHE_DIR);
  let cleared = 0;
  for (const file of files) {
    try {
      unlinkSync(join2(CACHE_DIR, file));
      cleared++;
    } catch {}
  }
  console.log(`Cleared ${cleared} cached items`);
  return cleared;
}
async function fetchBlockIndex() {
  const browser2 = await getBrowser();
  const page = await browser2.newPage();
  try {
    await page.setUserAgent(getRandomUserAgent());
    await page.setViewport({ width: 1920, height: 1080 });
    const hasCookies = await setupPage(page);
    if (!hasCookies) {
      throw new AuthRequiredError("No cookies found. Run 'login' first.");
    }
    console.log("Loading block index from https://tailwindcss.com/plus/ui-blocks...");
    await page.goto("https://tailwindcss.com/plus/ui-blocks", {
      waitUntil: "networkidle2",
      timeout: 30000
    });
    if (page.url().includes("/login")) {
      throw new AuthExpiredError;
    }
    const blocks = await page.evaluate(() => {
      const results = [];
      let currentCategory = null;
      const main = document.querySelector("main");
      if (!main)
        return results;
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT);
      let node = walker.currentNode;
      while (node) {
        const el = node;
        if (el.tagName === "H2") {
          const text = el.textContent?.trim().toLowerCase() || "";
          if (text === "marketing")
            currentCategory = "marketing";
          else if (text === "application ui")
            currentCategory = "application-ui";
          else if (text === "ecommerce")
            currentCategory = "ecommerce";
        }
        if (el.tagName === "A" && currentCategory) {
          const href = el.getAttribute("href") || "";
          if (href.includes("/ui-blocks/") && href.includes(currentCategory)) {
            const textContent = el.textContent || "";
            const nameMatch = textContent.match(/^(.+?)(\d+\s+(?:components?|examples?))/);
            const countMatch = textContent.match(/(\d+)\s+(?:components?|examples?)/);
            if (nameMatch && countMatch) {
              const name = nameMatch[1].trim();
              const count = parseInt(countMatch[1], 10);
              const urlParts = href.split("/").filter(Boolean);
              const slug = urlParts[urlParts.length - 1] || "";
              const subcategory = urlParts[urlParts.length - 2] || "";
              if (!results.some((r) => r.slug === slug && r.category === currentCategory)) {
                results.push({
                  name,
                  slug,
                  category: currentCategory,
                  subcategory,
                  componentCount: count,
                  url: href.startsWith("http") ? href : `https://tailwindcss.com${href}`
                });
              }
            }
          }
        }
        node = walker.nextNode();
      }
      return results;
    });
    console.log(`Found ${blocks.length} blocks across all categories`);
    return blocks;
  } finally {
    await page.close();
  }
}

// src/utils/rate-limiter.ts
class RateLimiter {
  delayMs;
  lastRequest = 0;
  queue = [];
  processing = false;
  constructor(delayMs) {
    this.delayMs = delayMs;
  }
  async acquire() {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }
  async processQueue() {
    if (this.processing || this.queue.length === 0)
      return;
    this.processing = true;
    const elapsed = Date.now() - this.lastRequest;
    if (elapsed < this.delayMs) {
      await new Promise((r) => setTimeout(r, this.delayMs - elapsed));
    }
    this.lastRequest = Date.now();
    const next = this.queue.shift();
    next?.();
    this.processing = false;
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }
  getQueueLength() {
    return this.queue.length;
  }
  clearQueue() {
    this.queue = [];
    this.processing = false;
  }
  reset() {
    this.lastRequest = 0;
  }
}

// src/utils/retry.ts
async function withRetry(fn, options) {
  let lastError = new Error("No attempts made");
  for (let attempt = 1;attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === options.maxAttempts) {
        break;
      }
      const delay = Math.min(options.baseDelay * Math.pow(2, attempt - 1), options.maxDelay);
      options.onRetry?.(attempt, lastError);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// src/utils/slug.ts
function toKebabCase(str) {
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function generateVariantCacheKey(category, blockSlug, variantSlug, format, theme, version) {
  return [category, blockSlug, variantSlug, format, theme, version].join("--");
}
function generateBlockKey(category, subcategory, slug) {
  return `${category}/${subcategory}/${slug}`;
}

// src/browser/shared.ts
function parseDependencies(code) {
  const deps = new Set;
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const pkg = match[1];
    if (pkg && !pkg.startsWith(".") && !pkg.startsWith("/")) {
      const pkgName = pkg.startsWith("@") ? pkg.split("/").slice(0, 2).join("/") : pkg.split("/")[0];
      if (pkgName)
        deps.add(pkgName);
    }
  }
  return Array.from(deps);
}

// src/browser/variant-fetcher.ts
class VariantFetcher {
  getBrowser;
  setupPage;
  rateLimiter;
  constructor(getBrowser2, setupPage2) {
    this.getBrowser = getBrowser2;
    this.setupPage = setupPage2;
    this.rateLimiter = new RateLimiter(RATE_LIMIT.delayBetweenRequests);
  }
  async fetchBlockVariants(category, subcategory, blockSlug) {
    await this.rateLimiter.acquire();
    return withRetry(async () => {
      const browser2 = await this.getBrowser();
      const page = await browser2.newPage();
      try {
        await page.setUserAgent(getRandomUserAgent());
        await page.setViewport({ width: 1920, height: 1080 });
        const hasCookies = await this.setupPage(page);
        if (!hasCookies) {
          throw new AuthRequiredError;
        }
        const url = `${UI_BLOCKS_URL}/${category}/${subcategory}/${blockSlug}`;
        console.log(`Fetching variants from: ${url}`);
        await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: TIMEOUTS.navigation
        });
        if (page.url().includes("/login")) {
          throw new AuthRequiredError;
        }
        await page.waitForSelector("h1", { timeout: TIMEOUTS.selector });
        const result = await page.evaluate(() => {
          const h1 = document.querySelector("h1");
          const blockName = h1?.textContent?.trim() || "";
          const description = document.querySelector("h1 + p")?.textContent?.trim() || "";
          const variants2 = [];
          const headings = document.querySelectorAll("h2");
          headings.forEach((h2, index) => {
            const link = h2.querySelector('a[href*="#component-"]');
            if (link) {
              const href = link.getAttribute("href") || "";
              const componentId = href.replace("#", "");
              const name = h2.textContent?.trim() || `Variant ${index}`;
              variants2.push({
                index,
                name,
                componentId
              });
            }
          });
          return { blockName, description, variants: variants2 };
        });
        const variants = result.variants.map((v) => ({
          index: v.index,
          name: v.name,
          slug: toKebabCase(v.name),
          componentId: v.componentId
        }));
        const block = {
          name: result.blockName,
          slug: blockSlug,
          category,
          subcategory,
          url: `${UI_BLOCKS_URL}/${category}/${subcategory}/${blockSlug}`,
          description: result.description,
          variantCount: variants.length
        };
        return { block, variants };
      } finally {
        await page.close();
      }
    }, {
      ...RETRY_CONFIG,
      onRetry: (attempt, error) => {
        console.log(`Retry ${attempt}/${RETRY_CONFIG.maxAttempts} for ${blockSlug}: ${error.message}`);
      }
    });
  }
  async fetchVariantCode(category, subcategory, blockSlug, variantIndex, format = "react", version = "v4.1", theme = "light") {
    await this.rateLimiter.acquire();
    return withRetry(async () => {
      const browser2 = await this.getBrowser();
      const page = await browser2.newPage();
      try {
        await page.setUserAgent(getRandomUserAgent());
        await page.setViewport({ width: 1920, height: 1080 });
        const hasCookies = await this.setupPage(page);
        if (!hasCookies) {
          throw new AuthRequiredError;
        }
        const url = `${UI_BLOCKS_URL}/${category}/${subcategory}/${blockSlug}`;
        console.log(`Fetching variant code: ${blockSlug}[${variantIndex}] (${format}, ${version}, ${theme})`);
        await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: TIMEOUTS.navigation
        });
        if (page.url().includes("/login")) {
          throw new AuthRequiredError;
        }
        await page.waitForSelector('[role="tabpanel"]', {
          timeout: TIMEOUTS.selector
        });
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
        await page.waitForSelector("code", { timeout: 5000 }).catch(() => {});
        const formatMap = {
          react: "React",
          vue: "Vue",
          html: "HTML"
        };
        const formatSelectors = await page.$$("select");
        if (formatSelectors.length > variantIndex) {
          const formatSelect = formatSelectors[variantIndex];
          if (formatSelect) {
            await formatSelect.select(formatMap[format]);
          }
        } else if (formatSelectors.length > 0) {
          await formatSelectors[0].select(formatMap[format]);
        }
        await new Promise((r) => setTimeout(r, TIMING.formatChangeDelayMs));
        const versionSelectors = await page.$$("select");
        for (const select of versionSelectors) {
          const options = await select.$$eval("option", (opts) => opts.map((o) => o.textContent?.trim()));
          if (options.includes("v4.1") || options.includes("v3.4")) {
            await select.select(version);
            break;
          }
        }
        await new Promise((r) => setTimeout(r, TIMING.versionChangeDelayMs));
        if (theme === "dark") {
          const darkRadio = await page.$('input[type="radio"][value="dark"], [aria-label*="Dark"]');
          if (darkRadio) {
            await darkRadio.click();
            await new Promise((r) => setTimeout(r, TIMING.versionChangeDelayMs));
          }
        }
        const code = await page.evaluate((targetVariantIndex) => {
          const codeElements = document.querySelectorAll("code");
          const tabPanels = document.querySelectorAll('[role="tabpanel"]');
          let codeTabCount2 = 0;
          for (const panel of tabPanels) {
            const tabName = panel.getAttribute("aria-label");
            if (tabName === "Code") {
              if (codeTabCount2 === targetVariantIndex) {
                const codeEl = panel.querySelector("code");
                if (codeEl?.textContent) {
                  return codeEl.textContent;
                }
              }
              codeTabCount2++;
            }
          }
          for (const el of codeElements) {
            const text = el.textContent || "";
            if (text.includes("import") || text.includes("export") || text.includes("<template>") || text.includes("<section") || text.includes("<div")) {
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
        const variantCode = {
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
          cachedAt: Date.now()
        };
        return variantCode;
      } finally {
        await page.close();
      }
    }, {
      ...RETRY_CONFIG,
      onRetry: (attempt, error) => {
        console.log(`Retry ${attempt}/${RETRY_CONFIG.maxAttempts} for ${blockSlug}[${variantIndex}]: ${error.message}`);
      }
    });
  }
  async fetchAllVariantCodes(category, subcategory, blockSlug, formats = ["react", "vue", "html"], versions = ["v4.1", "v3.4"], theme = "light", onProgress) {
    const { variants } = await this.fetchBlockVariants(category, subcategory, blockSlug);
    const results = [];
    const total = variants.length * formats.length * versions.length;
    let current = 0;
    for (const variant of variants) {
      for (const format of formats) {
        for (const version of versions) {
          current++;
          onProgress?.(current, total, `${variant.name} (${format}, ${version})`);
          try {
            const code = await this.fetchVariantCode(category, subcategory, blockSlug, variant.index, format, version, theme);
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
  async fetchBlockCodeEfficient(category, subcategory, blockSlug, variants, formats = ["react", "vue", "html"], versions = ["v4.1", "v3.4"], theme = "light", onProgress) {
    if (variants.length === 0) {
      return [];
    }
    await this.rateLimiter.acquire();
    const browser2 = await this.getBrowser();
    const page = await browser2.newPage();
    const results = [];
    try {
      await page.setUserAgent(getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });
      const hasCookies = await this.setupPage(page);
      if (!hasCookies) {
        throw new AuthRequiredError;
      }
      const url = `${UI_BLOCKS_URL}/${category}/${subcategory}/${blockSlug}`;
      console.log(`Loading page: ${url}`);
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: TIMEOUTS.navigation
      });
      if (page.url().includes("/login")) {
        throw new AuthRequiredError;
      }
      await page.waitForSelector('[role="tabpanel"]', {
        timeout: TIMEOUTS.selector
      });
      const formatMap = {
        react: "React",
        vue: "Vue",
        html: "HTML"
      };
      for (const variant of variants) {
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
        await page.waitForSelector("code", { timeout: 5000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, TIMING.versionChangeDelayMs));
        for (const format of formats) {
          const formatSelectors = await page.$$("select");
          let formatSelected = false;
          for (const select of formatSelectors) {
            const options = await select.$$eval("option", (opts) => opts.map((o) => o.textContent?.trim()));
            if (options.includes("React") || options.includes("Vue") || options.includes("HTML")) {
              try {
                await select.select(formatMap[format]);
                formatSelected = true;
                break;
              } catch {}
            }
          }
          if (!formatSelected) {
            console.warn(`  Could not select format ${format} for ${variant.name}`);
          }
          await new Promise((r) => setTimeout(r, TIMING.uiInteractionDelayMs));
          for (const version of versions) {
            onProgress?.(variant.name, format, version);
            const versionSelectors = await page.$$("select");
            for (const select of versionSelectors) {
              const options = await select.$$eval("option", (opts) => opts.map((o) => o.textContent?.trim()));
              if (options.includes("v4.1") || options.includes("v3.4")) {
                try {
                  await select.select(version);
                } catch {}
                break;
              }
            }
            await new Promise((r) => setTimeout(r, TIMING.uiInteractionDelayMs));
            const code = await page.evaluate((targetVariantIndex) => {
              const codeElements = document.querySelectorAll("code");
              const tabPanels = document.querySelectorAll('[role="tabpanel"]');
              let codeTabCount2 = 0;
              for (const panel of tabPanels) {
                const tabName = panel.getAttribute("aria-label");
                if (tabName === "Code") {
                  if (codeTabCount2 === targetVariantIndex) {
                    const codeEl = panel.querySelector("code");
                    if (codeEl?.textContent) {
                      return codeEl.textContent;
                    }
                  }
                  codeTabCount2++;
                }
              }
              for (const el of codeElements) {
                const text = el.textContent || "";
                if (text.includes("import") || text.includes("export") || text.includes("<template>") || text.includes("<section") || text.includes("<div")) {
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
                cachedAt: Date.now()
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
  async fetchBlockComplete(category, subcategory, blockSlug, formats = ["react", "vue", "html"], versions = ["v4.1", "v3.4"], theme = "light", onProgress) {
    await this.rateLimiter.acquire();
    const browser2 = await this.getBrowser();
    const page = await browser2.newPage();
    const codes = [];
    try {
      await page.setUserAgent(getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });
      const hasCookies = await this.setupPage(page);
      if (!hasCookies) {
        throw new AuthRequiredError;
      }
      const url = `${UI_BLOCKS_URL}/${category}/${subcategory}/${blockSlug}`;
      console.log(`  Loading: ${url}`);
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: TIMEOUTS.navigation
      });
      if (page.url().includes("/login")) {
        throw new AuthRequiredError;
      }
      await page.waitForSelector("h1", { timeout: TIMEOUTS.selector });
      const pageData = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const blockName = h1?.textContent?.trim() || "";
        const description = document.querySelector("h1 + p")?.textContent?.trim() || "";
        const variants2 = [];
        const headings = document.querySelectorAll("h2");
        let variantIndex = 0;
        headings.forEach((h2) => {
          const link = h2.querySelector('a[href*="#component-"]');
          if (link) {
            const href = link.getAttribute("href") || "";
            const componentId = href.replace("#", "");
            const name = h2.textContent?.trim() || `Variant ${variantIndex}`;
            variants2.push({
              index: variantIndex,
              name,
              componentId
            });
            variantIndex++;
          }
        });
        return { blockName, description, variants: variants2 };
      });
      const variants = pageData.variants.map((v) => ({
        index: v.index,
        name: v.name,
        slug: toKebabCase(v.name),
        componentId: v.componentId
      }));
      console.log(`  Found ${variants.length} variants`);
      if (formats.length > 0 && versions.length > 0 && variants.length > 0) {
        await page.waitForSelector('[role="tabpanel"]', { timeout: TIMEOUTS.selector }).catch(() => {});
        const formatMap = {
          react: "React",
          vue: "Vue",
          html: "HTML"
        };
        for (const variant of variants) {
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
          await page.waitForSelector("code", { timeout: 5000 }).catch(() => {});
          await new Promise((r) => setTimeout(r, TIMING.versionChangeDelayMs));
          for (const format of formats) {
            const formatSelectors = await page.$$("select");
            for (const select of formatSelectors) {
              const options = await select.$$eval("option", (opts) => opts.map((o) => o.textContent?.trim()));
              if (options.includes("React") || options.includes("Vue") || options.includes("HTML")) {
                try {
                  await select.select(formatMap[format]);
                } catch {}
                break;
              }
            }
            await new Promise((r) => setTimeout(r, TIMING.uiInteractionDelayMs));
            for (const version of versions) {
              onProgress?.(variant.name, format, version);
              const versionSelectors = await page.$$("select");
              for (const select of versionSelectors) {
                const options = await select.$$eval("option", (opts) => opts.map((o) => o.textContent?.trim()));
                if (options.includes("v4.1") || options.includes("v3.4")) {
                  try {
                    await select.select(version);
                  } catch {}
                  break;
                }
              }
              await new Promise((r) => setTimeout(r, TIMING.uiInteractionDelayMs));
              const code = await page.evaluate((targetVariantIndex) => {
                const codeElements = document.querySelectorAll("code");
                const tabPanels = document.querySelectorAll('[role="tabpanel"]');
                let codeTabCount2 = 0;
                for (const panel of tabPanels) {
                  const tabName = panel.getAttribute("aria-label");
                  if (tabName === "Code") {
                    if (codeTabCount2 === targetVariantIndex) {
                      const codeEl = panel.querySelector("code");
                      if (codeEl?.textContent) {
                        return codeEl.textContent;
                      }
                    }
                    codeTabCount2++;
                  }
                }
                for (const el of codeElements) {
                  const text = el.textContent || "";
                  if (text.includes("import") || text.includes("export") || text.includes("<template>") || text.includes("<section") || text.includes("<div")) {
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
                  cachedAt: Date.now()
                });
              }
            }
          }
        }
      }
      const block = {
        name: pageData.blockName,
        slug: blockSlug,
        category,
        subcategory,
        url,
        description: pageData.description,
        variantCount: variants.length,
        variants,
        lastFetchedAt: Date.now()
      };
      return { block, codes };
    } finally {
      await page.close();
    }
  }
}

// src/data/catalog-manager.ts
import { existsSync as existsSync2, readFileSync as readFileSync2, writeFileSync as writeFileSync2, mkdirSync as mkdirSync2 } from "node:fs";
class CatalogManager {
  catalog = null;
  enhancedCatalog = null;
  constructor() {
    this.ensureDir();
  }
  load() {
    if (this.catalog)
      return this.catalog;
    if (!existsSync2(CATALOG_PATH)) {
      return null;
    }
    try {
      const data = readFileSync2(CATALOG_PATH, "utf-8");
      this.catalog = JSON.parse(data);
      return this.catalog;
    } catch {
      return null;
    }
  }
  save(catalog) {
    catalog.lastUpdatedAt = Date.now();
    this.recalculateStats(catalog);
    writeFileSync2(CATALOG_PATH, JSON.stringify(catalog, null, 2));
    this.catalog = catalog;
  }
  needsRefresh() {
    const catalog = this.load();
    if (!catalog)
      return true;
    const age = Date.now() - catalog.lastUpdatedAt;
    return age > CATALOG_REFRESH_THRESHOLD_MS;
  }
  exists() {
    return existsSync2(CATALOG_PATH);
  }
  merge(context, categories) {
    const catalog = this.load() || this.createEmpty();
    const existingMap = new Map(catalog.contexts[context].map((c) => [c.slug, c]));
    for (const newCat of categories) {
      existingMap.set(newCat.slug, newCat);
    }
    catalog.contexts[context] = Array.from(existingMap.values());
    this.save(catalog);
  }
  getCategories(context) {
    const catalog = this.load();
    if (!catalog)
      return [];
    if (context) {
      return catalog.contexts[context];
    }
    return [
      ...catalog.contexts.marketing,
      ...catalog.contexts["application-ui"],
      ...catalog.contexts.ecommerce
    ];
  }
  getStats() {
    const catalog = this.load();
    return catalog?.stats || null;
  }
  getLastUpdated() {
    const catalog = this.load();
    return catalog?.lastUpdatedAt || null;
  }
  createEmpty() {
    return {
      version: "2.0.0",
      generatedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      contexts: {
        marketing: [],
        "application-ui": [],
        ecommerce: []
      },
      stats: {
        totalCategories: 0,
        totalBlocks: 0,
        totalCachedComponents: 0
      }
    };
  }
  recalculateStats(catalog) {
    catalog.stats.totalCategories = 0;
    catalog.stats.totalBlocks = 0;
    for (const categories of Object.values(catalog.contexts)) {
      catalog.stats.totalCategories += categories.length;
      catalog.stats.totalBlocks += categories.reduce((sum, c) => sum + c.componentCount, 0);
    }
  }
  ensureDir() {
    if (!existsSync2(CONFIG_DIR)) {
      mkdirSync2(CONFIG_DIR, { recursive: true });
    }
  }
  loadEnhanced() {
    if (this.enhancedCatalog)
      return this.enhancedCatalog;
    if (!existsSync2(ENHANCED_CATALOG_PATH)) {
      return null;
    }
    try {
      const data = readFileSync2(ENHANCED_CATALOG_PATH, "utf-8");
      this.enhancedCatalog = JSON.parse(data);
      return this.enhancedCatalog;
    } catch {
      return null;
    }
  }
  saveEnhanced(catalog) {
    catalog.lastUpdatedAt = Date.now();
    this.recalculateEnhancedStats(catalog);
    writeFileSync2(ENHANCED_CATALOG_PATH, JSON.stringify(catalog, null, 2));
    this.enhancedCatalog = catalog;
  }
  createEmptyEnhanced() {
    return {
      version: "3.0.0",
      generatedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      blocks: {},
      stats: {
        totalBlocks: 0,
        totalVariants: 0,
        totalCachedVariants: 0
      }
    };
  }
  enhancedNeedsRefresh() {
    const catalog = this.loadEnhanced();
    if (!catalog)
      return true;
    const age = Date.now() - catalog.lastUpdatedAt;
    return age > CATALOG_REFRESH_THRESHOLD_MS;
  }
  enhancedExists() {
    return existsSync2(ENHANCED_CATALOG_PATH);
  }
  setBlock(block) {
    const catalog = this.loadEnhanced() || this.createEmptyEnhanced();
    const key = generateBlockKey(block.category, block.subcategory, block.slug);
    catalog.blocks[key] = block;
    this.saveEnhanced(catalog);
  }
  getBlock(category, subcategory, slug) {
    const catalog = this.loadEnhanced();
    if (!catalog)
      return null;
    const key = generateBlockKey(category, subcategory, slug);
    return catalog.blocks[key] || null;
  }
  getBlocks(category, subcategory) {
    const catalog = this.loadEnhanced();
    if (!catalog)
      return [];
    const blocks = Object.values(catalog.blocks);
    if (category && subcategory) {
      return blocks.filter((b) => b.category === category && b.subcategory === subcategory);
    }
    if (category) {
      return blocks.filter((b) => b.category === category);
    }
    return blocks;
  }
  getCategoryInfo() {
    const catalog = this.loadEnhanced();
    if (!catalog)
      return [];
    const categoryMap = new Map;
    for (const block of Object.values(catalog.blocks)) {
      if (!categoryMap.has(block.category)) {
        categoryMap.set(block.category, { blockCount: 0, subcategories: new Set });
      }
      const info = categoryMap.get(block.category);
      info.blockCount++;
      info.subcategories.add(block.subcategory);
    }
    const categoryNames = {
      marketing: "Marketing",
      "application-ui": "Application UI",
      ecommerce: "Ecommerce"
    };
    const result = [];
    for (const [slug, info] of categoryMap) {
      result.push({
        name: categoryNames[slug],
        slug,
        blockCount: info.blockCount,
        subcategories: Array.from(info.subcategories).sort()
      });
    }
    return result;
  }
  getVariants(category, subcategory, blockSlug) {
    const block = this.getBlock(category, subcategory, blockSlug);
    return block?.variants || [];
  }
  getEnhancedStats() {
    const catalog = this.loadEnhanced();
    return catalog?.stats || null;
  }
  getEnhancedLastUpdated() {
    const catalog = this.loadEnhanced();
    return catalog?.lastUpdatedAt || null;
  }
  recalculateEnhancedStats(catalog) {
    const blocks = Object.values(catalog.blocks);
    catalog.stats.totalBlocks = blocks.length;
    catalog.stats.totalVariants = blocks.reduce((sum, b) => sum + b.variantCount, 0);
  }
}

// src/cache/cache-manager.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync3, readFileSync as readFileSync3 } from "node:fs";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { join as join3 } from "node:path";
class CacheManager {
  manifest;
  manifestDirty = false;
  saveTimeout = null;
  constructor() {
    this.ensureDir();
    this.manifest = this.loadManifest();
  }
  markManifestDirty() {
    this.manifestDirty = true;
    if (!this.saveTimeout) {
      this.saveTimeout = setTimeout(() => {
        this.flushManifest();
      }, 1000);
    }
  }
  async flushManifest() {
    if (this.manifestDirty) {
      this.manifest.stats = {
        totalSize: Object.values(this.manifest.entries).reduce((sum, e) => sum + e.size, 0),
        entryCount: Object.keys(this.manifest.entries).length
      };
      await writeFile(CACHE_MANIFEST_PATH, JSON.stringify(this.manifest, null, 2));
      this.manifestDirty = false;
    }
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }
  async get(categorySlug, context, index, format, theme, version) {
    const key = this.buildKey(categorySlug, context, index, format, theme, version);
    const entry = this.manifest.entries[key];
    if (!entry)
      return null;
    if (this.isExpired(entry)) {
      await this.delete(key);
      return null;
    }
    try {
      const data = await readFile(entry.filePath, "utf-8");
      return JSON.parse(data);
    } catch {
      await this.delete(key);
      return null;
    }
  }
  async set(component) {
    const index = parseInt(component.id.split("/").pop() || "0", 10);
    const key = this.buildKey(component.category, component.context, index, component.format, component.theme, component.version);
    const filePath = join3(CACHE_DIR, `${key}.json`);
    const content = JSON.stringify(component, null, 2);
    await writeFile(filePath, content);
    const entry = {
      id: component.id,
      format: component.format,
      theme: component.theme,
      version: component.version,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL_MS,
      filePath,
      size: Buffer.byteLength(content)
    };
    this.manifest.entries[key] = entry;
    this.markManifestDirty();
  }
  isExpired(entry) {
    return Date.now() > entry.expiresAt;
  }
  async delete(key) {
    const entry = this.manifest.entries[key];
    if (entry && existsSync3(entry.filePath)) {
      try {
        await unlink(entry.filePath);
      } catch {}
    }
    delete this.manifest.entries[key];
    this.markManifestDirty();
  }
  async pruneExpired() {
    let pruned = 0;
    for (const [key, entry] of Object.entries(this.manifest.entries)) {
      if (this.isExpired(entry)) {
        await this.delete(key);
        pruned++;
      }
    }
    return pruned;
  }
  async clearAll() {
    const keys = Object.keys(this.manifest.entries);
    for (const key of keys) {
      await this.delete(key);
    }
    return keys.length;
  }
  getStats() {
    const entries = Object.values(this.manifest.entries);
    return {
      totalEntries: entries.length,
      totalSize: entries.reduce((sum, e) => sum + e.size, 0),
      expiredCount: entries.filter((e) => this.isExpired(e)).length
    };
  }
  async getVariant(category, blockSlug, variantSlug, format, theme, version) {
    const key = generateVariantCacheKey(category, blockSlug, variantSlug, format, theme, version);
    const entry = this.manifest.entries[key];
    if (!entry)
      return null;
    if (this.isExpired(entry)) {
      await this.delete(key);
      return null;
    }
    try {
      const data = await readFile(entry.filePath, "utf-8");
      return JSON.parse(data);
    } catch {
      await this.delete(key);
      return null;
    }
  }
  async setVariant(variant) {
    const key = generateVariantCacheKey(variant.category, variant.blockSlug, variant.variantSlug, variant.format, variant.theme, variant.version);
    const filePath = join3(CACHE_DIR, `${key}.json`);
    const content = JSON.stringify(variant, null, 2);
    await writeFile(filePath, content);
    const entry = {
      id: `${variant.category}/${variant.blockSlug}/${variant.variantSlug}`,
      format: variant.format,
      theme: variant.theme,
      version: variant.version,
      cachedAt: variant.cachedAt || Date.now(),
      expiresAt: (variant.cachedAt || Date.now()) + CACHE_TTL_MS,
      filePath,
      size: Buffer.byteLength(content)
    };
    this.manifest.entries[key] = entry;
    this.markManifestDirty();
  }
  hasVariant(category, blockSlug, variantSlug, format, theme, version) {
    const key = generateVariantCacheKey(category, blockSlug, variantSlug, format, theme, version);
    const entry = this.manifest.entries[key];
    return entry ? !this.isExpired(entry) : false;
  }
  async getBlockVariants(category, blockSlug) {
    const prefix = `${category}--${blockSlug}--`;
    const results = [];
    for (const [key, entry] of Object.entries(this.manifest.entries)) {
      if (key.startsWith(prefix) && !this.isExpired(entry)) {
        try {
          const data = await readFile(entry.filePath, "utf-8");
          results.push(JSON.parse(data));
        } catch {}
      }
    }
    return results;
  }
  getVariantStats() {
    const byCategory = {};
    const byFormat = {};
    let totalVariants = 0;
    let totalSize = 0;
    for (const [key, entry] of Object.entries(this.manifest.entries)) {
      if (this.isExpired(entry))
        continue;
      const parts = key.split("--");
      if (parts.length >= 4) {
        const category = parts[0];
        const format = parts[3];
        byCategory[category] = (byCategory[category] || 0) + 1;
        byFormat[format] = (byFormat[format] || 0) + 1;
        totalVariants++;
        totalSize += entry.size;
      }
    }
    return { totalVariants, byCategory, byFormat, totalSize };
  }
  buildKey(categorySlug, context, index, format, theme, version) {
    return `${context}--${categorySlug.replace(/\//g, "--")}--${index}--${format}--${theme}--${version}`;
  }
  ensureDir() {
    if (!existsSync3(CACHE_DIR)) {
      mkdirSync3(CACHE_DIR, { recursive: true });
    }
  }
  loadManifest() {
    if (existsSync3(CACHE_MANIFEST_PATH)) {
      try {
        return JSON.parse(readFileSync3(CACHE_MANIFEST_PATH, "utf-8"));
      } catch {
        return this.createEmptyManifest();
      }
    }
    return this.createEmptyManifest();
  }
  createEmptyManifest() {
    return {
      version: "2.0.0",
      createdAt: Date.now(),
      entries: {},
      stats: { totalSize: 0, entryCount: 0 }
    };
  }
}

// src/data/search.ts
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  if (s1 === s2)
    return 1;
  if (s1.includes(s2) || s2.includes(s1))
    return 0.9;
  const words1 = s1.split(/[\s-]+/);
  const words2 = s2.split(/[\s-]+/);
  let matchedWords = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matchedWords++;
        break;
      }
    }
  }
  const wordScore = matchedWords / Math.max(words1.length, words2.length);
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0)
    return 1;
  const distance = levenshteinDistance(s1, s2);
  const levenshteinScore = 1 - distance / maxLen;
  return Math.max(wordScore * 0.7 + levenshteinScore * 0.3, levenshteinScore);
}
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_2, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1;i <= m; i++) {
    const prevRow = dp[i - 1];
    const currRow = dp[i];
    for (let j = 1;j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(prevRow[j] + 1, currRow[j - 1] + 1, prevRow[j - 1] + cost);
    }
  }
  return dp[m][n];
}
function search(query, catalogManager, options) {
  const { category, limit = 10, includeVariants = true } = options || {};
  const results = [];
  const blocks = catalogManager.getBlocks(category);
  const queryLower = query.toLowerCase();
  for (const block of blocks) {
    const blockNameScore = calculateSimilarity(block.name, queryLower);
    const blockDescScore = block.description ? calculateSimilarity(block.description, queryLower) * 0.8 : 0;
    const blockScore = Math.max(blockNameScore, blockDescScore);
    if (blockScore > 0.3) {
      results.push({
        type: "block",
        category: block.category,
        block: block.slug,
        blockName: block.name,
        variantCount: block.variantCount,
        relevance: blockScore
      });
    }
    if (includeVariants && block.variants) {
      for (const variant of block.variants) {
        const variantScore = calculateSimilarity(variant.name, queryLower);
        const combinedScore = blockScore > 0.5 ? variantScore * 0.7 + blockScore * 0.3 : variantScore;
        if (combinedScore > 0.3) {
          results.push({
            type: "variant",
            category: block.category,
            block: block.slug,
            blockName: block.name,
            variant: variant.slug,
            variantName: variant.name,
            relevance: combinedScore
          });
        }
      }
    }
  }
  return results.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
}
var CONTEXT_KEYWORDS = {
  "landing page": { context: "marketing", blocks: ["heroes", "cta-sections", "features", "pricing", "testimonials", "footers"] },
  saas: { context: "marketing", blocks: ["heroes", "pricing", "features", "testimonials", "cta-sections"] },
  portfolio: { context: "marketing", blocks: ["heroes", "portfolios", "contact-sections", "footers"] },
  dashboard: { context: "application-ui", blocks: ["sidebars", "stacked-layouts", "stats", "tables", "lists"] },
  admin: { context: "application-ui", blocks: ["sidebars", "tables", "forms", "stats", "overlays"] },
  settings: { context: "application-ui", blocks: ["form-layouts", "headings", "vertical-navigation", "description-lists"] },
  store: { context: "ecommerce", blocks: ["product-overviews", "product-lists", "shopping-carts", "category-filters"] },
  checkout: { context: "ecommerce", blocks: ["checkout-forms", "order-summaries", "shopping-carts"] },
  product: { context: "ecommerce", blocks: ["product-overviews", "product-quickviews", "product-features", "reviews"] },
  blog: { context: "marketing", blocks: ["blog-sections", "headers", "footers"] },
  auth: { context: "application-ui", blocks: ["sign-in-and-registration", "forms"] },
  login: { context: "application-ui", blocks: ["sign-in-and-registration"] },
  modal: { context: "application-ui", blocks: ["modal-dialogs", "overlays", "notifications"] },
  form: { context: "application-ui", blocks: ["form-layouts", "forms", "input-groups", "select-menus"] },
  table: { context: "application-ui", blocks: ["tables", "lists", "grid-lists"] },
  navigation: { context: "application-ui", blocks: ["navbars", "sidebars", "vertical-navigation", "tabs"] }
};
function suggest(building, catalogManager, alreadyUsed = []) {
  const buildingLower = building.toLowerCase();
  const results = [];
  const usedSet = new Set(alreadyUsed.map((s) => s.toLowerCase()));
  const matchedKeywords = [];
  for (const [keyword, data] of Object.entries(CONTEXT_KEYWORDS)) {
    const score = calculateSimilarity(buildingLower, keyword);
    if (score > 0.4) {
      matchedKeywords.push({ keyword, score, data });
    }
  }
  matchedKeywords.sort((a, b) => b.score - a.score);
  const suggestedBlocks = new Set;
  for (const { data } of matchedKeywords) {
    for (const blockSlug of data.blocks) {
      if (!usedSet.has(blockSlug) && !suggestedBlocks.has(blockSlug)) {
        suggestedBlocks.add(blockSlug);
        const blocks = catalogManager.getBlocks(data.context);
        const block = blocks.find((b) => b.slug === blockSlug);
        if (block) {
          const recommendedVariants = block.variants?.slice(0, 2).map((v) => v.slug) || [];
          results.push({
            category: block.category,
            block: block.slug,
            blockName: block.name,
            reason: getSuggestionReason(block, buildingLower),
            recommendedVariants
          });
        }
      }
    }
  }
  if (matchedKeywords.length === 0) {
    const searchResults = search(building, catalogManager, { limit: 5, includeVariants: false });
    for (const result of searchResults) {
      if (result.type === "block" && result.block && !usedSet.has(result.block)) {
        const block = catalogManager.getBlocks().find((b) => b.slug === result.block && b.category === result.category);
        if (block) {
          results.push({
            category: block.category,
            block: block.slug,
            blockName: block.name,
            reason: `Matches your search for "${building}"`,
            recommendedVariants: block.variants?.slice(0, 2).map((v) => v.slug) || []
          });
        }
      }
    }
  }
  return results.slice(0, 6);
}
function getSuggestionReason(block, building) {
  const reasons = {
    heroes: "Eye-catching hero section to grab attention",
    "cta-sections": "Drive conversions with a call-to-action",
    pricing: "Display your pricing plans clearly",
    testimonials: "Add social proof to build trust",
    features: "Showcase your product features",
    footers: "Professional footer with links and info",
    sidebars: "Navigation sidebar for your dashboard",
    tables: "Display data in organized tables",
    forms: "Collect user input with styled forms",
    "shopping-carts": "Shopping cart for your store",
    "product-overviews": "Showcase your products",
    "checkout-forms": "Streamline the checkout process",
    "sign-in-and-registration": "User authentication forms",
    "modal-dialogs": "Overlay dialogs for actions and confirmations",
    navbars: "Top navigation for your site",
    stats: "Display key metrics and statistics"
  };
  return reasons[block.slug] || `${block.name} components for your ${building}`;
}

// src/server.ts
var catalogManager = new CatalogManager;
var cacheManager = new CacheManager;
function createVariantFetcher() {
  return new VariantFetcher(getBrowser, setupPage);
}
function createMcpServer() {
  const server = new McpServer({ name: "mcp-for-tailwind", version: "0.1.0" }, { capabilities: { tools: {} } });
  server.registerTool("list_categories", {
    title: "List Categories",
    description: `List all top-level Tailwind Plus UI categories.

CATEGORIES:
- marketing: Landing pages, hero sections, pricing (~32 blocks)
- application-ui: Dashboards, forms, tables, modals (~45 blocks)
- ecommerce: Products, carts, checkout (~18 blocks)

Each category contains multiple blocks, and each block has multiple variants.`,
    inputSchema: {}
  }, async () => {
    const categories = catalogManager.getCategoryInfo();
    if (categories.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "CATALOG_EMPTY",
              message: "No catalog found. Run sync-catalog first."
            }, null, 2)
          }
        ],
        isError: true
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ categories }, null, 2)
        }
      ]
    };
  });
  server.registerTool("list_blocks", {
    title: "List Blocks",
    description: `List all blocks in a category with variant counts.

EXAMPLES:
- category="marketing" → Heroes, Testimonials, Pricing, CTAs...
- category="application-ui", subcategory="forms" → Form layouts, Sign-in...

Returns block names, slugs, descriptions, and variant counts.`,
    inputSchema: {
      category: z.enum(["marketing", "application-ui", "ecommerce"]).describe("Category to list blocks for"),
      subcategory: z.string().optional().describe("Filter by subcategory (e.g., 'sections', 'forms')")
    }
  }, async ({ category, subcategory }) => {
    const blocks = catalogManager.getBlocks(category, subcategory);
    if (blocks.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "NO_BLOCKS",
              message: subcategory ? `No blocks found in ${category}/${subcategory}. Try without subcategory filter.` : `No blocks found in ${category}. Run sync-catalog first.`
            }, null, 2)
          }
        ],
        isError: true
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
        description: b.description
      }))
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  });
  server.registerTool("list_variants", {
    title: "List Variants",
    description: `List all variants for a specific block.

EXAMPLE:
- category="marketing", block="testimonials"
- Returns: Simple centered, With large avatar, Grid, etc.

Use these variant slugs with get_variant to fetch code.`,
    inputSchema: {
      category: z.enum(["marketing", "application-ui", "ecommerce"]).describe("Category containing the block"),
      block: z.string().describe("Block slug (e.g., 'testimonials', 'heroes')")
    }
  }, async ({ category, block: blockSlug }) => {
    const blocks = catalogManager.getBlocks(category);
    const block = blocks.find((b) => b.slug === blockSlug);
    if (!block) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "BLOCK_NOT_FOUND",
              message: `Block '${blockSlug}' not found in ${category}. Use list_blocks to see available blocks.`,
              availableBlocks: blocks.slice(0, 10).map((b) => b.slug)
            }, null, 2)
          }
        ],
        isError: true
      };
    }
    const result = {
      block: {
        name: block.name,
        slug: block.slug,
        category: block.category,
        subcategory: block.subcategory,
        description: block.description
      },
      variantCount: block.variants.length,
      variants: block.variants.map((v) => ({
        index: v.index,
        name: v.name,
        slug: v.slug
      }))
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  });
  server.registerTool("get_variant", {
    title: "Get Variant Code",
    description: `Fetch the full source code for a specific variant.

AUTHENTICATION: Requires valid Tailwind Plus subscription.
Run: bun run src/index.ts login

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
      theme: z.enum(["light", "dark"]).optional().default("light")
    }
  }, async ({ category, block: blockSlug, variant: variantSlug, format = "react", version = "v4.1", theme = "light" }) => {
    const authState = checkAuthState();
    if (!authState.isAuthenticated) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "AUTH_REQUIRED",
              message: "Not authenticated. Run: bun run src/index.ts login",
              cookiesExist: authState.cookiesExist,
              cookiesExpired: authState.cookiesExpired
            }, null, 2)
          }
        ],
        isError: true
      };
    }
    const cached = await cacheManager.getVariant(category, blockSlug, variantSlug, format, theme, version);
    if (cached) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              block: cached.blockSlug,
              variant: cached.variantSlug,
              variantName: cached.variantName,
              format: cached.format,
              version: cached.version,
              theme: cached.theme,
              code: cached.code,
              dependencies: cached.dependencies,
              cached: true,
              cachedAt: cached.cachedAt
            }, null, 2)
          }
        ]
      };
    }
    const blocks = catalogManager.getBlocks(category);
    const block = blocks.find((b) => b.slug === blockSlug);
    if (!block) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "BLOCK_NOT_FOUND",
              message: `Block '${blockSlug}' not found. Use list_blocks first.`
            }, null, 2)
          }
        ],
        isError: true
      };
    }
    const variant = block.variants.find((v) => v.slug === variantSlug);
    if (!variant) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "VARIANT_NOT_FOUND",
              message: `Variant '${variantSlug}' not found in ${blockSlug}. Use list_variants first.`,
              availableVariants: block.variants.map((v) => v.slug)
            }, null, 2)
          }
        ],
        isError: true
      };
    }
    try {
      const fetcher = createVariantFetcher();
      const code = await fetcher.fetchVariantCode(category, block.subcategory, blockSlug, variant.index, format, version, theme);
      await cacheManager.setVariant(code);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              block: code.blockSlug,
              variant: code.variantSlug,
              variantName: code.variantName,
              format: code.format,
              version: code.version,
              theme: code.theme,
              code: code.code,
              dependencies: code.dependencies,
              cached: false
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text", text: JSON.stringify({ error: message }, null, 2) }],
        isError: true
      };
    }
  });
  server.registerTool("search", {
    title: "Search Components",
    description: `Search across all blocks and variants.

EXAMPLES:
- "testimonial grid" → Grid testimonial variant
- "pricing table" → Pricing blocks and variants
- "modal dialog" → Modal and dialog components

Returns ranked results by relevance.`,
    inputSchema: {
      query: z.string().describe("Search term"),
      category: z.enum(["marketing", "application-ui", "ecommerce"]).optional().describe("Limit to category"),
      limit: z.number().optional().default(10).describe("Max results")
    }
  }, async ({ query, category, limit = 10 }) => {
    const results = search(query, catalogManager, {
      category,
      limit,
      includeVariants: true
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            query,
            category: category || "all",
            resultCount: results.length,
            results
          }, null, 2)
        }
      ]
    };
  });
  server.registerTool("suggest", {
    title: "Suggest Components",
    description: `Get context-aware suggestions based on what you're building.

EXAMPLES:
- "SaaS landing page" → Heroes, pricing, testimonials, CTAs
- "admin dashboard" → Sidebars, tables, stats, forms
- "ecommerce store" → Products, carts, checkout

Helps find complementary components.`,
    inputSchema: {
      building: z.string().describe("What you're building"),
      alreadyUsed: z.array(z.string()).optional().default([]).describe("Block slugs to exclude")
    }
  }, async ({ building, alreadyUsed = [] }) => {
    const suggestions = suggest(building, catalogManager, alreadyUsed);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            building,
            excludedCount: alreadyUsed.length,
            suggestionCount: suggestions.length,
            suggestions
          }, null, 2)
        }
      ]
    };
  });
  return server;
}
var app = new Hono;
app.all("/mcp", async (c) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPTransport;
  await server.connect(transport);
  return transport.handleRequest(c);
});
app.get("/health", (c) => {
  const authState = checkAuthState();
  const stats = cacheManager.getVariantStats();
  return c.json({
    status: "ok",
    server: "mcp-for-tailwind",
    version: "0.1.0",
    authenticated: authState.isAuthenticated,
    cache: {
      totalVariants: stats.totalVariants,
      totalSize: stats.totalSize
    }
  });
});
app.get("/", (c) => {
  return c.json({
    name: "mcp-for-tailwind",
    version: "0.1.0",
    description: "MCP server for Tailwind Plus UI components with variant-level access",
    endpoints: {
      mcp: "/mcp",
      health: "/health"
    },
    tools: [
      "list_categories",
      "list_blocks",
      "list_variants",
      "get_variant",
      "search",
      "suggest"
    ]
  });
});
async function startServer(port = 3000) {
  const { serve } = await import("@hono/node-server");
  console.log(`mcp-for-tailwind v0.1.0`);
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
    port
  });
}
async function startStdioServer() {
  const server = createMcpServer();
  const transport = new StdioServerTransport;
  await server.connect(transport);
}

// src/index.ts
var args = process.argv.slice(2);
var command = args[0];
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
function parseArgs() {
  const result = {};
  for (const arg of args.slice(1)) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      if (key)
        result[key] = value || "true";
    } else if (!arg.startsWith("-")) {
      result._query = arg;
    }
  }
  return result;
}
async function main() {
  const opts = parseArgs();
  const catalogManager2 = new CatalogManager;
  const cacheManager2 = new CacheManager;
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
      const enhancedStats = catalogManager2.getEnhancedStats();
      const cacheStats = cacheManager2.getVariantStats();
      const lastUpdated = catalogManager2.getEnhancedLastUpdated();
      console.log(`
=== Tailwind Plus MCP Status ===
`);
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
      console.log(`
Catalog:`);
      if (enhancedStats) {
        const ageHours = lastUpdated ? Math.round((Date.now() - lastUpdated) / 3600000) : 0;
        console.log("  Status: Available (v3.0)");
        console.log(`  Blocks: ${enhancedStats.totalBlocks}`);
        console.log(`  Variants: ${enhancedStats.totalVariants}`);
        console.log(`  Age: ${ageHours} hours`);
        console.log(`  Needs refresh: ${catalogManager2.enhancedNeedsRefresh() ? "Yes" : "No"}`);
      } else {
        console.log("  Status: Not synced");
        console.log("  Action: Run 'sync-catalog' to build");
      }
      console.log(`
Cache:`);
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
      const categories = catalogManager2.getCategoryInfo();
      if (categories.length === 0) {
        console.error("No catalog found. Run 'sync-catalog' first.");
        process.exit(1);
      }
      console.log(`
=== Categories ===
`);
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
      const category = opts.category;
      if (!category) {
        console.error("Error: --category is required");
        console.error("Usage: list-blocks --category=marketing");
        process.exit(1);
      }
      const blocks = catalogManager2.getBlocks(category, opts.subcategory);
      if (blocks.length === 0) {
        console.error(`No blocks found in ${category}. Run 'sync-catalog' first.`);
        process.exit(1);
      }
      console.log(`
=== Blocks in ${category} ===
`);
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
      const category = opts.category;
      const blockSlug = opts.block;
      if (!category || !blockSlug) {
        console.error("Error: --category and --block are required");
        console.error("Usage: list-variants --category=marketing --block=testimonials");
        process.exit(1);
      }
      const blocks = catalogManager2.getBlocks(category);
      const block = blocks.find((b) => b.slug === blockSlug);
      if (!block) {
        console.error(`Block '${blockSlug}' not found in ${category}.`);
        console.error(`Available: ${blocks.slice(0, 5).map((b) => b.slug).join(", ")}...`);
        process.exit(1);
      }
      console.log(`
=== Variants for ${block.name} ===
`);
      for (const variant of block.variants) {
        console.log(`[${variant.index}] ${variant.name} (${variant.slug})`);
      }
      console.log("");
      process.exit(0);
      break;
    }
    case "get-variant": {
      const category = opts.category;
      const blockSlug = opts.block;
      const variantSlug = opts.variant;
      const format = opts.format || "react";
      const version = opts.version || "v4.1";
      const theme = opts.theme || "light";
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
      const cached = await cacheManager2.getVariant(category, blockSlug, variantSlug, format, theme, version);
      if (cached) {
        console.log(`
=== ${cached.variantName} (cached) ===
`);
        console.log(`Format: ${format}, Version: ${version}, Theme: ${theme}`);
        console.log(`Dependencies: ${cached.dependencies.join(", ") || "none"}`);
        console.log(`
--- Code ---
`);
        console.log(cached.code);
        process.exit(0);
      }
      const blocks = catalogManager2.getBlocks(category);
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
      console.log(`
Fetching ${variant.name}...`);
      try {
        const fetcher = new VariantFetcher(getBrowser, setupPage);
        const code = await fetcher.fetchVariantCode(category, block.subcategory, blockSlug, variant.index, format, version, theme);
        await cacheManager2.setVariant(code);
        console.log(`
=== ${code.variantName} ===
`);
        console.log(`Format: ${format}, Version: ${version}, Theme: ${theme}`);
        console.log(`Dependencies: ${code.dependencies.join(", ") || "none"}`);
        console.log(`
--- Code ---
`);
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
        console.error('Usage: search "pricing table"');
        process.exit(1);
      }
      const results = search(query, catalogManager2, {
        category: opts.category,
        limit: 10,
        includeVariants: true
      });
      if (results.length === 0) {
        console.log(`No results found for "${query}"`);
        process.exit(0);
      }
      console.log(`
=== Search Results for "${query}" ===
`);
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
      const category = opts.category;
      const blockSlug = opts.block;
      const forceSync = opts.force === "true";
      const metadataOnly = opts["metadata-only"] === "true";
      const verbose = opts.verbose === "true";
      const formats = metadataOnly ? [] : ["react", "vue", "html"];
      const versions = metadataOnly ? [] : ["v4.1", "v3.4"];
      const theme = "light";
      const BROWSER_RECYCLE_INTERVAL = TIMING.browserRecycleInterval;
      console.log(`
=== Syncing Catalog (Optimized) ===
`);
      if (forceSync) {
        console.log(`Force mode: re-syncing all blocks
`);
      }
      if (metadataOnly) {
        console.log(`Metadata-only mode: skipping code download
`);
      }
      if (verbose) {
        console.log(`Verbose mode: showing detailed progress
`);
      }
      if (blockSlug && category) {
        console.log(`Syncing ${category}/${blockSlug}...`);
        const existingBlocks = catalogManager2.getBlocks(category);
        const existingBlock = existingBlocks.find((b) => b.slug === blockSlug);
        if (!existingBlock) {
          console.error(`Block '${blockSlug}' not found. Run full sync first.`);
          process.exit(1);
        }
        const variantFetcher = new VariantFetcher(getBrowser, setupPage);
        const { block, codes } = await variantFetcher.fetchBlockComplete(category, existingBlock.subcategory, blockSlug, formats, versions, theme, (variant, format, version) => {
          process.stdout.write(`\r  ${variant} (${format}, ${version})...`);
        });
        catalogManager2.setBlock(block);
        for (const code of codes) {
          await cacheManager2.setVariant(code);
        }
        console.log(`\r  ${block.variantCount} variants, ${codes.length} code files                    `);
      } else {
        console.log("Phase 1: Loading block index from https://tailwindcss.com/plus/ui-blocks...");
        const allBlocks = await fetchBlockIndex();
        console.log(`Found ${allBlocks.length} blocks across all categories
`);
        const blocksToSync = category ? allBlocks.filter((b) => b.category === category) : allBlocks;
        console.log(`Phase 2: Syncing ${blocksToSync.length} blocks${category ? ` (${category})` : ""}...
`);
        const variantFetcher = new VariantFetcher(getBrowser, setupPage);
        let totalBlocks = 0;
        let totalVariants = 0;
        let totalCodes = 0;
        let skippedBlocks = 0;
        let processedSinceRecycle = 0;
        for (let i = 0;i < blocksToSync.length; i++) {
          const entry = blocksToSync[i];
          if (processedSinceRecycle >= BROWSER_RECYCLE_INTERVAL) {
            console.log(`
  [Memory cleanup] Recycling browser after ${processedSinceRecycle} blocks...`);
            await closeBrowser();
            await new Promise((r) => setTimeout(r, TIMING.browserRecyclePauseMs));
            processedSinceRecycle = 0;
            if (verbose) {
              console.log(`  [Memory cleanup] Browser recycled, continuing...
`);
            }
          }
          if (!forceSync) {
            const existingBlock = catalogManager2.getBlock(entry.category, entry.subcategory, entry.slug);
            if (existingBlock && existingBlock.variants && existingBlock.variants.length > 0) {
              let allCodeCached = true;
              if (!metadataOnly) {
                for (const v of existingBlock.variants) {
                  for (const format of ["react", "vue", "html"]) {
                    for (const version of ["v4.1", "v3.4"]) {
                      if (!cacheManager2.hasVariant(entry.category, entry.slug, v.slug, format, theme, version)) {
                        allCodeCached = false;
                        break;
                      }
                    }
                    if (!allCodeCached)
                      break;
                  }
                  if (!allCodeCached)
                    break;
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
          const blockStartTime = Date.now();
          if (verbose) {
            console.log(`  [${i + 1}/${blocksToSync.length}] Starting ${entry.category}/${entry.subcategory}/${entry.slug}...`);
          }
          try {
            const { block, codes } = await variantFetcher.fetchBlockComplete(entry.category, entry.subcategory, entry.slug, formats, versions, theme, verbose ? (variant, format, version) => {
              console.log(`    → Fetching: ${variant} (${format}, ${version})`);
            } : (variant, format, version) => {
              process.stdout.write(`\r    ${variant} (${format}, ${version})...`);
            });
            catalogManager2.setBlock(block);
            for (const code of codes) {
              await cacheManager2.setVariant(code);
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
            if (block.variantCount === 0) {
              console.warn(`  ⚠️  WARNING: 0 variants found - possible rate limiting or page structure change`);
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : "";
            console.error(`  ${entry.slug}: Error - ${msg}`);
            if (verbose && stack) {
              console.error(`    Stack: ${stack.split(`
`).slice(0, 3).join(`
    `)}`);
            }
            if (msg.includes("AUTH_REQUIRED")) {
              console.error(`
Authentication expired. Run 'login' to refresh.`);
              break;
            }
            processedSinceRecycle++;
          }
        }
        console.log(`
=== Done ===`);
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
        const pruned = await cacheManager2.pruneExpired();
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
      const remote = opts.remote === "true" || command === "--remote";
      if (remote) {
        const portArg = args.find((a) => !a.startsWith("-") && a !== "serve");
        const port = parseInt(portArg || opts.port || process.env.PORT || "3000", 10);
        await startServer(port);
        process.on("SIGINT", async () => {
          console.log(`
Shutting down...`);
          await closeBrowser();
          process.exit(0);
        });
        process.on("SIGTERM", async () => {
          console.log(`
Shutting down...`);
          await closeBrowser();
          process.exit(0);
        });
      } else {
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
