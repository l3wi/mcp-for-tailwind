import { join } from "node:path";
import { homedir } from "node:os";
import { BRAND } from "./brand.ts";

// Isolated data dir so this package never clashes with legacy mcp-for-tailwind
// (which uses ~/.tailwind-mcp). Cursor can keep using the broken install.
export const CONFIG_DIR = join(homedir(), ".tailwind-plus-mcp");
/** Legacy install path — used only to seed cookies/catalog on first run */
export const LEGACY_CONFIG_DIR = join(homedir(), ".tailwind-mcp");

export const COOKIES_PATH = join(CONFIG_DIR, "cookies.json");
export const LEGACY_COOKIES_PATH = join(LEGACY_CONFIG_DIR, "cookies.json");
export const CATALOG_PATH = join(CONFIG_DIR, "catalog.json");
export const ENHANCED_CATALOG_PATH = join(CONFIG_DIR, "catalog-v3.json");
export const PRODUCTS_CATALOG_PATH = join(CONFIG_DIR, "products.json");
export const CACHE_DIR = join(CONFIG_DIR, "cache");
export const CACHE_MANIFEST_PATH = join(CACHE_DIR, "manifest.json");

// Base URLs
export const BASE_URL = "https://tailwindcss.com/plus";
export const UI_BLOCKS_URL = `${BASE_URL}/ui-blocks`;
export const TEMPLATES_URL = `${BASE_URL}/templates`;
export const KITS_URL = `${BASE_URL}/kits`;
export const UI_KIT_URL = `${BASE_URL}/ui-kit`;
export const CATALYST_DOCS_URL = "https://catalyst.tailwindui.com/docs";
export const CHANGELOG_URL = `${BASE_URL}/changelog`;

// Realistic Chrome user-agents (kept current for 2026)
export const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
] as const;

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

// Rate limiting — polite defaults to avoid hammering Tailwind's site
export const RATE_LIMIT = {
  requestsPerMinute: 20,
  delayBetweenRequests: 3000,
  backoffMultiplier: 2,
  maxDelay: 30000,
} as const;

export const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
} as const;

export const TIMEOUTS = {
  navigation: 30000,
  selector: 10000,
} as const;

export const TIMING = {
  browserRecycleInterval: 15,
  browserRecyclePauseMs: 5000,
  formatChangeDelayMs: 500,
  versionChangeDelayMs: 400,
  uiInteractionDelayMs: 250,
  themeChangeDelayMs: 400,
} as const;

// Cache TTL: 7 days
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Catalog refresh threshold: 24 hours
export const CATALOG_REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** Default Tailwind CSS line for code fetch — maps to latest v4 picker option on the page */
export const DEFAULT_TAILWIND_VERSION = "v4" as const;
export const DEFAULT_THEME = "light" as const;
export const DEFAULT_FORMAT = "react" as const;

export const PACKAGE_VERSION = BRAND.version;
