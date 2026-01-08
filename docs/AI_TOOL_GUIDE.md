# Tailwind-MCP AI Tool Guide

This guide helps AI assistants effectively use the Tailwind Plus MCP server.

## Quick Start

1. **Check status first**: `get_catalog_status` to verify auth and catalog
2. **Browse categories**: `list_categories` with optional context filter
3. **Search by keyword**: `search_components` for specific needs
4. **Fetch code**: `get_component` with slug from search results

## Available Tools

| Tool | Purpose | Auth Required |
|------|---------|---------------|
| `list_categories` | Browse all component categories | No |
| `search_components` | Search by keyword | No |
| `get_component` | Fetch component source code | Yes |
| `suggest_components` | Get AI-powered suggestions | No |
| `get_catalog_status` | Check system health | No |
| `sync_catalog` | Refresh catalog from source | Yes |

## Contexts

Tailwind Plus organizes components into three contexts:

- **marketing** (~23 categories): Landing pages, hero sections, pricing, testimonials, footers, headers, banners
- **application-ui** (~49 categories): Dashboards, forms, tables, navigation, modals, alerts, sidebars
- **ecommerce** (~21 categories): Product pages, shopping carts, checkout, order history, reviews

## Typical Workflows

### Building a Marketing Landing Page

```
1. list_categories(context: "marketing")
   → See: Hero Sections, Feature Sections, Pricing, Testimonials, Footer

2. get_component(categorySlug: "sections/heroes", context: "marketing", componentIndex: 0)
   → Get first hero variant

3. search_components(query: "pricing", context: "marketing")
   → Find pricing section options

4. suggest_components(building: "SaaS landing page", alreadyUsed: ["sections/heroes"])
   → Get complementary suggestions (CTAs, testimonials, etc.)
```

### Building an Admin Dashboard

```
1. list_categories(context: "application-ui")
   → Explore: Sidebar Layouts, Tables, Forms, Modal Dialogs

2. get_component(categorySlug: "application-shells/sidebar", context: "application-ui")
   → Get shell layout first

3. search_components(query: "table", context: "application-ui")
   → Find data table options

4. get_component(categorySlug: "lists/tables", context: "application-ui", componentIndex: 0)
   → Fetch a specific table component
```

### Building an Ecommerce Store

```
1. list_categories(context: "ecommerce")
   → See: Product Lists, Shopping Carts, Checkout Forms, etc.

2. get_component(categorySlug: "components/product-lists", context: "ecommerce")
   → Get product list component

3. suggest_components(building: "online store checkout flow")
   → Get suggestions for cart, checkout, order summary
```

## Error Handling

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `AUTH_REQUIRED` | Not logged in | User runs `bun run src/index.ts login` |
| `COMPONENT_NOT_FOUND` | Invalid slug/index | Check `list_categories` for valid slugs |
| `Cookies expired` | Session expired | User runs `bun run src/index.ts login` |

## Component Formats

When calling `get_component`, you can specify:

- **format**:
  - `react` (default): JSX components with Tailwind classes
  - `vue`: Vue Single-File Components
  - `html`: Vanilla HTML with inline Tailwind classes

- **theme**:
  - `light` (default): Light background variant
  - `dark`: Dark background variant

- **version**:
  - `v4.1` (default): Latest Tailwind CSS, uses CSS variables
  - `v3.4`: Legacy version, wider compatibility

## Best Practices

1. **Start with `list_categories`** to understand available options
2. **Use `search_components`** for specific needs rather than browsing all
3. **Check `dependencies`** in returned components for required npm packages
4. **Cache is automatic** - repeated requests are fast (7-day TTL)
5. **Use `suggest_components`** to discover related components
6. **Check `componentIndex`** bounds - use 0 for first variant

## Response Format

All tools return JSON with consistent structure:

```json
{
  "name": "Component Name",
  "category": "category-slug",
  "context": "marketing|application-ui|ecommerce",
  "format": "react|vue|html",
  "theme": "light|dark",
  "version": "v4.1|v3.4",
  "dependencies": ["react", "@headlessui/react"],
  "code": "// Full component source code..."
}
```

## Troubleshooting

### "Not authenticated" errors
The user needs to run the login command:
```bash
bun run src/index.ts login
```

### Empty or stale catalog
Sync the catalog:
```bash
bun run src/index.ts sync-catalog
```

### Slow responses
Components are cached after first fetch. Subsequent requests are fast.

### Missing components
Run `get_catalog_status` to check if the catalog needs refresh.
