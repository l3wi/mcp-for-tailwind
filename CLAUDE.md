# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tailwind MCP is an MCP (Model Context Protocol) server that provides programmatic access to Tailwind Plus (formerly Tailwind UI) components. It uses Puppeteer to fetch authenticated component code from tailwindcss.com/plus with rate limiting and progressive caching.

## Commands

```bash
# Development
bun run dev              # Start server with watch mode
bun run start            # Start server without watch

# Build
bun run build            # Build to ./build for distribution

# CLI Commands
bun run src/index.ts login                    # Interactive browser login
bun run src/index.ts serve [port]             # Start MCP server (default: 3000)
bun run src/index.ts status                   # Check auth/catalog/cache status
bun run src/index.ts sync-catalog             # Sync catalog metadata
bun run src/index.ts sync-catalog --context=marketing  # Sync single context
bun run src/index.ts prefetch                 # Pre-fetch all component code
bun run src/index.ts prefetch --context=ecommerce --format=react
bun run src/index.ts clear-cache              # Clear all cached components
bun run src/index.ts clear-cache --expired    # Clear only expired entries
```

## Architecture

```
src/
├── index.ts                 # CLI entry point
├── server.ts                # Hono HTTP server + 4 MCP tools
├── config.ts                # Constants, user-agents, paths
├── browser/
│   ├── browser.ts           # Core: getBrowser, setupPage, login, checkAuthState
│   ├── catalog-fetcher.ts   # Phase 1: Discover categories/blocks
│   ├── component-fetcher.ts # Phase 2: Fetch component code
│   └── variant-fetcher.ts   # Variant-level code fetching with format/version selection
├── cache/
│   └── cache-manager.ts     # TTL-based cache with manifest
├── data/
│   ├── catalog.ts           # Search/suggest functions + static fallback
│   └── catalog-manager.ts   # Dynamic catalog persistence
├── types/
│   └── index.ts             # TypeScript interfaces
└── utils/
    ├── rate-limiter.ts      # Request throttling
    └── retry.ts             # Exponential backoff
```

### Key Concepts

- **Contexts**: Three product categories - `marketing`, `application-ui`, `ecommerce`
- **Formats**: Code output as `react`, `vue`, or `html`
- **Versions**: Tailwind CSS `v4.1` or `v3.4`
- **Two-Phase Fetching**:
  - Phase 1: Catalog sync (metadata only) - fast, builds category list
  - Phase 2: Component fetch (actual code) - slower, on-demand with caching
- **Authentication**: Cookies stored in `~/.tailwind-mcp/cookies.json`
- **Dynamic Catalog**: Saved to `~/.tailwind-mcp/catalog.json`, refreshes after 24h
- **Cache**: Components cached in `~/.tailwind-mcp/cache/` with 7-day TTL

### MCP Tools

The server exposes 4 tools via `/mcp` endpoint:

1. `list_categories` - Browse available component categories
2. `search_components` - Keyword search across categories
3. `get_component` - Fetch actual component code (requires auth)
4. `suggest_components` - Context-aware suggestions

### Tech Stack

- **Hono** - HTTP server with MCP transport via `@hono/mcp`
- **Puppeteer** - Browser automation for authenticated fetching
- **Zod** - Schema validation for tool inputs
- **@modelcontextprotocol/sdk** - MCP server implementation

### Rate Limiting & Resilience

- 2 seconds between requests to avoid blocking
- Realistic Chrome user-agents (rotated randomly)
- Retry with exponential backoff (3 attempts, 1s→2s→4s)
- Progressive saving after each successful fetch
