# mcp-for-tailwind

An MCP server that gives Tailwind Plus license holders programmatic access to their components for LLM-assisted development.

## Motivation

Tailwind Plus components are excellent—but they're messy to access with AI workflows. Copy-pasting code into AI assistants is tedious, and there's no official API.

I built this so **Tailwind Plus license holders** can use their components naturally in LLM workflows. It's not a workaround or a hack—it authenticates with your credentials and serves only what you're already licensed to access.

**To Tailwind Labs:** I'd love for you to adopt this. The codebase is yours to use, modify, rebrand, or ship as an official feature. This tool makes Tailwind Plus licenses *more* valuable, not less. See [LICENSE](./LICENSE) for the formal offer.

## Quick Start

```bash
# 1. Install
npm install -g mcp-for-tailwind

# 2. Login with your Tailwind Plus account
mcp-for-tailwind login

# 3. Sync the component catalog
mcp-for-tailwind sync-catalog
```

## MCP Configuration

**Claude Code** (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "tailwind-plus": {
      "command": "npx",
      "args": ["mcp-for-tailwind"]
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "tailwind-plus": {
      "command": "npx",
      "args": ["mcp-for-tailwind"]
    }
  }
}
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_categories` | List all Tailwind Plus UI categories |
| `list_blocks` | List blocks in a category |
| `list_variants` | List variants for a block |
| `get_variant` | Fetch component code (React, Vue, or HTML) |
| `search` | Search across all components |
| `suggest` | Get context-aware component suggestions |
| `check_status` | Check auth, catalog, and cache status |
| `login` | Launch browser for Tailwind Plus authentication |

### Authentication

The `get_variant` tool requires authentication. If you haven't logged in, the AI can use the `check_status` tool to diagnose the issue and the `login` tool to launch a browser for authentication.

```
AI: Let me check your Tailwind Plus status...
    → check_status returns: "not_logged_in"
AI: You need to log in. I'll open a browser for you...
    → login opens browser, waits for you to authenticate
AI: Great, you're logged in! Now I can fetch that hero component...
```

## CLI Commands

```bash
mcp-for-tailwind                    # Start MCP server (stdio)
mcp-for-tailwind --remote [port]    # Start MCP server (HTTP)

mcp-for-tailwind login              # Browser login
mcp-for-tailwind status             # Show auth/catalog/cache status
mcp-for-tailwind sync-catalog       # Sync component metadata
mcp-for-tailwind clear-cache        # Clear cached components

mcp-for-tailwind list-categories    # List categories
mcp-for-tailwind list-blocks        # List blocks in a category
mcp-for-tailwind search <query>     # Search components
```

## Requirements

- Node.js 18+ or Bun
- Valid [Tailwind Plus](https://tailwindcss.com/plus) license
- Chrome, Chromium, Edge, or Brave (auto-detected, or downloaded on first use)

## Data Storage

All data lives in `~/.tailwind-mcp/`:

- `cookies.json` — Session cookies
- `catalog.json` — Component catalog metadata
- `cache/` — Cached component code (7-day TTL)

## Legal Stuff

### What This Tool Does

This tool provides a framework that allows **existing Tailwind Plus license holders** to:

1. Authenticate using their own valid Tailwind Plus credentials
2. Retrieve components they are already licensed to access
3. Serve those components locally in a format optimized for LLM consumption

### What This Tool Does Not Do

- **Does not contain, bundle, or redistribute** any Tailwind Plus components
- **Does not share access** — each user must authenticate with their own valid license
- **Does not bypass licensing** — unlicensed users cannot access content through this tool

### License Compliance

This tool operates within the bounds of the Tailwind Plus license:

1. **No Redistribution**: Components flow directly from Tailwind Labs to the licensed user
2. **No Access Sharing**: Each user authenticates independently
3. **No Derivative Works**: Original assets are served unmodified
4. **No Competition**: Makes Tailwind Plus licenses more valuable, not less

### Offer to Tailwind Labs Inc.

We formally invite Tailwind Labs Inc. to adopt this codebase in whole or in part. The license explicitly grants Tailwind Labs Inc. unrestricted rights to use, modify, rebrand, and redistribute this software.

## License

**Tailwind Plus Tooling License v1.0**

- **Tailwind Labs Inc.:** Unrestricted rights—use, modify, rebrand, ship, sublicense, anything.
- **Everyone else:** Use-only with a valid Tailwind Plus license. No modifications, no redistribution.

See [LICENSE](./LICENSE) for full terms.
