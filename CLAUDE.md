# CLAUDE.md — Tailwind Plus MCP (Unofficial)

## For agents using this server as an MCP

Tool results include `summary`, `paths`, and `nextSteps`. **Follow them.**  
Full agent guide: [docs/AI_TOOL_GUIDE.md](./docs/AI_TOOL_GUIDE.md).

Data: `~/.tailwind-plus-mcp` · Package: `tailwind-plus-mcp` · Repo: https://github.com/JamesFincher/two

## Developing this repo

```bash
bun install
bun run build
bun run src/index.ts status
bunx tsc --noEmit
```

### Layout

```
src/
├── agent-response.ts     # Envelope: summary / paths / nextSteps
├── brand.ts
├── index.ts              # CLI
├── server.ts             # MCP tools
├── config.ts             # Isolated paths
├── browser/              # Puppeteer fetch (UI blocks)
├── cache/
├── data/
│   ├── products.ts       # Templates + kits overview
│   ├── catalyst.ts       # Full Catalyst docs model
│   ├── catalog-manager.ts
│   └── search.ts
└── generate/
    └── ui-kit.ts         # generate_ui_kit scaffold
```

### Rules when changing code

- Keep `agentEnvelope` on tools that change state or return large payloads.
- Never commit cookies, cache, or Catalyst/template source.
- Do not reintroduce `mcp-for-tailwind` as the package name on this branch.
- UI block scrapers: tolerate version label churn via `page-controls`.

### Key tools for agent UX

`check_status`, `get_variant`, `generate_ui_kit`, `get_catalyst_setup` — all emit next-step guidance.
