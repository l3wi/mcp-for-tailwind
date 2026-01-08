/**
 * Convert a string to kebab-case slug
 * "Simple centered" → "simple-centered"
 * "With large avatar" → "with-large-avatar"
 */
export function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generate a cache key for a variant
 * Format: {category}--{block-slug}--{variant-slug}--{format}--{theme}--{version}
 */
export function generateVariantCacheKey(
  category: string,
  blockSlug: string,
  variantSlug: string,
  format: string,
  theme: string,
  version: string
): string {
  return [category, blockSlug, variantSlug, format, theme, version].join("--");
}

/**
 * Parse a cache key back into its components
 */
export function parseVariantCacheKey(key: string): {
  category: string;
  blockSlug: string;
  variantSlug: string;
  format: string;
  theme: string;
  version: string;
} | null {
  const parts = key.split("--");
  if (parts.length !== 6) return null;

  const [category, blockSlug, variantSlug, format, theme, version] = parts;
  return { category, blockSlug, variantSlug, format, theme, version };
}

/**
 * Generate a block key for catalog storage
 * Format: {category}/{subcategory}/{slug}
 */
export function generateBlockKey(
  category: string,
  subcategory: string,
  slug: string
): string {
  return `${category}/${subcategory}/${slug}`;
}

/**
 * Parse a block key back into its components
 */
export function parseBlockKey(key: string): {
  category: string;
  subcategory: string;
  slug: string;
} | null {
  const parts = key.split("/");
  if (parts.length !== 3) return null;

  const [category, subcategory, slug] = parts;
  return { category, subcategory, slug };
}
