// Context types for the three main UI-block product categories
export type Context = "marketing" | "application-ui" | "ecommerce";

// Format for code output
export type CodeFormat = "react" | "vue" | "html";

/**
 * Theme variants available on Tailwind Plus UI blocks (Aug 2025+).
 * - light: light-only snippet
 * - dark: dark-only snippet
 * - system: dual-mode snippet using dark: variants / prefers-color-scheme
 */
export type Theme = "light" | "dark" | "system";

/**
 * Tailwind CSS version selector for code snippets.
 * - "v4" selects the latest v4.x option on the page (currently up to v4.3 content)
 * - "v3.4" selects the legacy v3.4 option
 * Concrete labels (v4.0, v4.1, …) are also accepted when present in the picker.
 */
export type TailwindVersion = "v4" | "v3.4" | "v4.0" | "v4.1" | "v4.2" | "v4.3" | string;

// Component metadata stored in catalog
export interface ComponentMeta {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  context: Context;
  url: string;
  componentCount?: number;
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
  dependencies?: string[];
}

// Search result item
export interface SearchResult {
  id: string;
  name: string;
  category: string;
  context: Context;
  url: string;
  relevance: number;
}

// Suggestion result
export interface Suggestion {
  id: string;
  name: string;
  category: string;
  context: Context;
  reason: string;
}

// Cache manifest entry
export interface CacheEntry {
  id: string;
  format: CodeFormat;
  theme: Theme;
  version: TailwindVersion;
  cachedAt: number;
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
// Hierarchy Types (Category → Block → Variant)
// ============================================

export interface ComponentVariant {
  index: number;
  name: string;
  slug: string;
  componentId: string;
  previewUrl?: string;
}

export interface Block {
  name: string;
  slug: string;
  category: Context;
  subcategory: string;
  url: string;
  description?: string;
  variantCount: number;
  variants: ComponentVariant[];
  lastFetchedAt?: number;
}

export interface CategoryInfo {
  name: string;
  slug: Context;
  blockCount: number;
  subcategories: string[];
}

export interface VariantCode {
  category: Context;
  blockSlug: string;
  variantSlug: string;
  variantName: string;
  componentId: string;
  format: CodeFormat;
  version: TailwindVersion;
  /** Actual option label selected on the page (e.g. "v4.0") when known */
  resolvedVersion?: string;
  theme: Theme;
  code: string;
  dependencies: string[];
  /** Hint: HTML snippets may require Tailwind Plus Elements */
  notes?: string[];
  cachedAt: number;
}

export type SearchResultType = "category" | "block" | "variant" | "template" | "kit" | "catalyst";

export interface SearchResultItem {
  type: SearchResultType;
  category?: Context | "templates" | "kits" | "catalyst";
  block?: string;
  blockName?: string;
  variant?: string;
  variantName?: string;
  variantCount?: number;
  url?: string;
  relevance: number;
}

export interface SuggestionResult {
  category: Context;
  block: string;
  blockName: string;
  reason: string;
  recommendedVariants: string[];
}

// ============================================
// Dynamic Catalog & Fetching Types
// ============================================

export interface UIBlock {
  id: string;
  index: number;
  name: string;
  categorySlug: string;
  context: Context;
  previewUrl?: string;
  lastFetchedAt?: number;
}

export interface CatalogCategory extends Category {
  blocks: UIBlock[];
  lastFetchedAt: number;
  isComplete: boolean;
}

export interface Catalog {
  version: string;
  generatedAt: number;
  lastUpdatedAt: number;
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

export interface EnhancedCatalog {
  version: "3.0.0";
  generatedAt: number;
  lastUpdatedAt: number;
  blocks: Record<string, Block>;
  stats: {
    totalBlocks: number;
    totalVariants: number;
    totalCachedVariants: number;
  };
}

// ============================================
// Product surfaces beyond UI Blocks
// ============================================

export type ProductKind = "ui-blocks" | "template" | "kit" | "ui-kit";

export interface TemplateInfo {
  id: string;
  name: string;
  slug: string;
  kind: "template" | "kit";
  tagline: string;
  description: string;
  url: string;
  previewUrl?: string;
  stack: string[];
  priceNote: string;
}

export interface CatalystComponentInfo {
  id: string;
  name: string;
  slug: string;
  docsUrl: string;
  group: string;
  description?: string;
}

export interface ProductsCatalog {
  version: "1.0.0";
  generatedAt: number;
  lastUpdatedAt: number;
  templates: TemplateInfo[];
  catalyst: CatalystComponentInfo[];
  notes: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  cookiesExist: boolean;
  cookiesExpired: boolean;
  lastLoginAt?: number;
  /** Which config dir cookies were loaded from */
  source?: "current" | "legacy-seeded";
}

export interface FetchProgress {
  phase: "catalog" | "components" | "products";
  current: number;
  total: number;
  currentItem: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  error?: string;
}

export interface CacheEntryWithTTL extends CacheEntry {
  expiresAt: number;
  size: number;
}

export interface CacheManifestWithTTL {
  version: string;
  createdAt: number;
  entries: Record<string, CacheEntryWithTTL>;
  stats: {
    totalSize: number;
    entryCount: number;
  };
}
