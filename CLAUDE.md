# CLAUDE.md — Tailwind Plus MCP (Unofficial)

Guidance for AI assistants working on this repository.

## Project overview

**Tailwind Plus MCP (Unofficial)** (`tailwind-plus-mcp`) is an MCP server that provides programmatic access to Tailwind Plus for license holders. It uses Puppeteer to fetch authenticated UI-block code from `tailwindcss.com/plus`, and ships static discovery catalogs for templates, kits (Oatmeal), and Catalyst.

This package is intentionally **isolated** from the legacy `mcp-for-tailwind` install:

| | Unofficial (this repo) | Legacy |
|---|---|---|
| Binary | `tailwind-plus-mcp` | `mcp-for-tailwind` |
| Data dir | `~/.tailwind-plus-mcp` | `~/.tailwind-mcp` |
| npm name | `tailwind-plus-mcp` | `mcp-for-tailwind` |

Cookies can be seeded once from the legacy dir on first run.

## Commands

```bash
bun install
bun run dev
bun run build
bun run src/index.ts status
bun run src/index.ts login
bun run src/index.ts sync-catalog --metadata-only
bun run src/index.ts list-products
bun run src/index.ts list-templates
bun run src/index.ts list-catalyst
bun run src/index.ts get-variant --category=marketing --block=heroes --variant=simple-centered --version=v4 --theme=system
```

## Architecture

```
src/
├── brand.ts                 # Display name, package identity
├── index.ts                 # CLI entry
├── server.ts                # MCP tools (stdio + HTTP)
├── config.ts                # Paths, rate limits, defaults
├── browser/
│   ├── browser.ts           # Chrome lifecycle, auth, block index
│   ├── page-controls.ts     # Format / version / theme pickers
│   ├── variant-fetcher.ts   # Variant metadata + code fetch
│   ├── catalog-fetcher.ts   # Legacy category seed fetch
│   └── shared.ts            # Dependency parse helpers
├── cache/cache-manager.ts
├── data/
│   ├── catalog-manager.ts   # catalog-v3 persistence
│   ├── catalog.ts           # Static UI-block fallback
│   ├── products.ts          # Templates, kits, Catalyst
│   └── search.ts
└── types/
```

### Key concepts

- **UI Blocks contexts**: `marketing`, `application-ui`, `ecommerce`
- **Formats**: `react`, `vue`, `html`
- **Versions**: `v4` (resolves to latest v4.x option on page) or `v3.4`
- **Themes**: `light`, `dark`, `system`
- **Products**: templates / kits / Catalyst — metadata only (no zip redistribution)

### MCP tools

UI: `list_categories`, `list_blocks`, `list_variants`, `get_variant`, `search`, `suggest`  
Products: `list_products`, `list_templates`, `list_kits`, `get_template`, `list_catalyst`, `get_catalyst_component`  
Auth: `check_status`, `login`

## Working rules

- Prefer dynamic discovery (`fetchBlockIndex`) over hardcoded category lists when syncing.
- Version pickers change labels (`v4.0`, `v4.1`, …) — use `page-controls.resolveVersionOption`, never hard-require a single label.
- Do not commit cookies, cache, or `~/.tailwind-plus-mcp` contents.
- Do not add code that redistributes Tailwind Plus component source in the repo.
- Keep the unofficial branding explicit in user-facing strings.
