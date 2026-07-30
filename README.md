# Tailwind Plus MCP (Unofficial)

**Unofficial** MCP server that gives [Tailwind Plus](https://tailwindcss.com/plus) license holders programmatic access to their components for LLM-assisted development.

> This is a community fork/rebrand of the earlier `mcp-for-tailwind` package. It is **not** affiliated with or endorsed by Tailwind Labs. You need a valid Tailwind Plus license. Components are never redistributed — they are fetched with your own credentials.

| | |
|---|---|
| Package | `tailwind-plus-mcp` |
| CLI | `tailwind-plus-mcp` |
| MCP server name | `tailwind-plus-mcp-unofficial` |
| Data directory | `~/.tailwind-plus-mcp` |
| Version | `0.3.0` |

**Side-by-side with the old tool:** this package uses a **different binary name** and **different data dir** than `mcp-for-tailwind` (`~/.tailwind-mcp`). You can keep the old server running in Cursor while developing this one. On first run, auth cookies are optionally seeded from the legacy data dir.

## What’s covered

| Surface | Access |
|---------|--------|
| **UI Blocks** (marketing, application-ui, ecommerce) | Full: search, list, fetch React/Vue/HTML via authenticated scrape |
| **Templates** (Spotlight, Radiant, Compass, …) | Discovery metadata + product URLs (zips download from your account) |
| **Kits** (Oatmeal, etc.) | Discovery metadata + stack notes |
| **Catalyst UI Kit** | Component index + docs links |
| **Dark / system theme** | `theme=light\|dark\|system` on UI blocks (Aug 2025+) |
| **Tailwind CSS versions** | `version=v4` (latest picker label, e.g. up to v4.3 content) or `v3.4` |
| **HTML + Elements** | Notes + dependency hints when snippets use Tailwind Plus Elements |

## Quick start

```bash
# From this repo
bun install
bun run build
bun link          # exposes tailwind-plus-mcp on your PATH

# Or run directly
bun run src/index.ts status
```

```bash
# 1. Login (opens browser) — cookies go to ~/.tailwind-plus-mcp
tailwind-plus-mcp login

# 2. Sync UI-block catalog (metadata only is fast)
tailwind-plus-mcp sync-catalog --metadata-only

# 3. Browse
tailwind-plus-mcp list-products
tailwind-plus-mcp list-categories
tailwind-plus-mcp search "pricing"
```

## MCP configuration

**Cursor** (`.cursor/mcp.json` or global) — use a **different key** than your existing broken server:

```json
{
  "mcpServers": {
    "tailwind-plus-unofficial": {
      "command": "tailwind-plus-mcp",
      "args": []
    }
  }
}
```

Point `command` at a local build while developing:

```json
{
  "mcpServers": {
    "tailwind-plus-unofficial": {
      "command": "bun",
      "args": ["run", "/Users/YOU/Documents/two/src/index.ts"]
    }
  }
}
```

**Claude Code** (`~/.claude/settings.json`): same pattern under `mcpServers`.

## MCP tools

### UI Blocks
| Tool | Description |
|------|-------------|
| `list_categories` | List marketing / application-ui / ecommerce |
| `list_blocks` | List blocks in a category |
| `list_variants` | List variants for a block |
| `get_variant` | Fetch component code (React, Vue, or HTML) |
| `search` | Search blocks + products |
| `suggest` | Context-aware block suggestions |

### Product surfaces
| Tool | Description |
|------|-------------|
| `list_products` | Overview of all Tailwind Plus surfaces |
| `list_templates` | Site templates metadata |
| `list_kits` | Kits (e.g. Oatmeal) |
| `get_template` | Template/kit details by slug |
| `list_catalyst` | Catalyst component index |
| `get_catalyst_component` | Catalyst component + docs URL |

### Auth / health
| Tool | Description |
|------|-------------|
| `check_status` | Auth, catalog, products, cache |
| `login` | Browser login to Tailwind Plus |

## CLI

```bash
tailwind-plus-mcp                    # MCP stdio
tailwind-plus-mcp --remote [port]    # HTTP MCP

tailwind-plus-mcp login
tailwind-plus-mcp status
tailwind-plus-mcp list-products
tailwind-plus-mcp list-templates
tailwind-plus-mcp list-kits
tailwind-plus-mcp list-catalyst
tailwind-plus-mcp sync-catalog --metadata-only
tailwind-plus-mcp get-variant --category=marketing --block=heroes --variant=simple-centered --theme=system --version=v4
```

## Requirements

- Node.js 18+ or Bun
- Valid [Tailwind Plus](https://tailwindcss.com/plus) license
- Chrome/Chromium/Edge/Brave (auto-detected, or downloaded on first use)

## Data storage

All data for **this** package lives in `~/.tailwind-plus-mcp/`:

- `cookies.json` — session cookies
- `catalog-v3.json` — UI block catalog
- `cache/` — cached component code (7-day TTL)

Legacy `mcp-for-tailwind` continues to use `~/.tailwind-mcp/` unchanged.

## Legal

- Authenticates with **your** Tailwind Plus credentials
- Does **not** bundle or redistribute Tailwind Plus components
- Does **not** bypass licensing
- Templates/kits/Catalyst are catalogued as metadata; zip contents are not redistributed

See [LICENSE](./LICENSE). Tailwind Labs is invited to adopt this codebase under the same license grant as the original project.

## Development

```bash
bun install
bun run dev          # watch mode
bun run build        # → ./build
bun run src/index.ts status
```

Branch for this rebrand/overhaul: `feat/tailwind-plus-mcp-unofficial`.
