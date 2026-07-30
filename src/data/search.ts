/**
 * Search module for Tailwind Plus components.
 * Provides fuzzy search across categories, blocks, and variants.
 */
import type {
  Context,
  Block,
  SearchResultItem,
  SearchResultType,
  SuggestionResult,
} from "../types/index.ts";
import { CatalogManager } from "./catalog-manager.ts";

/**
 * Calculate similarity score between two strings.
 * Returns 0-1 where 1 is exact match.
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Exact match
  if (s1 === s2) return 1;

  // Contains exact term
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // Word-level matching
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

  // Levenshtein-based similarity for fuzzy matching
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(s1, s2);
  const levenshteinScore = 1 - distance / maxLen;

  // Combine scores, weighting word matches higher
  return Math.max(wordScore * 0.7 + levenshteinScore * 0.3, levenshteinScore);
}

/**
 * Calculate Levenshtein distance between two strings.
 * Uses a 2D array with guaranteed initialization to avoid undefined access.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Create a properly initialized 2D array
  // Row 0: [0, 1, 2, ..., n]
  // Col 0: [0, 1, 2, ..., m]
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    const prevRow = dp[i - 1] as number[];
    const currRow = dp[i] as number[];

    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        (prevRow[j] as number) + 1,
        (currRow[j - 1] as number) + 1,
        (prevRow[j - 1] as number) + cost
      );
    }
  }

  return (dp[m] as number[])[n] as number;
}

/**
 * Search across all blocks and variants.
 */
/** Drop noisy fuzzy matches (e.g. "oatmeal" → random banners). */
const MIN_BLOCK_RELEVANCE = 0.45;
const MIN_VARIANT_RELEVANCE = 0.5;

export function search(
  query: string,
  catalogManager: CatalogManager,
  options?: {
    category?: Context;
    limit?: number;
    includeVariants?: boolean;
  }
): SearchResultItem[] {
  const { category, limit = 10, includeVariants = true } = options || {};
  const results: SearchResultItem[] = [];
  const blocks = catalogManager.getBlocks(category);
  const queryLower = query.toLowerCase().trim();
  if (!queryLower) return [];

  for (const block of blocks) {
    // Exact slug / name boosts
    const slugHit =
      block.slug === queryLower ||
      block.slug.includes(queryLower) ||
      queryLower.includes(block.slug)
        ? 0.95
        : 0;
    const blockNameScore = Math.max(
      calculateSimilarity(block.name, queryLower),
      slugHit
    );
    const blockDescScore = block.description
      ? calculateSimilarity(block.description, queryLower) * 0.8
      : 0;
    const blockScore = Math.max(blockNameScore, blockDescScore);

    if (blockScore >= MIN_BLOCK_RELEVANCE) {
      results.push({
        type: "block" as SearchResultType,
        category: block.category,
        block: block.slug,
        blockName: block.name,
        variantCount: block.variantCount,
        relevance: blockScore,
      });
    }

    if (includeVariants && block.variants) {
      for (const variant of block.variants) {
        const variantSlugHit =
          variant.slug === queryLower || variant.slug.includes(queryLower) ? 0.92 : 0;
        const variantScore = Math.max(
          calculateSimilarity(variant.name, queryLower),
          variantSlugHit
        );

        const combinedScore =
          blockScore >= 0.5 ? variantScore * 0.7 + blockScore * 0.3 : variantScore;

        if (combinedScore >= MIN_VARIANT_RELEVANCE) {
          results.push({
            type: "variant" as SearchResultType,
            category: block.category,
            block: block.slug,
            blockName: block.name,
            variant: variant.slug,
            variantName: variant.name,
            relevance: combinedScore,
          });
        }
      }
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
}

/**
 * Context keywords for suggestion matching.
 * Block slugs must match catalog-v3 keys (e.g. heroes, feature-sections, sidebar).
 */
const CONTEXT_KEYWORDS: Record<string, { context: Context; blocks: string[] }> = {
  "landing page": {
    context: "marketing",
    blocks: ["heroes", "cta-sections", "feature-sections", "pricing", "testimonials", "footers", "headers"],
  },
  saas: {
    context: "marketing",
    blocks: ["heroes", "pricing", "feature-sections", "testimonials", "cta-sections", "logo-clouds"],
  },
  marketing: {
    context: "marketing",
    blocks: ["heroes", "feature-sections", "cta-sections", "pricing", "newsletter-sections", "footers"],
  },
  portfolio: {
    context: "marketing",
    blocks: ["heroes", "content-sections", "team-sections", "contact-sections", "footers"],
  },
  dashboard: {
    context: "application-ui",
    blocks: ["sidebar", "stacked", "stats", "tables", "stacked-lists", "navbars"],
  },
  admin: {
    context: "application-ui",
    blocks: ["sidebar", "tables", "form-layouts", "stats", "modal-dialogs", "command-palettes"],
  },
  settings: {
    context: "application-ui",
    blocks: ["form-layouts", "page-headings", "vertical-navigation", "description-lists", "settings-screens"],
  },
  store: {
    context: "ecommerce",
    blocks: ["product-overviews", "product-lists", "shopping-carts", "category-filters", "store-navigation"],
  },
  checkout: {
    context: "ecommerce",
    blocks: ["checkout-forms", "order-summaries", "shopping-carts", "checkout-pages"],
  },
  product: {
    context: "ecommerce",
    blocks: ["product-overviews", "product-quickviews", "product-features", "reviews", "product-pages"],
  },
  blog: { context: "marketing", blocks: ["blog-sections", "headers", "footers", "content-sections"] },
  auth: { context: "application-ui", blocks: ["sign-in-forms"] },
  login: { context: "application-ui", blocks: ["sign-in-forms"] },
  modal: { context: "application-ui", blocks: ["modal-dialogs", "drawers", "notifications"] },
  form: {
    context: "application-ui",
    blocks: ["form-layouts", "input-groups", "select-menus", "checkboxes", "radio-groups"],
  },
  table: { context: "application-ui", blocks: ["tables", "stacked-lists", "grid-lists"] },
  navigation: {
    context: "application-ui",
    blocks: ["navbars", "sidebar-navigation", "vertical-navigation", "tabs", "breadcrumbs"],
  },
  ecommerce: {
    context: "ecommerce",
    blocks: ["product-lists", "product-overviews", "shopping-carts", "promo-sections"],
  },
};

/**
 * Suggest relevant blocks based on what the user is building.
 */
export function suggest(
  building: string,
  catalogManager: CatalogManager,
  alreadyUsed: string[] = []
): SuggestionResult[] {
  const buildingLower = building.toLowerCase();
  const results: SuggestionResult[] = [];
  const usedSet = new Set(alreadyUsed.map((s) => s.toLowerCase()));

  // Find matching context keywords
  const matchedKeywords: Array<{ keyword: string; score: number; data: typeof CONTEXT_KEYWORDS[string] }> = [];

  for (const [keyword, data] of Object.entries(CONTEXT_KEYWORDS)) {
    const score = calculateSimilarity(buildingLower, keyword);
    if (score > 0.4) {
      matchedKeywords.push({ keyword, score, data });
    }
  }

  // Sort by relevance
  matchedKeywords.sort((a, b) => b.score - a.score);

  // Get suggested blocks
  const suggestedBlocks = new Set<string>();

  for (const { data } of matchedKeywords) {
    for (const blockSlug of data.blocks) {
      if (!usedSet.has(blockSlug) && !suggestedBlocks.has(blockSlug)) {
        suggestedBlocks.add(blockSlug);

        // Find the actual block in catalog
        const blocks = catalogManager.getBlocks(data.context);
        const block = blocks.find((b) => b.slug === blockSlug);

        if (block) {
          // Get recommended variants (first 2 or most relevant)
          const recommendedVariants = block.variants
            ?.slice(0, 2)
            .map((v) => v.slug) || [];

          results.push({
            category: block.category,
            block: block.slug,
            blockName: block.name,
            reason: getSuggestionReason(block, buildingLower),
            recommendedVariants,
          });
        }
      }
    }
  }

  // Also search blocks directly if no keyword matches
  if (matchedKeywords.length === 0) {
    const searchResults = search(building, catalogManager, { limit: 5, includeVariants: false });

    for (const result of searchResults) {
      if (result.type === "block" && result.block && !usedSet.has(result.block)) {
        const block = catalogManager.getBlocks().find(
          (b) => b.slug === result.block && b.category === result.category
        );

        if (block) {
          results.push({
            category: block.category,
            block: block.slug,
            blockName: block.name,
            reason: `Matches your search for "${building}"`,
            recommendedVariants: block.variants?.slice(0, 2).map((v) => v.slug) || [],
          });
        }
      }
    }
  }

  return results.slice(0, 6);
}

/**
 * Generate a human-readable reason for a suggestion.
 */
function getSuggestionReason(block: Block, building: string): string {
  const reasons: Record<string, string> = {
    heroes: "Eye-catching hero section to grab attention",
    "cta-sections": "Drive conversions with a call-to-action",
    pricing: "Display your pricing plans clearly",
    testimonials: "Add social proof to build trust",
    "feature-sections": "Showcase your product features",
    footers: "Professional footer with links and info",
    sidebar: "Sidebar application shell for dashboards",
    stacked: "Stacked application shell layout",
    tables: "Display data in organized tables",
    "form-layouts": "Collect user input with form layouts",
    "shopping-carts": "Shopping cart for your store",
    "product-overviews": "Showcase your products",
    "checkout-forms": "Streamline the checkout process",
    "sign-in-forms": "Sign-in and registration screens",
    "modal-dialogs": "Modal dialogs for confirmations and flows",
    navbars: "Top navigation for your site",
    stats: "Display key metrics and statistics",
  };

  return reasons[block.slug] || `${block.name} components for your ${building}`;
}
