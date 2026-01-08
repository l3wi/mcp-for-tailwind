import type { Browser, Page } from "puppeteer";
import type { CatalogCategory, UIBlock, Context, Catalog, FetchProgress } from "../types/index.ts";
import { UI_BLOCKS_URL, RATE_LIMIT, TIMEOUTS, getRandomUserAgent } from "../config.ts";
import { RateLimiter } from "../utils/rate-limiter.ts";
import { CatalogManager } from "../data/catalog-manager.ts";
import { AuthRequiredError } from "../errors/index.ts";

// Known category structure from Tailwind Plus (used as fallback/seed)
const KNOWN_CATEGORIES: Record<Context, Array<{ name: string; slug: string; subcategory?: string }>> = {
  marketing: [
    { name: "Hero Sections", slug: "sections/heroes", subcategory: "PAGE SECTIONS" },
    { name: "Feature Sections", slug: "sections/feature-sections", subcategory: "PAGE SECTIONS" },
    { name: "CTA Sections", slug: "sections/cta-sections", subcategory: "PAGE SECTIONS" },
    { name: "Bento Grids", slug: "sections/bento-grids", subcategory: "PAGE SECTIONS" },
    { name: "Pricing Sections", slug: "sections/pricing", subcategory: "PAGE SECTIONS" },
    { name: "Header Sections", slug: "sections/header", subcategory: "PAGE SECTIONS" },
    { name: "Newsletter Sections", slug: "sections/newsletter-sections", subcategory: "PAGE SECTIONS" },
    { name: "Stats", slug: "sections/stats-sections", subcategory: "PAGE SECTIONS" },
    { name: "Testimonials", slug: "sections/testimonials", subcategory: "PAGE SECTIONS" },
    { name: "Blog Sections", slug: "sections/blog-sections", subcategory: "PAGE SECTIONS" },
    { name: "Contact Sections", slug: "sections/contact-sections", subcategory: "PAGE SECTIONS" },
    { name: "Team Sections", slug: "sections/team-sections", subcategory: "PAGE SECTIONS" },
    { name: "Content Sections", slug: "sections/content-sections", subcategory: "PAGE SECTIONS" },
    { name: "Logo Clouds", slug: "sections/logo-clouds", subcategory: "PAGE SECTIONS" },
    { name: "FAQs", slug: "sections/faq-sections", subcategory: "PAGE SECTIONS" },
    { name: "Footers", slug: "sections/footers", subcategory: "PAGE SECTIONS" },
    { name: "Headers", slug: "elements/headers", subcategory: "ELEMENTS" },
    { name: "Flyout Menus", slug: "elements/flyout-menus", subcategory: "ELEMENTS" },
    { name: "Banners", slug: "elements/banners", subcategory: "ELEMENTS" },
    { name: "404 Pages", slug: "feedback/404-pages", subcategory: "FEEDBACK" },
    { name: "Landing Pages", slug: "page-examples/landing-pages", subcategory: "PAGE EXAMPLES" },
    { name: "Pricing Pages", slug: "page-examples/pricing-pages", subcategory: "PAGE EXAMPLES" },
    { name: "About Pages", slug: "page-examples/about-pages", subcategory: "PAGE EXAMPLES" },
  ],
  "application-ui": [
    { name: "Stacked Layouts", slug: "application-shells/stacked", subcategory: "APPLICATION SHELLS" },
    { name: "Sidebar Layouts", slug: "application-shells/sidebar", subcategory: "APPLICATION SHELLS" },
    { name: "Multi-Column Layouts", slug: "application-shells/multi-column", subcategory: "APPLICATION SHELLS" },
    { name: "Page Headings", slug: "headings/page-headings", subcategory: "HEADINGS" },
    { name: "Card Headings", slug: "headings/card-headings", subcategory: "HEADINGS" },
    { name: "Section Headings", slug: "headings/section-headings", subcategory: "HEADINGS" },
    { name: "Description Lists", slug: "data-display/description-lists", subcategory: "DATA DISPLAY" },
    { name: "Stats", slug: "data-display/stats", subcategory: "DATA DISPLAY" },
    { name: "Calendars", slug: "data-display/calendars", subcategory: "DATA DISPLAY" },
    { name: "Stacked Lists", slug: "lists/stacked-lists", subcategory: "LISTS" },
    { name: "Tables", slug: "lists/tables", subcategory: "LISTS" },
    { name: "Grid Lists", slug: "lists/grid-lists", subcategory: "LISTS" },
    { name: "Feeds", slug: "lists/feeds", subcategory: "LISTS" },
    { name: "Form Layouts", slug: "forms/form-layouts", subcategory: "FORMS" },
    { name: "Input Groups", slug: "forms/input-groups", subcategory: "FORMS" },
    { name: "Select Menus", slug: "forms/select-menus", subcategory: "FORMS" },
    { name: "Sign-in and Registration", slug: "forms/sign-in-forms", subcategory: "FORMS" },
    { name: "Textareas", slug: "forms/textareas", subcategory: "FORMS" },
    { name: "Radio Groups", slug: "forms/radio-groups", subcategory: "FORMS" },
    { name: "Checkboxes", slug: "forms/checkboxes", subcategory: "FORMS" },
    { name: "Toggles", slug: "forms/toggles", subcategory: "FORMS" },
    { name: "Action Panels", slug: "forms/action-panels", subcategory: "FORMS" },
    { name: "Comboboxes", slug: "forms/comboboxes", subcategory: "FORMS" },
    { name: "Alerts", slug: "feedback/alerts", subcategory: "FEEDBACK" },
    { name: "Empty States", slug: "feedback/empty-states", subcategory: "FEEDBACK" },
    { name: "Navbars", slug: "navigation/navbars", subcategory: "NAVIGATION" },
    { name: "Pagination", slug: "navigation/pagination", subcategory: "NAVIGATION" },
    { name: "Tabs", slug: "navigation/tabs", subcategory: "NAVIGATION" },
    { name: "Vertical Navigation", slug: "navigation/vertical-navigation", subcategory: "NAVIGATION" },
    { name: "Sidebar Navigation", slug: "navigation/sidebar-navigation", subcategory: "NAVIGATION" },
    { name: "Breadcrumbs", slug: "navigation/breadcrumbs", subcategory: "NAVIGATION" },
    { name: "Progress Bars", slug: "navigation/progress-bars", subcategory: "NAVIGATION" },
    { name: "Command Palettes", slug: "navigation/command-palettes", subcategory: "NAVIGATION" },
    { name: "Modal Dialogs", slug: "overlays/modal-dialogs", subcategory: "OVERLAYS" },
    { name: "Drawers", slug: "overlays/drawers", subcategory: "OVERLAYS" },
    { name: "Notifications", slug: "overlays/notifications", subcategory: "OVERLAYS" },
    { name: "Avatars", slug: "elements/avatars", subcategory: "ELEMENTS" },
    { name: "Badges", slug: "elements/badges", subcategory: "ELEMENTS" },
    { name: "Dropdowns", slug: "elements/dropdowns", subcategory: "ELEMENTS" },
    { name: "Buttons", slug: "elements/buttons", subcategory: "ELEMENTS" },
    { name: "Button Groups", slug: "elements/button-groups", subcategory: "ELEMENTS" },
    { name: "Containers", slug: "layout/containers", subcategory: "LAYOUT" },
    { name: "Cards", slug: "layout/cards", subcategory: "LAYOUT" },
    { name: "List containers", slug: "layout/list-containers", subcategory: "LAYOUT" },
    { name: "Media Objects", slug: "layout/media-objects", subcategory: "LAYOUT" },
    { name: "Dividers", slug: "layout/dividers", subcategory: "LAYOUT" },
    { name: "Home Screens", slug: "page-examples/home-screens", subcategory: "PAGE EXAMPLES" },
    { name: "Detail Screens", slug: "page-examples/detail-screens", subcategory: "PAGE EXAMPLES" },
    { name: "Settings Screens", slug: "page-examples/settings-screens", subcategory: "PAGE EXAMPLES" },
  ],
  ecommerce: [
    { name: "Product Overviews", slug: "components/product-overviews", subcategory: "COMPONENTS" },
    { name: "Product Lists", slug: "components/product-lists", subcategory: "COMPONENTS" },
    { name: "Category Previews", slug: "components/category-previews", subcategory: "COMPONENTS" },
    { name: "Shopping Carts", slug: "components/shopping-carts", subcategory: "COMPONENTS" },
    { name: "Category Filters", slug: "components/category-filters", subcategory: "COMPONENTS" },
    { name: "Product Quickviews", slug: "components/product-quickviews", subcategory: "COMPONENTS" },
    { name: "Product Features", slug: "components/product-features", subcategory: "COMPONENTS" },
    { name: "Store Navigation", slug: "components/store-navigation", subcategory: "COMPONENTS" },
    { name: "Promo Sections", slug: "components/promo-sections", subcategory: "COMPONENTS" },
    { name: "Checkout Forms", slug: "components/checkout-forms", subcategory: "COMPONENTS" },
    { name: "Reviews", slug: "components/reviews", subcategory: "COMPONENTS" },
    { name: "Order Summaries", slug: "components/order-summaries", subcategory: "COMPONENTS" },
    { name: "Order History", slug: "components/order-history", subcategory: "COMPONENTS" },
    { name: "Incentives", slug: "components/incentives", subcategory: "COMPONENTS" },
    { name: "Storefront Pages", slug: "page-examples/storefront-pages", subcategory: "PAGE EXAMPLES" },
    { name: "Product Pages", slug: "page-examples/product-pages", subcategory: "PAGE EXAMPLES" },
    { name: "Category Pages", slug: "page-examples/category-pages", subcategory: "PAGE EXAMPLES" },
    { name: "Shopping Cart Pages", slug: "page-examples/shopping-cart-pages", subcategory: "PAGE EXAMPLES" },
    { name: "Checkout Pages", slug: "page-examples/checkout-pages", subcategory: "PAGE EXAMPLES" },
    { name: "Order Detail Pages", slug: "page-examples/order-detail-pages", subcategory: "PAGE EXAMPLES" },
    { name: "Order History Pages", slug: "page-examples/order-history-pages", subcategory: "PAGE EXAMPLES" },
  ],
};

export class CatalogFetcher {
  private rateLimiter: RateLimiter;
  private catalogManager: CatalogManager;
  private onProgress?: (progress: FetchProgress) => void;

  constructor(
    private getBrowser: () => Promise<Browser>,
    private setupPage: (page: Page) => Promise<boolean>,
    onProgress?: (progress: FetchProgress) => void
  ) {
    this.rateLimiter = new RateLimiter(RATE_LIMIT.delayBetweenRequests);
    this.catalogManager = new CatalogManager();
    this.onProgress = onProgress;
  }

  /**
   * Fetch a single category page to discover all blocks.
   */
  async fetchCategory(context: Context, categorySlug: string, categoryName: string, subcategory?: string): Promise<CatalogCategory> {
    await this.rateLimiter.acquire();

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setUserAgent(getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });

      const hasCookies = await this.setupPage(page);
      if (!hasCookies) {
        throw new AuthRequiredError();
      }

      const url = `${UI_BLOCKS_URL}/${context}/${categorySlug}`;
      console.log(`  Fetching: ${url}`);

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: TIMEOUTS.navigation,
      });

      // Check auth
      if (page.url().includes("/login")) {
        throw new AuthRequiredError();
      }

      // Wait for content to load
      await page.waitForSelector('[role="tabpanel"], a[href*="#component-"]', {
        timeout: TIMEOUTS.selector,
      }).catch(() => {});

      // Find all component anchors
      const blocks = await page.$$eval(
        'a[href*="#component-"]',
        (links, ctx, slug) => {
          return links.map((link, index) => ({
            id: `${ctx}/${slug}/${index}`,
            index,
            name: link.textContent?.trim() || `Component ${index + 1}`,
            categorySlug: slug,
            context: ctx as Context,
            lastFetchedAt: Date.now(),
          }));
        },
        context,
        categorySlug
      );

      return {
        name: categoryName,
        slug: categorySlug,
        subcategory,
        context,
        componentCount: blocks.length,
        url,
        blocks: blocks as UIBlock[],
        lastFetchedAt: Date.now(),
        isComplete: true,
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Fetch all categories for a given context.
   */
  async fetchContext(context: Context): Promise<CatalogCategory[]> {
    const knownCategories = KNOWN_CATEGORIES[context];
    const results: CatalogCategory[] = [];
    const total = knownCategories.length;

    console.log(`\nFetching ${context} (${total} categories)...`);

    for (let i = 0; i < knownCategories.length; i++) {
      const cat = knownCategories[i]!;

      this.onProgress?.({
        phase: "catalog",
        current: i + 1,
        total,
        currentItem: cat.name,
        status: "in_progress",
      });

      try {
        const category = await this.fetchCategory(context, cat.slug, cat.name, cat.subcategory);
        results.push(category);
        console.log(`  ✓ ${cat.name}: ${category.componentCount} components`);

        // Progressive save after each category
        this.catalogManager.merge(context, [category]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  ✗ ${cat.name}: ${message}`);

        if (error instanceof AuthRequiredError) {
          throw error; // Stop fetching if auth fails
        }

        // Continue with other categories on non-auth errors
        this.onProgress?.({
          phase: "catalog",
          current: i + 1,
          total,
          currentItem: cat.name,
          status: "failed",
          error: message,
        });
      }
    }

    return results;
  }

  /**
   * Build complete catalog by fetching all contexts.
   */
  async buildFullCatalog(): Promise<Catalog> {
    const contexts: Context[] = ["marketing", "application-ui", "ecommerce"];

    console.log("Building full catalog...");

    for (const context of contexts) {
      await this.fetchContext(context);
    }

    const catalog = this.catalogManager.load();
    if (!catalog) {
      throw new Error("Failed to build catalog");
    }

    console.log(`\nCatalog complete: ${catalog.stats.totalCategories} categories, ${catalog.stats.totalBlocks} components`);

    return catalog;
  }

  /**
   * Sync only if catalog needs refresh.
   */
  async syncIfNeeded(): Promise<Catalog | null> {
    if (!this.catalogManager.needsRefresh()) {
      console.log("Catalog is fresh, skipping sync");
      return this.catalogManager.load();
    }

    return this.buildFullCatalog();
  }
}
