import type { Category, Context } from "../types/index.ts";
import { CatalogManager } from "./catalog-manager.ts";
import { UI_BLOCKS_URL } from "../config.ts";

// Catalog manager instance
const catalogManager = new CatalogManager();

// Helper to create category entries (for static fallback)
function cat(
  name: string,
  slug: string,
  context: Context,
  componentCount: number,
  subcategory?: string
): Category {
  return {
    name,
    slug,
    subcategory,
    context,
    componentCount,
    url: `${UI_BLOCKS_URL}/${context}/${slug}`,
  };
}

// All categories organized by context
export const categories: Category[] = [
  // Marketing - Page Sections
  cat("Hero Sections", "sections/heroes", "marketing", 12, "PAGE SECTIONS"),
  cat("Feature Sections", "sections/feature-sections", "marketing", 15, "PAGE SECTIONS"),
  cat("CTA Sections", "sections/cta-sections", "marketing", 11, "PAGE SECTIONS"),
  cat("Bento Grids", "sections/bento-grids", "marketing", 3, "PAGE SECTIONS"),
  cat("Pricing Sections", "sections/pricing", "marketing", 12, "PAGE SECTIONS"),
  cat("Header Sections", "sections/header", "marketing", 8, "PAGE SECTIONS"),
  cat("Newsletter Sections", "sections/newsletter-sections", "marketing", 6, "PAGE SECTIONS"),
  cat("Stats", "sections/stats-sections", "marketing", 8, "PAGE SECTIONS"),
  cat("Testimonials", "sections/testimonials", "marketing", 8, "PAGE SECTIONS"),
  cat("Blog Sections", "sections/blog-sections", "marketing", 7, "PAGE SECTIONS"),
  cat("Contact Sections", "sections/contact-sections", "marketing", 7, "PAGE SECTIONS"),
  cat("Team Sections", "sections/team-sections", "marketing", 9, "PAGE SECTIONS"),
  cat("Content Sections", "sections/content-sections", "marketing", 7, "PAGE SECTIONS"),
  cat("Logo Clouds", "sections/logo-clouds", "marketing", 6, "PAGE SECTIONS"),
  cat("FAQs", "sections/faq-sections", "marketing", 7, "PAGE SECTIONS"),
  cat("Footers", "sections/footers", "marketing", 7, "PAGE SECTIONS"),
  // Marketing - Elements
  cat("Headers", "elements/headers", "marketing", 11, "ELEMENTS"),
  cat("Flyout Menus", "elements/flyout-menus", "marketing", 7, "ELEMENTS"),
  cat("Banners", "elements/banners", "marketing", 13, "ELEMENTS"),
  // Marketing - Feedback
  cat("404 Pages", "feedback/404-pages", "marketing", 5, "FEEDBACK"),
  // Marketing - Page Examples
  cat("Landing Pages", "page-examples/landing-pages", "marketing", 4, "PAGE EXAMPLES"),
  cat("Pricing Pages", "page-examples/pricing-pages", "marketing", 3, "PAGE EXAMPLES"),
  cat("About Pages", "page-examples/about-pages", "marketing", 3, "PAGE EXAMPLES"),

  // Application UI - Application Shells
  cat("Stacked Layouts", "application-shells/stacked", "application-ui", 9, "APPLICATION SHELLS"),
  cat("Sidebar Layouts", "application-shells/sidebar", "application-ui", 8, "APPLICATION SHELLS"),
  cat("Multi-Column Layouts", "application-shells/multi-column", "application-ui", 6, "APPLICATION SHELLS"),
  // Application UI - Headings
  cat("Page Headings", "headings/page-headings", "application-ui", 9, "HEADINGS"),
  cat("Card Headings", "headings/card-headings", "application-ui", 6, "HEADINGS"),
  cat("Section Headings", "headings/section-headings", "application-ui", 10, "HEADINGS"),
  // Application UI - Data Display
  cat("Description Lists", "data-display/description-lists", "application-ui", 6, "DATA DISPLAY"),
  cat("Stats", "data-display/stats", "application-ui", 5, "DATA DISPLAY"),
  cat("Calendars", "data-display/calendars", "application-ui", 8, "DATA DISPLAY"),
  // Application UI - Lists
  cat("Stacked Lists", "lists/stacked-lists", "application-ui", 15, "LISTS"),
  cat("Tables", "lists/tables", "application-ui", 19, "LISTS"),
  cat("Grid Lists", "lists/grid-lists", "application-ui", 7, "LISTS"),
  cat("Feeds", "lists/feeds", "application-ui", 3, "LISTS"),
  // Application UI - Forms
  cat("Form Layouts", "forms/form-layouts", "application-ui", 4, "FORMS"),
  cat("Input Groups", "forms/input-groups", "application-ui", 21, "FORMS"),
  cat("Select Menus", "forms/select-menus", "application-ui", 7, "FORMS"),
  cat("Sign-in and Registration", "forms/sign-in-forms", "application-ui", 4, "FORMS"),
  cat("Textareas", "forms/textareas", "application-ui", 5, "FORMS"),
  cat("Radio Groups", "forms/radio-groups", "application-ui", 12, "FORMS"),
  cat("Checkboxes", "forms/checkboxes", "application-ui", 4, "FORMS"),
  cat("Toggles", "forms/toggles", "application-ui", 5, "FORMS"),
  cat("Action Panels", "forms/action-panels", "application-ui", 8, "FORMS"),
  cat("Comboboxes", "forms/comboboxes", "application-ui", 4, "FORMS"),
  // Application UI - Feedback
  cat("Alerts", "feedback/alerts", "application-ui", 6, "FEEDBACK"),
  cat("Empty States", "feedback/empty-states", "application-ui", 6, "FEEDBACK"),
  // Application UI - Navigation
  cat("Navbars", "navigation/navbars", "application-ui", 11, "NAVIGATION"),
  cat("Pagination", "navigation/pagination", "application-ui", 3, "NAVIGATION"),
  cat("Tabs", "navigation/tabs", "application-ui", 9, "NAVIGATION"),
  cat("Vertical Navigation", "navigation/vertical-navigation", "application-ui", 6, "NAVIGATION"),
  cat("Sidebar Navigation", "navigation/sidebar-navigation", "application-ui", 5, "NAVIGATION"),
  cat("Breadcrumbs", "navigation/breadcrumbs", "application-ui", 4, "NAVIGATION"),
  cat("Progress Bars", "navigation/progress-bars", "application-ui", 8, "NAVIGATION"),
  cat("Command Palettes", "navigation/command-palettes", "application-ui", 8, "NAVIGATION"),
  // Application UI - Overlays
  cat("Modal Dialogs", "overlays/modal-dialogs", "application-ui", 6, "OVERLAYS"),
  cat("Drawers", "overlays/drawers", "application-ui", 12, "OVERLAYS"),
  cat("Notifications", "overlays/notifications", "application-ui", 6, "OVERLAYS"),
  // Application UI - Elements
  cat("Avatars", "elements/avatars", "application-ui", 11, "ELEMENTS"),
  cat("Badges", "elements/badges", "application-ui", 16, "ELEMENTS"),
  cat("Dropdowns", "elements/dropdowns", "application-ui", 5, "ELEMENTS"),
  cat("Buttons", "elements/buttons", "application-ui", 8, "ELEMENTS"),
  cat("Button Groups", "elements/button-groups", "application-ui", 5, "ELEMENTS"),
  // Application UI - Layout
  cat("Containers", "layout/containers", "application-ui", 5, "LAYOUT"),
  cat("Cards", "layout/cards", "application-ui", 10, "LAYOUT"),
  cat("List containers", "layout/list-containers", "application-ui", 7, "LAYOUT"),
  cat("Media Objects", "layout/media-objects", "application-ui", 8, "LAYOUT"),
  cat("Dividers", "layout/dividers", "application-ui", 8, "LAYOUT"),
  // Application UI - Page Examples
  cat("Home Screens", "page-examples/home-screens", "application-ui", 2, "PAGE EXAMPLES"),
  cat("Detail Screens", "page-examples/detail-screens", "application-ui", 2, "PAGE EXAMPLES"),
  cat("Settings Screens", "page-examples/settings-screens", "application-ui", 2, "PAGE EXAMPLES"),

  // Ecommerce - Components
  cat("Product Overviews", "components/product-overviews", "ecommerce", 5, "COMPONENTS"),
  cat("Product Lists", "components/product-lists", "ecommerce", 11, "COMPONENTS"),
  cat("Category Previews", "components/category-previews", "ecommerce", 6, "COMPONENTS"),
  cat("Shopping Carts", "components/shopping-carts", "ecommerce", 6, "COMPONENTS"),
  cat("Category Filters", "components/category-filters", "ecommerce", 5, "COMPONENTS"),
  cat("Product Quickviews", "components/product-quickviews", "ecommerce", 4, "COMPONENTS"),
  cat("Product Features", "components/product-features", "ecommerce", 9, "COMPONENTS"),
  cat("Store Navigation", "components/store-navigation", "ecommerce", 5, "COMPONENTS"),
  cat("Promo Sections", "components/promo-sections", "ecommerce", 8, "COMPONENTS"),
  cat("Checkout Forms", "components/checkout-forms", "ecommerce", 5, "COMPONENTS"),
  cat("Reviews", "components/reviews", "ecommerce", 4, "COMPONENTS"),
  cat("Order Summaries", "components/order-summaries", "ecommerce", 4, "COMPONENTS"),
  cat("Order History", "components/order-history", "ecommerce", 4, "COMPONENTS"),
  cat("Incentives", "components/incentives", "ecommerce", 8, "COMPONENTS"),
  // Ecommerce - Page Examples
  cat("Storefront Pages", "page-examples/storefront-pages", "ecommerce", 4, "PAGE EXAMPLES"),
  cat("Product Pages", "page-examples/product-pages", "ecommerce", 5, "PAGE EXAMPLES"),
  cat("Category Pages", "page-examples/category-pages", "ecommerce", 5, "PAGE EXAMPLES"),
  cat("Shopping Cart Pages", "page-examples/shopping-cart-pages", "ecommerce", 3, "PAGE EXAMPLES"),
  cat("Checkout Pages", "page-examples/checkout-pages", "ecommerce", 5, "PAGE EXAMPLES"),
  cat("Order Detail Pages", "page-examples/order-detail-pages", "ecommerce", 3, "PAGE EXAMPLES"),
  cat("Order History Pages", "page-examples/order-history-pages", "ecommerce", 5, "PAGE EXAMPLES"),
];

// Get all categories for a specific context
// Prefers dynamic catalog if available, falls back to static
export function getCategoriesByContext(context?: Context): Category[] {
  // Try dynamic catalog first
  const dynamicCategories = catalogManager.getCategories(context);
  if (dynamicCategories.length > 0) {
    return dynamicCategories;
  }

  // Fall back to static catalog
  if (!context) return categories;
  return categories.filter((c) => c.context === context);
}

// Check if dynamic catalog is available and fresh
export function hasDynamicCatalog(): boolean {
  return catalogManager.exists() && !catalogManager.needsRefresh();
}

// Get catalog manager for advanced operations
export function getCatalogManager(): CatalogManager {
  return catalogManager;
}

// Search categories by name
export function searchCategories(query: string, context?: Context): Category[] {
  const searchTerms = query.toLowerCase().split(/\s+/);
  const filtered = context ? getCategoriesByContext(context) : categories;

  return filtered
    .map((category) => {
      const name = category.name.toLowerCase();
      const matches = searchTerms.filter(
        (term) => name.includes(term) || category.subcategory?.toLowerCase().includes(term)
      );
      const relevance = matches.length / searchTerms.length;
      return { category, relevance };
    })
    .filter(({ relevance }) => relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .map(({ category }) => category);
}

// Build a component ID from category
export function buildComponentId(category: Category, componentSlug: string): string {
  return `${category.context}/${category.slug}/${componentSlug}`;
}

// Get the total component count
export function getTotalComponentCount(context?: Context): number {
  const filtered = context ? getCategoriesByContext(context) : categories;
  return filtered.reduce((sum, c) => sum + c.componentCount, 0);
}

// Keywords for context suggestions
export const contextKeywords: Record<Context, string[]> = {
  marketing: [
    "landing",
    "hero",
    "cta",
    "pricing",
    "testimonial",
    "feature",
    "newsletter",
    "blog",
    "faq",
    "footer",
    "header",
    "banner",
    "about",
    "team",
    "contact",
    "stats",
    "logo",
    "404",
    "marketing",
    "website",
    "saas",
    "startup",
  ],
  "application-ui": [
    "dashboard",
    "admin",
    "app",
    "application",
    "form",
    "table",
    "list",
    "modal",
    "drawer",
    "notification",
    "alert",
    "sidebar",
    "navbar",
    "navigation",
    "pagination",
    "tabs",
    "breadcrumb",
    "avatar",
    "badge",
    "button",
    "dropdown",
    "input",
    "select",
    "checkbox",
    "toggle",
    "radio",
    "calendar",
    "card",
    "settings",
    "profile",
    "command",
  ],
  ecommerce: [
    "product",
    "cart",
    "checkout",
    "order",
    "store",
    "shop",
    "category",
    "filter",
    "review",
    "promo",
    "incentive",
    "storefront",
    "ecommerce",
    "commerce",
    "shopping",
    "payment",
  ],
};

// Detect context from user description
export function detectContext(description: string): Context | undefined {
  const lower = description.toLowerCase();
  let bestContext: Context | undefined;
  let bestScore = 0;

  for (const [context, keywords] of Object.entries(contextKeywords)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestContext = context as Context;
    }
  }

  return bestContext;
}

// Suggest categories based on what user is building
export function suggestCategories(building: string, alreadyUsed: string[] = []): Category[] {
  const context = detectContext(building);
  const lower = building.toLowerCase();
  const usedSet = new Set(alreadyUsed.map((u) => u.toLowerCase()));

  // Get relevant categories
  let candidates = context ? getCategoriesByContext(context) : categories;

  // Filter out already used
  candidates = candidates.filter(
    (c) => !usedSet.has(c.name.toLowerCase()) && !usedSet.has(c.slug)
  );

  // Score by relevance to building description
  return candidates
    .map((category) => {
      const name = category.name.toLowerCase();
      let score = 0;

      // Direct name match
      if (lower.includes(name) || name.includes(lower.split(/\s+/)[0] || "")) {
        score += 10;
      }

      // Partial matches
      const words = lower.split(/\s+/);
      for (const word of words) {
        if (name.includes(word)) score += 3;
      }

      // Context bonus
      if (context === category.context) score += 2;

      return { category, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ category }) => category);
}
