import { join } from "node:path";
import { homedir } from "node:os";

// Directory paths
export const CONFIG_DIR = join(homedir(), ".tailwind-mcp");
export const COOKIES_PATH = join(CONFIG_DIR, "cookies.json");
export const CATALOG_PATH = join(CONFIG_DIR, "catalog.json");
export const ENHANCED_CATALOG_PATH = join(CONFIG_DIR, "catalog-v3.json");
export const CACHE_DIR = join(CONFIG_DIR, "cache");
export const CACHE_MANIFEST_PATH = join(CACHE_DIR, "manifest.json");

// Base URLs
export const BASE_URL = "https://tailwindcss.com/plus";
export const UI_BLOCKS_URL = `${BASE_URL}/ui-blocks`;

// Realistic Chrome user-agents (rotated randomly)
export const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
] as const;

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

// Rate limiting
export const RATE_LIMIT = {
  requestsPerMinute: 20,
  delayBetweenRequests: 3000, // ms - increased to avoid rate limiting
  backoffMultiplier: 2,       // multiply delay on rate limit detection
  maxDelay: 30000,            // max 30s between requests
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,  // ms
  maxDelay: 10000,  // ms
} as const;

// Timeouts
export const TIMEOUTS = {
  navigation: 30000, // ms
  selector: 10000,   // ms
} as const;

// Timing constants for browser interactions
export const TIMING = {
  browserRecycleInterval: 15,
  browserRecyclePauseMs: 5000,
  formatChangeDelayMs: 500,
  versionChangeDelayMs: 300,
  uiInteractionDelayMs: 200,
} as const;

// Cache TTL: 7 days
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Catalog refresh threshold: 24 hours
export const CATALOG_REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000;
