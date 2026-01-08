import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import type {
  Component,
  CacheEntryWithTTL,
  CacheManifestWithTTL,
  CodeFormat,
  Theme,
  TailwindVersion,
  Context,
  VariantCode,
} from "../types/index.ts";
import { CACHE_DIR, CACHE_MANIFEST_PATH, CACHE_TTL_MS } from "../config.ts";
import { generateVariantCacheKey } from "../utils/slug.ts";

// Variant-specific cache entry
export interface VariantCacheEntry {
  category: Context;
  blockSlug: string;
  variantSlug: string;
  format: CodeFormat;
  theme: Theme;
  version: TailwindVersion;
  cachedAt: number;
  expiresAt: number;
  filePath: string;
  size: number;
}

export class CacheManager {
  private manifest: CacheManifestWithTTL;
  private manifestDirty = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureDir();
    this.manifest = this.loadManifest();
  }

  /**
   * Mark manifest as needing save, debounced to avoid excessive writes.
   */
  private markManifestDirty(): void {
    this.manifestDirty = true;
    if (!this.saveTimeout) {
      this.saveTimeout = setTimeout(() => {
        this.flushManifest();
      }, 1000);
    }
  }

  /**
   * Flush pending manifest changes to disk.
   */
  async flushManifest(): Promise<void> {
    if (this.manifestDirty) {
      this.manifest.stats = {
        totalSize: Object.values(this.manifest.entries).reduce((sum, e) => sum + e.size, 0),
        entryCount: Object.keys(this.manifest.entries).length,
      };
      await writeFile(CACHE_MANIFEST_PATH, JSON.stringify(this.manifest, null, 2));
      this.manifestDirty = false;
    }
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  /**
   * Get a cached component, or null if not cached/expired.
   */
  async get(
    categorySlug: string,
    context: Context,
    index: number,
    format: CodeFormat,
    theme: Theme,
    version: TailwindVersion
  ): Promise<Component | null> {
    const key = this.buildKey(categorySlug, context, index, format, theme, version);
    const entry = this.manifest.entries[key];

    if (!entry) return null;

    if (this.isExpired(entry)) {
      await this.delete(key);
      return null;
    }

    try {
      const data = await readFile(entry.filePath, "utf-8");
      return JSON.parse(data) as Component;
    } catch {
      await this.delete(key);
      return null;
    }
  }

  /**
   * Cache a component.
   */
  async set(component: Component): Promise<void> {
    const index = parseInt(component.id.split("/").pop() || "0", 10);
    const key = this.buildKey(
      component.category,
      component.context,
      index,
      component.format,
      component.theme,
      component.version
    );

    const filePath = join(CACHE_DIR, `${key}.json`);
    const content = JSON.stringify(component, null, 2);

    await writeFile(filePath, content);

    const entry: CacheEntryWithTTL = {
      id: component.id,
      format: component.format,
      theme: component.theme,
      version: component.version,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL_MS,
      filePath,
      size: Buffer.byteLength(content),
    };

    this.manifest.entries[key] = entry;
    this.markManifestDirty();
  }

  /**
   * Check if a cache entry is expired.
   */
  isExpired(entry: CacheEntryWithTTL): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Delete a cache entry.
   */
  async delete(key: string): Promise<void> {
    const entry = this.manifest.entries[key];
    if (entry && existsSync(entry.filePath)) {
      try {
        await unlink(entry.filePath);
      } catch {
        // Ignore deletion errors
      }
    }
    delete this.manifest.entries[key];
    this.markManifestDirty();
  }

  /**
   * Clear all expired entries.
   */
  async pruneExpired(): Promise<number> {
    let pruned = 0;

    for (const [key, entry] of Object.entries(this.manifest.entries)) {
      if (this.isExpired(entry)) {
        await this.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Clear entire cache.
   */
  async clearAll(): Promise<number> {
    const keys = Object.keys(this.manifest.entries);
    for (const key of keys) {
      await this.delete(key);
    }
    return keys.length;
  }

  /**
   * Get cache statistics.
   */
  getStats(): { totalEntries: number; totalSize: number; expiredCount: number } {
    const entries = Object.values(this.manifest.entries);
    return {
      totalEntries: entries.length,
      totalSize: entries.reduce((sum, e) => sum + e.size, 0),
      expiredCount: entries.filter((e) => this.isExpired(e)).length,
    };
  }

  // ============================================
  // Variant-level caching (v3.0)
  // ============================================

  /**
   * Get cached variant code, or null if not cached/expired.
   */
  async getVariant(
    category: Context,
    blockSlug: string,
    variantSlug: string,
    format: CodeFormat,
    theme: Theme,
    version: TailwindVersion
  ): Promise<VariantCode | null> {
    const key = generateVariantCacheKey(category, blockSlug, variantSlug, format, theme, version);
    const entry = this.manifest.entries[key];

    if (!entry) return null;

    if (this.isExpired(entry)) {
      await this.delete(key);
      return null;
    }

    try {
      const data = await readFile(entry.filePath, "utf-8");
      return JSON.parse(data) as VariantCode;
    } catch {
      await this.delete(key);
      return null;
    }
  }

  /**
   * Cache a variant code.
   */
  async setVariant(variant: VariantCode): Promise<void> {
    const key = generateVariantCacheKey(
      variant.category,
      variant.blockSlug,
      variant.variantSlug,
      variant.format,
      variant.theme,
      variant.version
    );

    const filePath = join(CACHE_DIR, `${key}.json`);
    const content = JSON.stringify(variant, null, 2);

    await writeFile(filePath, content);

    const entry: CacheEntryWithTTL = {
      id: `${variant.category}/${variant.blockSlug}/${variant.variantSlug}`,
      format: variant.format,
      theme: variant.theme,
      version: variant.version,
      cachedAt: variant.cachedAt || Date.now(),
      expiresAt: (variant.cachedAt || Date.now()) + CACHE_TTL_MS,
      filePath,
      size: Buffer.byteLength(content),
    };

    this.manifest.entries[key] = entry;
    this.markManifestDirty();
  }

  /**
   * Check if variant is cached and valid.
   */
  hasVariant(
    category: Context,
    blockSlug: string,
    variantSlug: string,
    format: CodeFormat,
    theme: Theme,
    version: TailwindVersion
  ): boolean {
    const key = generateVariantCacheKey(category, blockSlug, variantSlug, format, theme, version);
    const entry = this.manifest.entries[key];
    return entry ? !this.isExpired(entry) : false;
  }

  /**
   * Get all cached variants for a block.
   */
  async getBlockVariants(category: Context, blockSlug: string): Promise<VariantCode[]> {
    const prefix = `${category}--${blockSlug}--`;
    const results: VariantCode[] = [];

    for (const [key, entry] of Object.entries(this.manifest.entries)) {
      if (key.startsWith(prefix) && !this.isExpired(entry)) {
        try {
          const data = await readFile(entry.filePath, "utf-8");
          results.push(JSON.parse(data) as VariantCode);
        } catch {
          // Skip invalid entries
        }
      }
    }

    return results;
  }

  /**
   * Get cache statistics for variants.
   */
  getVariantStats(): {
    totalVariants: number;
    byCategory: Record<string, number>;
    byFormat: Record<string, number>;
    totalSize: number;
  } {
    const byCategory: Record<string, number> = {};
    const byFormat: Record<string, number> = {};
    let totalVariants = 0;
    let totalSize = 0;

    for (const [key, entry] of Object.entries(this.manifest.entries)) {
      if (this.isExpired(entry)) continue;

      // Parse key to get category and format
      const parts = key.split("--");
      if (parts.length >= 4) {
        const category = parts[0];
        const format = parts[3];

        byCategory[category!] = (byCategory[category!] || 0) + 1;
        byFormat[format!] = (byFormat[format!] || 0) + 1;
        totalVariants++;
        totalSize += entry.size;
      }
    }

    return { totalVariants, byCategory, byFormat, totalSize };
  }

  private buildKey(
    categorySlug: string,
    context: Context,
    index: number,
    format: CodeFormat,
    theme: Theme,
    version: TailwindVersion
  ): string {
    return `${context}--${categorySlug.replace(/\//g, "--")}--${index}--${format}--${theme}--${version}`;
  }

  private ensureDir(): void {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  private loadManifest(): CacheManifestWithTTL {
    if (existsSync(CACHE_MANIFEST_PATH)) {
      try {
        return JSON.parse(readFileSync(CACHE_MANIFEST_PATH, "utf-8"));
      } catch {
        return this.createEmptyManifest();
      }
    }
    return this.createEmptyManifest();
  }

  private createEmptyManifest(): CacheManifestWithTTL {
    return {
      version: "2.0.0",
      createdAt: Date.now(),
      entries: {},
      stats: { totalSize: 0, entryCount: 0 },
    };
  }
}
