/**
 * Static + refreshable catalog of Tailwind Plus product surfaces beyond UI blocks.
 * Templates, kits (Oatmeal), and Catalyst are primarily zip/download products;
 * this layer gives LLMs accurate discovery, links, and stack metadata.
 */
import type { CatalystComponentInfo, ProductsCatalog, TemplateInfo } from "../types/index.ts";
import { BASE_URL, TEMPLATES_URL, UI_KIT_URL } from "../config.ts";
import {
  CATALYST_COMPONENTS as CATALYST_FULL,
  CATALYST_DOCS_BASE,
  getCatalystComponent as getCatalystFull,
} from "./catalyst.ts";

const CATALYST_DOCS_URL = CATALYST_DOCS_BASE;

export const PRODUCT_SURFACE_NOTES = [
  "UI Blocks: copy-paste React / Vue / HTML snippets via get_variant (requires auth).",
  "Templates & kits: full Next.js projects delivered as zip downloads from your Tailwind Plus account — this MCP catalogs them and links to product pages; it does not redistribute zip contents.",
  "Catalyst: React component starter kit (zip). Docs live at catalyst.tailwindui.com; this MCP lists components and doc URLs.",
  "HTML UI Blocks with interactivity use Tailwind Plus Elements (vanilla custom elements) — see notes on fetched HTML snippets.",
  "Tailwind Plus currently targets Tailwind CSS v4.3 (latest). Use version='v4' to pick the newest v4 snippet on each block page.",
] as const;

export const TEMPLATES: TemplateInfo[] = [
  {
    id: "oatmeal",
    name: "Oatmeal",
    slug: "oatmeal",
    kind: "kit",
    tagline: "SaaS marketing kit",
    description:
      "Multi-theme marketing site kit with 50+ components, 100+ icons, four color schemes, and three font options. Built with Tailwind CSS and Tailwind Plus Elements. Mix-and-match sections or start from pre-built example pages.",
    url: `${BASE_URL}/kits/oatmeal`,
    previewUrl: `${BASE_URL}/kits/oatmeal/preview`,
    stack: ["Next.js 16", "Tailwind CSS v4.3", "Tailwind Plus Elements v1", "React 19", "TypeScript 5.9"],
    priceNote: "$99 or included with Tailwind Plus",
  },
  {
    id: "spotlight",
    name: "Spotlight",
    slug: "spotlight",
    kind: "template",
    tagline: "Personal website template",
    description: "Personal website with blog, projects, and dark mode — built with React and Next.js.",
    url: `${TEMPLATES_URL}/spotlight`,
    stack: ["Next.js", "React", "Tailwind CSS"],
    priceNote: "$99 or included with Tailwind Plus",
  },
  {
    id: "radiant",
    name: "Radiant",
    slug: "radiant",
    kind: "template",
    tagline: "SaaS marketing template",
    description: "Multi-page SaaS marketing site with animations and a Sanity-powered blog.",
    url: `${TEMPLATES_URL}/radiant`,
    stack: ["Next.js", "React", "Tailwind CSS", "Sanity"],
    priceNote: "$99 or included with Tailwind Plus",
  },
  {
    id: "compass",
    name: "Compass",
    slug: "compass",
    kind: "template",
    tagline: "Course template",
    description: "Online course starter with picture-in-picture video, VTT transcripts, and Markdown authoring.",
    url: `${TEMPLATES_URL}/compass`,
    stack: ["Next.js", "React", "Tailwind CSS"],
    priceNote: "$99 or included with Tailwind Plus",
  },
  {
    id: "salient",
    name: "Salient",
    slug: "salient",
    kind: "template",
    tagline: "SaaS marketing template",
    description: "SaaS landing page template for announcing a product.",
    url: `${TEMPLATES_URL}/salient`,
    stack: ["Next.js", "React", "Tailwind CSS"],
    priceNote: "$99 or included with Tailwind Plus",
  },
  {
    id: "studio",
    name: "Studio",
    slug: "studio",
    kind: "template",
    tagline: "Agency template",
    description: "Multi-page agency site with Framer Motion and MDX case studies.",
    url: `${TEMPLATES_URL}/studio`,
    stack: ["Next.js", "React", "Tailwind CSS", "Framer Motion", "MDX"],
    priceNote: "$99 or included with Tailwind Plus",
  },
  {
    id: "primer",
    name: "Primer",
    slug: "primer",
    kind: "template",
    tagline: "Info product template",
    description: "Landing page for courses or ebooks.",
    url: `${TEMPLATES_URL}/primer`,
    stack: ["Next.js", "React", "Tailwind CSS"],
    priceNote: "$99 or included with Tailwind Plus",
  },
  {
    id: "protocol",
    name: "Protocol",
    slug: "protocol",
    kind: "template",
    tagline: "API reference template",
    description: "API documentation template powered by MDX.",
    url: `${TEMPLATES_URL}/protocol`,
    stack: ["Next.js", "React", "Tailwind CSS", "MDX"],
    priceNote: "$99 or included with Tailwind Plus",
  },
  {
    id: "commit",
    name: "Commit",
    slug: "commit",
    kind: "template",
    tagline: "Changelog template",
    description: "Changelog site managed from a single markdown file.",
    url: `${TEMPLATES_URL}/commit`,
    stack: ["Next.js", "React", "Tailwind CSS", "MDX"],
    priceNote: "$99 or included with Tailwind Plus",
  },
  {
    id: "transmit",
    name: "Transmit",
    slug: "transmit",
    kind: "template",
    tagline: "Podcast template",
    description: "Professional podcast website template.",
    url: `${TEMPLATES_URL}/transmit`,
    stack: ["Next.js", "React", "Tailwind CSS"],
    priceNote: "$99 or included with Tailwind Plus",
  },
  {
    id: "pocket",
    name: "Pocket",
    slug: "pocket",
    kind: "template",
    tagline: "App marketing template",
    description: "Mobile app marketing site with Framer Motion interactions.",
    url: `${TEMPLATES_URL}/pocket`,
    stack: ["Next.js", "React", "Tailwind CSS", "Framer Motion"],
    priceNote: "$99 or included with Tailwind Plus",
  },
  {
    id: "syntax",
    name: "Syntax",
    slug: "syntax",
    kind: "template",
    tagline: "Documentation template",
    description: "Product documentation website template.",
    url: `${TEMPLATES_URL}/syntax`,
    stack: ["Next.js", "React", "Tailwind CSS"],
    priceNote: "$99 or included with Tailwind Plus",
  },
  {
    id: "keynote",
    name: "Keynote",
    slug: "keynote",
    kind: "template",
    tagline: "Conference template",
    description: "Conference / event marketing website template.",
    url: `${TEMPLATES_URL}/keynote`,
    stack: ["Next.js", "React", "Tailwind CSS"],
    priceNote: "$99 or included with Tailwind Plus",
  },
];

/** Catalyst components — full docs set including Select (was missing). */
export const CATALYST_COMPONENTS: CatalystComponentInfo[] = CATALYST_FULL.map((c) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  group: c.group,
  docsUrl: c.docsUrl,
  description: c.features.join("; "),
}));

export function buildProductsCatalog(): ProductsCatalog {
  return {
    version: "1.0.0",
    generatedAt: Date.now(),
    lastUpdatedAt: Date.now(),
    templates: TEMPLATES,
    catalyst: CATALYST_COMPONENTS,
    notes: [...PRODUCT_SURFACE_NOTES],
  };
}

export function getTemplate(slug: string): TemplateInfo | undefined {
  return TEMPLATES.find((t) => t.slug === slug || t.id === slug);
}

export function getCatalystComponent(slug: string): CatalystComponentInfo | undefined {
  const full = getCatalystFull(slug);
  if (!full) return undefined;
  return {
    id: full.id,
    name: full.name,
    slug: full.slug,
    group: full.group,
    docsUrl: full.docsUrl,
    description: full.features.join("; "),
  };
}

export { getCatalystFull };

export function listKits(): TemplateInfo[] {
  return TEMPLATES.filter((t) => t.kind === "kit");
}

export function listTemplatesOnly(): TemplateInfo[] {
  return TEMPLATES.filter((t) => t.kind === "template");
}

export function productOverview() {
  return {
    surfaces: [
      {
        id: "ui-blocks",
        name: "UI Blocks",
        description: "500+ copy-paste components in React, Vue, and HTML across marketing, application-ui, and ecommerce.",
        url: `${BASE_URL}/ui-blocks`,
        access: "get_variant (authenticated scrape)",
      },
      {
        id: "templates",
        name: "Templates",
        description: "Full Next.js site templates (Spotlight, Radiant, Compass, …).",
        url: TEMPLATES_URL,
        access: "list_templates / get_template (metadata + account download)",
        count: listTemplatesOnly().length,
      },
      {
        id: "kits",
        name: "Kits",
        description: "Mix-and-match marketing kits such as Oatmeal.",
        url: `${BASE_URL}/kits/oatmeal`,
        access: "list_kits / get_template",
        count: listKits().length,
      },
      {
        id: "catalyst",
        name: "Catalyst UI Kit",
        description: "Production React component starter kit with Headless UI.",
        url: UI_KIT_URL,
        docs: CATALYST_DOCS_URL,
        access: "list_catalyst / get_catalyst_component",
        count: CATALYST_COMPONENTS.length,
      },
    ],
    notes: PRODUCT_SURFACE_NOTES,
  };
}
