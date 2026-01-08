import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import type {
  Catalog,
  CatalogCategory,
  Context,
  EnhancedCatalog,
  Block,
  ComponentVariant,
  CategoryInfo,
} from "../types/index.ts";
import {
  CATALOG_PATH,
  ENHANCED_CATALOG_PATH,
  CATALOG_REFRESH_THRESHOLD_MS,
  CONFIG_DIR,
} from "../config.ts";
import { generateBlockKey } from "../utils/slug.ts";

export class CatalogManager {
  private catalog: Catalog | null = null;
  private enhancedCatalog: EnhancedCatalog | null = null;

  constructor() {
    this.ensureDir();
  }

  /**
   * Load catalog from disk, or return null if doesn't exist.
   */
  load(): Catalog | null {
    if (this.catalog) return this.catalog;

    if (!existsSync(CATALOG_PATH)) {
      return null;
    }

    try {
      const data = readFileSync(CATALOG_PATH, "utf-8");
      this.catalog = JSON.parse(data) as Catalog;
      return this.catalog;
    } catch {
      return null;
    }
  }

  /**
   * Save catalog to disk.
   */
  save(catalog: Catalog): void {
    catalog.lastUpdatedAt = Date.now();
    this.recalculateStats(catalog);
    writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
    this.catalog = catalog;
  }

  /**
   * Check if catalog needs refresh (doesn't exist or too old).
   */
  needsRefresh(): boolean {
    const catalog = this.load();

    if (!catalog) return true;

    const age = Date.now() - catalog.lastUpdatedAt;
    return age > CATALOG_REFRESH_THRESHOLD_MS;
  }

  /**
   * Check if catalog exists.
   */
  exists(): boolean {
    return existsSync(CATALOG_PATH);
  }

  /**
   * Merge newly fetched categories into existing catalog.
   * Preserves existing data, updates only changed categories.
   */
  merge(context: Context, categories: CatalogCategory[]): void {
    const catalog = this.load() || this.createEmpty();

    // Merge strategy: replace categories that were fetched
    const existingMap = new Map(catalog.contexts[context].map((c) => [c.slug, c]));

    for (const newCat of categories) {
      existingMap.set(newCat.slug, newCat);
    }

    catalog.contexts[context] = Array.from(existingMap.values());
    this.save(catalog);
  }

  /**
   * Get all categories, optionally filtered by context.
   */
  getCategories(context?: Context): CatalogCategory[] {
    const catalog = this.load();
    if (!catalog) return [];

    if (context) {
      return catalog.contexts[context];
    }

    return [
      ...catalog.contexts.marketing,
      ...catalog.contexts["application-ui"],
      ...catalog.contexts.ecommerce,
    ];
  }

  /**
   * Get catalog statistics.
   */
  getStats(): Catalog["stats"] | null {
    const catalog = this.load();
    return catalog?.stats || null;
  }

  /**
   * Get the last updated timestamp.
   */
  getLastUpdated(): number | null {
    const catalog = this.load();
    return catalog?.lastUpdatedAt || null;
  }

  /**
   * Create an empty catalog structure.
   */
  createEmpty(): Catalog {
    return {
      version: "2.0.0",
      generatedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      contexts: {
        marketing: [],
        "application-ui": [],
        ecommerce: [],
      },
      stats: {
        totalCategories: 0,
        totalBlocks: 0,
        totalCachedComponents: 0,
      },
    };
  }

  private recalculateStats(catalog: Catalog): void {
    catalog.stats.totalCategories = 0;
    catalog.stats.totalBlocks = 0;

    for (const categories of Object.values(catalog.contexts)) {
      catalog.stats.totalCategories += categories.length;
      catalog.stats.totalBlocks += categories.reduce((sum, c) => sum + c.componentCount, 0);
    }
  }

  private ensureDir(): void {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  // ============================================
  // Enhanced Catalog (v3.0) - Blocks with Variants
  // ============================================

  /**
   * Load enhanced catalog from disk.
   */
  loadEnhanced(): EnhancedCatalog | null {
    if (this.enhancedCatalog) return this.enhancedCatalog;

    if (!existsSync(ENHANCED_CATALOG_PATH)) {
      return null;
    }

    try {
      const data = readFileSync(ENHANCED_CATALOG_PATH, "utf-8");
      this.enhancedCatalog = JSON.parse(data) as EnhancedCatalog;
      return this.enhancedCatalog;
    } catch {
      return null;
    }
  }

  /**
   * Save enhanced catalog to disk.
   */
  saveEnhanced(catalog: EnhancedCatalog): void {
    catalog.lastUpdatedAt = Date.now();
    this.recalculateEnhancedStats(catalog);
    writeFileSync(ENHANCED_CATALOG_PATH, JSON.stringify(catalog, null, 2));
    this.enhancedCatalog = catalog;
  }

  /**
   * Create an empty enhanced catalog.
   */
  createEmptyEnhanced(): EnhancedCatalog {
    return {
      version: "3.0.0",
      generatedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      blocks: {},
      stats: {
        totalBlocks: 0,
        totalVariants: 0,
        totalCachedVariants: 0,
      },
    };
  }

  /**
   * Check if enhanced catalog needs refresh.
   */
  enhancedNeedsRefresh(): boolean {
    const catalog = this.loadEnhanced();
    if (!catalog) return true;

    const age = Date.now() - catalog.lastUpdatedAt;
    return age > CATALOG_REFRESH_THRESHOLD_MS;
  }

  /**
   * Check if enhanced catalog exists.
   */
  enhancedExists(): boolean {
    return existsSync(ENHANCED_CATALOG_PATH);
  }

  /**
   * Add or update a block in the enhanced catalog.
   */
  setBlock(block: Block): void {
    const catalog = this.loadEnhanced() || this.createEmptyEnhanced();
    const key = generateBlockKey(block.category, block.subcategory, block.slug);
    catalog.blocks[key] = block;
    this.saveEnhanced(catalog);
  }

  /**
   * Get a block by key.
   */
  getBlock(category: Context, subcategory: string, slug: string): Block | null {
    const catalog = this.loadEnhanced();
    if (!catalog) return null;

    const key = generateBlockKey(category, subcategory, slug);
    return catalog.blocks[key] || null;
  }

  /**
   * Get all blocks, optionally filtered by category.
   */
  getBlocks(category?: Context, subcategory?: string): Block[] {
    const catalog = this.loadEnhanced();
    if (!catalog) return [];

    const blocks = Object.values(catalog.blocks);

    if (category && subcategory) {
      return blocks.filter((b) => b.category === category && b.subcategory === subcategory);
    }

    if (category) {
      return blocks.filter((b) => b.category === category);
    }

    return blocks;
  }

  /**
   * Get category information for list_categories tool.
   */
  getCategoryInfo(): CategoryInfo[] {
    const catalog = this.loadEnhanced();
    if (!catalog) return [];

    const categoryMap = new Map<
      Context,
      { blockCount: number; subcategories: Set<string> }
    >();

    for (const block of Object.values(catalog.blocks)) {
      if (!categoryMap.has(block.category)) {
        categoryMap.set(block.category, { blockCount: 0, subcategories: new Set() });
      }
      const info = categoryMap.get(block.category)!;
      info.blockCount++;
      info.subcategories.add(block.subcategory);
    }

    const categoryNames: Record<Context, string> = {
      marketing: "Marketing",
      "application-ui": "Application UI",
      ecommerce: "Ecommerce",
    };

    const result: CategoryInfo[] = [];
    for (const [slug, info] of categoryMap) {
      result.push({
        name: categoryNames[slug],
        slug,
        blockCount: info.blockCount,
        subcategories: Array.from(info.subcategories).sort(),
      });
    }

    return result;
  }

  /**
   * Get variants for a specific block.
   */
  getVariants(category: Context, subcategory: string, blockSlug: string): ComponentVariant[] {
    const block = this.getBlock(category, subcategory, blockSlug);
    return block?.variants || [];
  }

  /**
   * Get enhanced catalog statistics.
   */
  getEnhancedStats(): EnhancedCatalog["stats"] | null {
    const catalog = this.loadEnhanced();
    return catalog?.stats || null;
  }

  /**
   * Get last updated timestamp for enhanced catalog.
   */
  getEnhancedLastUpdated(): number | null {
    const catalog = this.loadEnhanced();
    return catalog?.lastUpdatedAt || null;
  }

  private recalculateEnhancedStats(catalog: EnhancedCatalog): void {
    const blocks = Object.values(catalog.blocks);
    catalog.stats.totalBlocks = blocks.length;
    catalog.stats.totalVariants = blocks.reduce((sum, b) => sum + b.variantCount, 0);
  }
}
