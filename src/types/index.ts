// Context types for the three main product categories
export type Context = "marketing" | "application-ui" | "ecommerce";

// Format for code output
export type CodeFormat = "react" | "vue" | "html";

// Theme variants
export type Theme = "light" | "dark";

// Tailwind CSS version
export type TailwindVersion = "v4.1" | "v3.4";

// Component metadata stored in catalog
export interface ComponentMeta {
  id: string; // Unique slug like "marketing/sections/heroes/simple-centered"
  name: string; // Display name like "Simple centered"
  category: string; // Category like "Hero Sections"
  subcategory?: string; // Subcategory like "PAGE SECTIONS"
  context: Context;
  url: string; // Full URL to component page
  componentCount?: number; // Number of variants (for category-level entries)
}

// Category with its components
export interface Category {
  name: string;
  slug: string;
  subcategory?: string;
  context: Context;
  componentCount: number;
  url: string;
}

// Full component data with code
export interface Component extends ComponentMeta {
  code: string;
  format: CodeFormat;
  theme: Theme;
  version: TailwindVersion;
  dependencies?: string[]; // npm packages needed
}

// Search result item
export interface SearchResult {
  id: string;
  name: string;
  category: string;
  context: Context;
  url: string;
  relevance: number; // 0-1 score
}

// Suggestion result
export interface Suggestion {
  id: string;
  name: string;
  category: string;
  context: Context;
  reason: string; // Why this component is suggested
}

// Cache manifest entry
export interface CacheEntry {
  id: string;
  format: CodeFormat;
  theme: Theme;
  version: TailwindVersion;
  cachedAt: number; // Unix timestamp
  filePath: string;
}

// Cache manifest
export interface CacheManifest {
  version: string;
  entries: Record<string, CacheEntry>;
}

// Cookie data for auth
export interface CookieData {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
  }>;
  savedAt: number;
}

// ============================================
// NEW: Hierarchy Types (Category → Block → Variant)
// ============================================

// Individual component variant within a block
export interface ComponentVariant {
  index: number;           // 0-based index within block
  name: string;            // Display name: "Simple centered"
  slug: string;            // Kebab-case: "simple-centered"
  componentId: string;     // Hash: "component-fd7b8bd425f42f6504b22e1ecc6b43c9"
  previewUrl?: string;     // URL to preview iframe
}

// Block containing multiple variants (e.g., Testimonials, Hero Sections)
export interface Block {
  name: string;            // "Testimonials"
  slug: string;            // "testimonials"
  category: Context;       // "marketing"
  subcategory: string;     // "sections"
  url: string;             // Full URL to block page
  description?: string;    // From page description
  variantCount: number;
  variants: ComponentVariant[];
  lastFetchedAt?: number;
}

// Category info for list_categories
export interface CategoryInfo {
  name: string;            // "Marketing"
  slug: Context;           // "marketing"
  blockCount: number;
  subcategories: string[];
}

// Variant code with all metadata
export interface VariantCode {
  category: Context;
  blockSlug: string;
  variantSlug: string;
  variantName: string;
  componentId: string;
  format: CodeFormat;
  version: TailwindVersion;
  theme: Theme;
  code: string;
  dependencies: string[];
  cachedAt: number;
}

// Search result types
export type SearchResultType = "category" | "block" | "variant";

export interface SearchResultItem {
  type: SearchResultType;
  category: Context;
  block?: string;
  blockName?: string;
  variant?: string;
  variantName?: string;
  variantCount?: number;
  relevance: number;
}

// Suggestion result
export interface SuggestionResult {
  category: Context;
  block: string;
  blockName: string;
  reason: string;
  recommendedVariants: string[];
}

// ============================================
// Dynamic Catalog & Fetching Types
// Used by CatalogFetcher and CatalogManager
// ============================================

// Individual UI block (component variant within a category)
export interface UIBlock {
  id: string;              // e.g., "marketing/sections/heroes/0"
  index: number;           // 0-based index within category
  name: string;            // Display name from page
  categorySlug: string;    // e.g., "sections/heroes"
  context: Context;
  previewUrl?: string;        // Preview image URL if available
  lastFetchedAt?: number;     // When metadata was last fetched
}

// Enhanced category with discovered blocks
export interface CatalogCategory extends Category {
  blocks: UIBlock[];       // Individual components discovered
  lastFetchedAt: number;   // Timestamp of last fetch
  isComplete: boolean;     // Whether all blocks discovered
}

// Full catalog structure (saved to disk)
export interface Catalog {
  version: string;         // Schema version
  generatedAt: number;     // When catalog was generated
  lastUpdatedAt: number;   // Last modification time
  contexts: {
    marketing: CatalogCategory[];
    "application-ui": CatalogCategory[];
    ecommerce: CatalogCategory[];
  };
  stats: {
    totalCategories: number;
    totalBlocks: number;
    totalCachedComponents: number;
  };
}

// ============================================
// NEW: Enhanced Catalog v3 with Variants
// ============================================

export interface EnhancedCatalog {
  version: "3.0.0";
  generatedAt: number;
  lastUpdatedAt: number;
  blocks: Record<string, Block>;  // Keyed by "{category}/{subcategory}/{slug}"
  stats: {
    totalBlocks: number;
    totalVariants: number;
    totalCachedVariants: number;
  };
}

// Auth state result
export interface AuthState {
  isAuthenticated: boolean;
  cookiesExist: boolean;
  cookiesExpired: boolean;
  lastLoginAt?: number;
}

// Fetch progress event
export interface FetchProgress {
  phase: "catalog" | "components";
  current: number;
  total: number;
  currentItem: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  error?: string;
}

// Enhanced cache entry with TTL
export interface CacheEntryWithTTL extends CacheEntry {
  expiresAt: number;       // TTL expiration timestamp
  size: number;            // File size in bytes
}

// Enhanced cache manifest
export interface CacheManifestWithTTL {
  version: string;
  createdAt: number;
  entries: Record<string, CacheEntryWithTTL>;
  stats: {
    totalSize: number;
    entryCount: number;
  };
}
