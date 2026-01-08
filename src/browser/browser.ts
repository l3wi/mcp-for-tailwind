/**
 * Core browser utilities for Tailwind Plus.
 * Handles browser lifecycle, authentication, and page setup.
 */
import puppeteer, { Browser, Page } from "puppeteer-core";
import { install, resolveBuildId, detectBrowserPlatform, Browser as PuppeteerBrowser } from "@puppeteer/browsers";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import type { CookieData, AuthState } from "../types/index.ts";
import { CONFIG_DIR, COOKIES_PATH, CACHE_DIR, getRandomUserAgent } from "../config.ts";
import { AuthRequiredError, AuthExpiredError } from "../errors/index.ts";

// Cache directory for downloaded browser
const BROWSER_CACHE_DIR = join(CONFIG_DIR, "browsers");

// Cached Chrome path (to avoid repeated lookups)
let cachedChromePath: string | null = null;

/**
 * Find Chrome/Chromium executable on the system.
 * Checks common locations for macOS, Linux, and Windows.
 * Falls back to downloading Chromium if not found.
 */
async function findChrome(): Promise<string> {
  // Return cached path if available
  if (cachedChromePath && existsSync(cachedChromePath)) {
    return cachedChromePath;
  }

  // Allow override via environment variable
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    cachedChromePath = process.env.CHROME_PATH;
    return cachedChromePath;
  }

  const platform = process.platform;

  // Common Chrome/Chromium paths by platform
  const paths: string[] = [];

  if (platform === "darwin") {
    // macOS
    paths.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    );
  } else if (platform === "win32") {
    // Windows
    const programFiles = process.env["PROGRAMFILES"] || "C:\\Program Files";
    const programFilesX86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
    const localAppData = process.env["LOCALAPPDATA"] || "";

    paths.push(
      `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
      `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`,
      `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
      `${programFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${programFilesX86}\\Microsoft\\Edge\\Application\\msedge.exe`,
    );
  } else {
    // Linux
    paths.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium",
      "/usr/bin/brave-browser",
      "/usr/bin/microsoft-edge",
    );

    // Try which command
    try {
      const chromePath = execSync("which google-chrome || which chromium || which chromium-browser", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      if (chromePath && existsSync(chromePath)) {
        cachedChromePath = chromePath;
        return cachedChromePath;
      }
    } catch {
      // Ignore - will try paths below
    }
  }

  // Check each path
  for (const p of paths) {
    if (existsSync(p)) {
      cachedChromePath = p;
      return cachedChromePath;
    }
  }

  // No system Chrome found - download Chromium
  console.log("No Chrome/Chromium found on system. Downloading Chromium...");
  const chromePath = await downloadChromium();
  cachedChromePath = chromePath;
  return cachedChromePath;
}

/**
 * Download Chromium using @puppeteer/browsers.
 */
async function downloadChromium(): Promise<string> {
  const browserPlatform = detectBrowserPlatform();
  if (!browserPlatform) {
    throw new Error("Unable to detect browser platform for download");
  }

  // Ensure cache directory exists
  if (!existsSync(BROWSER_CACHE_DIR)) {
    mkdirSync(BROWSER_CACHE_DIR, { recursive: true });
  }

  // Get latest stable Chrome for Testing build ID
  const buildId = await resolveBuildId(PuppeteerBrowser.CHROME, browserPlatform, "stable");

  console.log(`Downloading Chrome ${buildId} for ${browserPlatform}...`);

  const result = await install({
    browser: PuppeteerBrowser.CHROME,
    buildId,
    cacheDir: BROWSER_CACHE_DIR,
    downloadProgressCallback: (downloadedBytes, totalBytes) => {
      const percent = Math.round((downloadedBytes / totalBytes) * 100);
      process.stdout.write(`\rDownloading Chrome... ${percent}%`);
    },
  });

  console.log("\nChrome downloaded successfully.");
  return result.executablePath;
}

// Ensure directories exist
if (!existsSync(CONFIG_DIR)) {
  mkdirSync(CONFIG_DIR, { recursive: true });
}
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

// Shared browser instance (reused across requests)
let browser: Browser | null = null;

/**
 * Get or create the shared browser instance.
 */
export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.connected) {
    const executablePath = await findChrome();
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
  }
  return browser;
}

/**
 * Close the shared browser instance.
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Load saved authentication cookies.
 */
export function loadCookies(): CookieData | null {
  try {
    if (existsSync(COOKIES_PATH)) {
      const data = readFileSync(COOKIES_PATH, "utf-8");
      return JSON.parse(data) as CookieData;
    }
  } catch {
    // Ignore errors - treat as no cookies
  }
  return null;
}

/**
 * Save authentication cookies.
 * Accepts Puppeteer's Cookie type and normalizes it.
 */
export function saveCookies(cookies: Array<{
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
}>): void {
  // Normalize cookies to our CookieData format
  const normalizedCookies: CookieData["cookies"] = cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain || "",
    path: c.path || "/",
    expires: c.expires || -1,
    httpOnly: c.httpOnly || false,
    secure: c.secure || false,
  }));

  const data: CookieData = {
    cookies: normalizedCookies,
    savedAt: Date.now(),
  };
  writeFileSync(COOKIES_PATH, JSON.stringify(data, null, 2));
  chmodSync(COOKIES_PATH, 0o600);
}

/**
 * Check authentication state.
 */
export function checkAuthState(): AuthState {
  const cookieData = loadCookies();

  if (!cookieData) {
    return {
      isAuthenticated: false,
      cookiesExist: false,
      cookiesExpired: false,
    };
  }

  // Check if any cookies are expired
  const now = Date.now() / 1000;
  const hasValidCookies = cookieData.cookies.some(
    (c) => c.expires > now || c.expires === -1
  );

  return {
    isAuthenticated: hasValidCookies,
    cookiesExist: true,
    cookiesExpired: !hasValidCookies,
    lastLoginAt: cookieData.savedAt,
  };
}

/**
 * Set up a page with authentication cookies and user-agent.
 */
export async function setupPage(page: Page): Promise<boolean> {
  // Set realistic user-agent
  await page.setUserAgent(getRandomUserAgent());

  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 });

  // Load and set cookies
  const cookieData = loadCookies();
  if (cookieData?.cookies) {
    await page.setCookie(...cookieData.cookies);
    return true;
  }
  return false;
}

/**
 * Interactive login flow - opens a visible browser for manual login.
 */
export async function login(): Promise<void> {
  console.log("Starting interactive login to Tailwind Plus...");
  console.log("");

  const executablePath = await findChrome();
  const loginBrowser = await puppeteer.launch({
    executablePath,
    headless: false, // Show browser for login
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await loginBrowser.newPage();
  await page.setUserAgent(getRandomUserAgent());

  try {
    await page.goto("https://tailwindcss.com/plus/login", {
      waitUntil: "networkidle2",
    });

    console.log("Please log in to Tailwind Plus in the browser window.");
    console.log("The browser will close automatically after successful login.");
    console.log("");

    // Wait for redirect to dashboard or components page (5 minute timeout)
    await page.waitForFunction(
      () => {
        const url = window.location.href;
        return (
          url.includes("/plus/ui-blocks") ||
          url.includes("/plus/templates") ||
          url.includes("/plus/ui-kit") ||
          (url.includes("/plus") && !url.includes("/login"))
        );
      },
      { timeout: 300000 }
    );

    console.log("Login successful! Saving cookies...");

    // Save cookies
    const cookies = await page.cookies();
    saveCookies(cookies);

    console.log(`Cookies saved to ${COOKIES_PATH}`);
  } finally {
    await loginBrowser.close();
  }
}

/**
 * Clear cached components.
 * @param expiredOnly - If true, only clear expired entries (requires cache-manager)
 */
export function clearCache(expiredOnly = false): number {
  if (expiredOnly) {
    // For expired-only clearing, use CacheManager
    // This is a simple implementation that clears all
    console.log("Note: Use CacheManager.pruneExpired() for expired-only clearing");
  }

  const files = readdirSync(CACHE_DIR);
  let cleared = 0;

  for (const file of files) {
    try {
      unlinkSync(join(CACHE_DIR, file));
      cleared++;
    } catch {
      // Ignore errors
    }
  }

  console.log(`Cleared ${cleared} cached items`);
  return cleared;
}

/**
 * Block index entry from the master index page.
 */
export interface BlockIndexEntry {
  name: string;           // "Hero Sections"
  slug: string;           // "heroes" (parsed from URL)
  category: "marketing" | "application-ui" | "ecommerce";
  subcategory: string;    // "sections"
  componentCount: number; // 12
  url: string;            // Full URL
}

/**
 * Fetch the master index page to get ALL block URLs in one request.
 * This is the most efficient way to discover all blocks across all categories.
 */
export async function fetchBlockIndex(): Promise<BlockIndexEntry[]> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(getRandomUserAgent());
    await page.setViewport({ width: 1920, height: 1080 });

    // Set cookies for authentication
    const hasCookies = await setupPage(page);
    if (!hasCookies) {
      throw new AuthRequiredError("No cookies found. Run 'login' first.");
    }

    console.log("Loading block index from https://tailwindcss.com/plus/ui-blocks...");

    await page.goto("https://tailwindcss.com/plus/ui-blocks", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Check if redirected to login
    if (page.url().includes("/login")) {
      throw new AuthExpiredError();
    }

    // Find all block links from the page
    const blocks = await page.evaluate(() => {
      const results: Array<{
        name: string;
        slug: string;
        category: "marketing" | "application-ui" | "ecommerce";
        subcategory: string;
        componentCount: number;
        url: string;
      }> = [];

      let currentCategory: "marketing" | "application-ui" | "ecommerce" | null = null;

      // Get all elements in order within main content
      const main = document.querySelector("main");
      if (!main) return results;

      // Walk through the DOM to track category context
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT);
      let node: Node | null = walker.currentNode;

      while (node) {
        const el = node as Element;

        // Check for category headings (h2)
        if (el.tagName === "H2") {
          const text = el.textContent?.trim().toLowerCase() || "";
          if (text === "marketing") currentCategory = "marketing";
          else if (text === "application ui") currentCategory = "application-ui";
          else if (text === "ecommerce") currentCategory = "ecommerce";
        }

        // Check for block links
        if (el.tagName === "A" && currentCategory) {
          const href = el.getAttribute("href") || "";
          if (href.includes("/ui-blocks/") && href.includes(currentCategory)) {
            // Get info from the link
            const textContent = el.textContent || "";
            const nameMatch = textContent.match(/^(.+?)(\d+\s+(?:components?|examples?))/);
            const countMatch = textContent.match(/(\d+)\s+(?:components?|examples?)/);

            if (nameMatch && countMatch) {
              const name = nameMatch[1].trim();
              const count = parseInt(countMatch[1], 10);

              // Parse slug and subcategory from URL
              // URL format: /plus/ui-blocks/{category}/{subcategory}/{slug}
              const urlParts = href.split("/").filter(Boolean);
              const slug = urlParts[urlParts.length - 1] || "";
              const subcategory = urlParts[urlParts.length - 2] || "";

              // Avoid duplicates
              if (!results.some((r) => r.slug === slug && r.category === currentCategory)) {
                results.push({
                  name,
                  slug,
                  category: currentCategory,
                  subcategory,
                  componentCount: count,
                  url: href.startsWith("http") ? href : `https://tailwindcss.com${href}`,
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
