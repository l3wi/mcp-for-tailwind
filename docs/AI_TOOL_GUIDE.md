# Tailwind Plus MCP (Unofficial) — AI Tool Guide

This guide helps AI assistants use the **Tailwind Plus MCP (Unofficial)** server effectively.

## Quick start

1. **`check_status`** — verify auth + catalog
2. **`list_products`** — see UI blocks / templates / kits / Catalyst
3. **`search`** or **`list_categories` → `list_blocks` → `list_variants`**
4. **`get_variant`** — fetch code (requires auth)

If catalog is empty: ask the user to run  
`tailwind-plus-mcp sync-catalog --metadata-only`

## Tools

### UI Blocks

| Tool | Auth | Purpose |
|------|------|---------|
| `list_categories` | No | marketing / application-ui / ecommerce |
| `list_blocks` | No | Blocks in a category |
| `list_variants` | No | Variants for a block |
| `get_variant` | Yes | Source code |
| `search` | No | Search blocks + products |
| `suggest` | No | Suggestions for what you're building |

### Products (metadata)

| Tool | Purpose |
|------|---------|
| `list_products` | Full surface overview |
| `list_templates` | Next.js site templates |
| `list_kits` | Kits (Oatmeal, …) |
| `get_template` | One template/kit by slug |
| `list_catalyst` | Catalyst components + docs URLs |
| `get_catalyst_component` | One Catalyst component |

### Auth

| Tool | Purpose |
|------|---------|
| `check_status` | Health |
| `login` | Browser login |

## `get_variant` parameters

```
category: marketing | application-ui | ecommerce
block:    heroes | testimonials | …
variant:  simple-centered | …
format:   react | vue | html     (default react)
version:  v4 | v3.4              (default v4 → latest v4.x on page)
theme:    light | dark | system  (default light)
```

Notes:

- Tailwind Plus currently targets **Tailwind CSS v4.3** content under the v4 picker.
- **system** theme returns dual-mode snippets (dark: variants).
- HTML interactive blocks may list **`@tailwindplus/elements`** in dependencies/notes.

## Typical workflows

### SaaS landing page (UI blocks)

```
1. list_categories
2. list_blocks(category="marketing")
3. get_variant(category="marketing", block="heroes", variant="simple-centered", format="react", version="v4", theme="system")
4. suggest(building="SaaS landing page", alreadyUsed=["heroes"])
```

### Prefer a full template

```
1. list_templates
2. get_template(slug="oatmeal") or get_template(slug="radiant")
→ Point user to download from their Tailwind Plus account
```

### App UI with Catalyst

```
1. list_catalyst
2. get_catalyst_component(slug="sidebar-layout")
→ Use docs URL; source comes from Catalyst zip
```

## Errors

| Code | Meaning | Fix |
|------|---------|-----|
| `AUTH_REQUIRED` | Not logged in | `login` tool |
| `CATALOG_EMPTY` / `NO_BLOCKS` | No sync | `sync-catalog --metadata-only` |
| `BLOCK_NOT_FOUND` / `VARIANT_NOT_FOUND` | Bad slug | `list_blocks` / `list_variants` |
| `CODE_FETCH_FAILED` | DOM/scrape issue | Retry; site UI may have changed |

## Isolation

This unofficial server stores data in `~/.tailwind-plus-mcp`.  
Legacy `mcp-for-tailwind` uses `~/.tailwind-mcp`. Both can run at once under different MCP server keys.
