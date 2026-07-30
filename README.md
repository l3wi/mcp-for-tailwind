# Tailwind Plus MCP (Unofficial)

**Unofficial** MCP server for [Tailwind Plus](https://tailwindcss.com/plus) license holders. Gives AI agents structured access to **UI Blocks** (scraped with your login), plus discovery and scaffolding for **Templates**, **Kits** (Oatmeal), and **Catalyst UI Kit**.

> Not affiliated with or endorsed by Tailwind Labs. Requires a valid Tailwind Plus license. This tool never redistributes component zips or ships Tailwind Plus source in the package.

| | |
|---|---|
| **Package** | `tailwind-plus-mcp` |
| **CLI** | `tailwind-plus-mcp` |
| **MCP server name** | `tailwind-plus-mcp-unofficial` |
| **Data directory** | `~/.tailwind-plus-mcp` |
| **Version** | `0.3.1` |
| **Repository** | https://github.com/JamesFincher/two |

Isolated from the legacy `mcp-for-tailwind` binary (`~/.tailwind-mcp`) so both can run side-by-side.

---

## For AI agents (read this first)

Every important tool response uses a standard envelope:

```json
{
  "summary": "What just happened (one sentence)",
  "data": { },
  "paths": { "label": "where files/data live" },
  "nextSteps": [
    { "action": "What you should do next", "tool": "optional_tool_name", "detail": "how" }
  ],
  "warnings": [],
  "agentNotes": []
}
```

**Always follow `nextSteps` and `paths` instead of inventing locations.**

### Recommended workflows

| Goal | Steps |
|------|--------|
| **Health check** | `check_status` → follow `nextSteps` |
| **UI block code** | `list_categories` → `list_blocks` → `list_variants` → `get_variant` |
| **Search** | `search` (blocks + templates + Catalyst) or `suggest` |
| **Templates / Oatmeal** | `list_templates` / `list_kits` → `get_template` → tell user to download zip from their Plus account |
| **Catalyst** | `get_catalyst_setup` → `list_catalyst` / `get_catalyst_component` / `list_catalyst_colors` → `generate_ui_kit` |
| **Custom UI kit** | `generate_ui_kit` with `outDir` → user copies Catalyst zip into `src/components/` |

### Where things go

| What | Where |
|------|--------|
| Auth cookies | `~/.tailwind-plus-mcp/cookies.json` |
| UI block catalog | `~/.tailwind-plus-mcp/catalog-v3.json` |
| Fetched code cache | `~/.tailwind-plus-mcp/cache/` |
| Scaffolded Catalyst kit | Path you pass as `outDir` (see tool `paths` in response) |
| Setup checklist inside scaffold | `{outDir}/CATALYST_SETUP.md` |
| Theme CSS / color map | `{outDir}/src/styles/theme.css`, `{outDir}/src/theme/catalyst-theme.ts` |
| Component stubs to replace | `{outDir}/src/components/*.tsx` |

### Auth

- `get_variant` needs a valid session. Use `login` (opens a browser).
- Cookies for **this** package only land in `~/.tailwind-plus-mcp`.
- First run can seed cookies/catalog from legacy `~/.tailwind-mcp` if present.

### Legal boundaries (agents must respect)

| Surface | What the MCP does | What it does **not** do |
|---------|-------------------|-------------------------|
| UI Blocks | Fetch code with the user’s credentials | Bundle code in npm package |
| Templates / Kits | Metadata, URLs, theme option discovery | Serve zip file contents |
| Catalyst | Docs APIs, colors, setup, **project scaffold** | Redistribute `catalyst-ui-kit.zip` source |

---

## Install & run

```bash
git clone https://github.com/JamesFincher/two.git
cd two
bun install
bun run build
npm link   # exposes tailwind-plus-mcp on PATH
```

```bash
tailwind-plus-mcp login
tailwind-plus-mcp sync-catalog --metadata-only
tailwind-plus-mcp status
```

### Cursor / Claude MCP config

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

Dev (run from source):

```json
{
  "mcpServers": {
    "tailwind-plus-unofficial": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/two/src/index.ts"]
    }
  }
}
```

---

## MCP tools

### UI Blocks
| Tool | Auth | Purpose |
|------|------|---------|
| `list_categories` | No | marketing / application-ui / ecommerce |
| `list_blocks` | No | Blocks in a category |
| `list_variants` | No | Variants for a block |
| `get_variant` | Yes | React / Vue / HTML source (`version`: v4\|v3.4, `theme`: light\|dark\|system) |
| `search` | No | Blocks + products |
| `suggest` | No | Context-aware block suggestions |

### Templates & kits
| Tool | Purpose |
|------|---------|
| `list_products` | All Tailwind Plus surfaces overview |
| `list_templates` | Site templates (Spotlight, Radiant, …) |
| `list_kits` | Kits (Oatmeal) |
| `get_template` | One template/kit by slug |

### Catalyst UI Kit
| Tool | Purpose |
|------|---------|
| `get_catalyst_setup` | Full Getting Started checklist from docs |
| `list_catalyst` | All 26 components (incl. Select) |
| `get_catalyst_component` | Props, exports, colors, examples |
| `list_catalyst_customizations` | Full customization inventory |
| `list_catalyst_colors` | Control + badge color systems |
| `generate_ui_kit` | Scaffold project (`outDir`, router, brandColor, …) |

### Auth / health
| Tool | Purpose |
|------|---------|
| `check_status` | Auth, catalog, cache, **workflows + nextSteps** |
| `login` | Browser login |

---

## CLI

```bash
tailwind-plus-mcp status
tailwind-plus-mcp list-products
tailwind-plus-mcp list-catalyst
tailwind-plus-mcp catalyst-setup
tailwind-plus-mcp catalyst-component button
tailwind-plus-mcp generate-ui-kit --out=./my-kit --router=next --brand=cyan
tailwind-plus-mcp get-variant --category=marketing --block=heroes --variant=simple-centered --theme=system --version=v4
tailwind-plus-mcp sync-catalog --metadata-only
```

---

## Coverage (verified against live Tailwind Plus)

- **UI Blocks:** 93 categories / 657 variants (marketing + application-ui + ecommerce)
- **Templates:** 12 site templates + **Oatmeal** kit
- **Catalyst:** 26 components, setup, colors, scaffold generator
- **Code fetch:** light/dark/system, react/vue/html, v4 → v4.3 picker

See [docs/AI_TOOL_GUIDE.md](./docs/AI_TOOL_GUIDE.md) for agent-oriented workflows.

---

## Development

```bash
bun install
bun run dev
bun run build
bunx tsc --noEmit
```

Branch for the unofficial line: `feat/tailwind-plus-mcp-unofficial`.

## License

See [LICENSE](./LICENSE). Tailwind Labs is invited to adopt this codebase under the existing grant.
