# AI Tool Guide — Tailwind Plus MCP (Unofficial)

You are an AI agent using this MCP. **Read tool envelopes carefully.**

## Response envelope

Successful (and most error) results look like:

| Field | Meaning |
|-------|---------|
| `summary` | What happened — tell the user this first |
| `data` | Payload (code, lists, guides) |
| `paths` | Filesystem / URL locations — **use these, do not invent paths** |
| `nextSteps[]` | Ordered actions: `{ action, tool?, detail? }` |
| `warnings[]` | Constraints (auth, stubs, licensing) |
| `agentNotes[]` | Standing rules |

If `nextSteps` includes a `tool` field, call that tool next unless the user redirected you.

## Standing rules

1. **Data dir** is always `~/.tailwind-plus-mcp` for this server (not `~/.tailwind-mcp`).
2. **UI block source** only via `get_variant` after auth.
3. **Templates / kits / Catalyst zips** are account downloads — never claim you “have the zip.”
4. **`generate_ui_kit`** creates stubs + setup only. User must copy licensed Catalyst files into `src/components/`.
5. Prefer **documented Catalyst `color` props** over inventing utility color classes.
6. HTML blocks may need **Tailwind Plus Elements** — honor `data.notes` / `dependencies`.

## Bootstrap

```
1. check_status
2. If auth bad → login (user must be at the machine)
3. If catalog empty → tell user to run: tailwind-plus-mcp sync-catalog --metadata-only
4. Proceed with the workflow that matches the request
```

## Workflow A — UI block into a project

```
list_categories
list_blocks(category)
list_variants(category, block)
get_variant(category, block, variant, format, version="v4", theme)
→ Read summary + data.code
→ Install data.dependencies
→ Write file in user project
→ Follow data.notes
```

Themes: `light` | `dark` | `system` (system includes `dark:` dual-mode classes).  
Version: `v4` resolves to latest picker label (e.g. v4.3).

## Workflow B — Template or Oatmeal kit

```
list_templates / list_kits
get_template(slug)
→ Give user product URL from data
→ Instruct download from their Tailwind Plus account
→ Do not invent component file trees for the zip
```

## Workflow C — Catalyst / custom UI kit

```
get_catalyst_setup                    # what Catalyst requires
list_catalyst_customizations          # full option inventory
list_catalyst_colors                  # color prop systems
get_catalyst_component(slug)          # API for one component
generate_ui_kit(outDir, router, brandColor, lang)
→ Tell user paths.projectRoot and paths.setupDoc
→ User: npm install
→ User: download zip (paths.catalystDownload)
→ User: copy components into paths.componentsDir (replace STUBs)
→ Import paths.themeCss
```

After `generate_ui_kit`, **always** surface:

- `paths.projectRoot`
- `paths.setupDoc` (`CATALYST_SETUP.md`)
- `nextSteps` in order

## Workflow D — “What can Tailwind Plus do?”

```
list_products
check_status   # includes workflow map in data.workflow
```

## Tool map (short)

| Tool | When |
|------|------|
| `check_status` | Start of session / after errors |
| `login` | AUTH_REQUIRED |
| `list_*` / `search` / `suggest` | Discovery |
| `get_variant` | Need UI block source |
| `get_template` | Template/kit metadata |
| `get_catalyst_*` / `list_catalyst_*` | UI Kit docs surface |
| `generate_ui_kit` | Scaffold custom kit project |

## Common errors

| Signal | Your response |
|--------|----------------|
| `AUTH_REQUIRED` | Call `login`, wait for user, retry |
| `CATALOG_EMPTY` / no blocks | Ask user for `sync-catalog --metadata-only` |
| `BLOCK_NOT_FOUND` | `list_blocks` then retry |
| `VARIANT_NOT_FOUND` | `list_variants` then retry |
| Scaffold STUB throws | User must copy Catalyst zip files into `src/components/` |

## Do not

- Mix paths with legacy `mcp-for-tailwind` (`~/.tailwind-mcp`) unless seeding was intentional.
- Paste entire catalogs into chat when a tool can query them.
- Claim Catalyst/template source is “included” in the MCP package.
