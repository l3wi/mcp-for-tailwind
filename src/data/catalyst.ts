/**
 * Catalyst UI Kit — full feature surface from public docs
 * (https://catalyst.tailwindui.com/docs).
 *
 * This module does NOT embed Catalyst source files (those ship in the
 * licensed zip). It catalogs every customization/feature the docs describe
 * so the MCP can guide setup, theming, and project scaffolding.
 */

export const CATALYST_DOCS_BASE = "https://catalyst.tailwindui.com/docs";
export const CATALYST_PRODUCT_URL = "https://tailwindcss.com/plus/ui-kit";
export const CATALYST_DOWNLOAD_URL = "https://tailwindcss.com/plus/templates/catalyst/download";
export const CATALYST_DEMO_URL = "https://catalyst-demo.tailwindui.com";

/** Adaptive colors that flip between light/dark for contrast */
export const CATALYST_ADAPTIVE_COLORS = ["dark/zinc", "dark/white"] as const;

/**
 * Solid color variants used by Button, Checkbox, Switch, Radio, etc.
 * Docs: adaptive pair + 20 solids (dark, zinc, white, and the Tailwind palette).
 */
export const CATALYST_SOLID_COLORS = [
  "dark",
  "zinc",
  "white",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const;

/** Button / Checkbox / Switch / Radio color prop accepts adaptive + solid */
export const CATALYST_CONTROL_COLORS = [
  ...CATALYST_ADAPTIVE_COLORS,
  ...CATALYST_SOLID_COLORS,
] as const;

/**
 * Badge colors (docs: 18 badge colors that auto-adapt light/dark).
 * Docs examples + color reference use the palette without dark/white adaptive pair.
 */
export const CATALYST_BADGE_COLORS = [
  "zinc",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const;

export type CatalystLang = "typescript" | "javascript";
export type CatalystRouter = "next" | "remix" | "inertia" | "plain";

export interface CatalystProp {
  name: string;
  default?: string;
  description: string;
}

export interface CatalystComponentDef {
  id: string;
  name: string;
  slug: string;
  group: "Layouts" | "Forms" | "Elements" | "Typography" | "Overlays" | "Navigation" | "Data display";
  docsUrl: string;
  /** Primary file name inside the zip (without extension) */
  file: string;
  /** Named exports used in docs examples */
  exports: string[];
  props: CatalystProp[];
  /** color prop options if any */
  colors?: readonly string[];
  defaultColor?: string;
  /** Docs call out className as a sharp knife — layout only */
  classNameNotes?: string;
  /** Icon size guidance from Getting Started */
  iconSize?: "16" | "20" | "mixed";
  features: string[];
  examples: string[];
  related?: string[];
}

export interface CatalystSetupStep {
  id: string;
  title: string;
  required: boolean;
  description: string;
  commands?: string[];
  code?: { filename: string; language: string; content: string };
  docsAnchor?: string;
}

/** Getting started — every feature called out in /docs */
export const CATALYST_SETUP_STEPS: CatalystSetupStep[] = [
  {
    id: "project",
    title: "Have a Tailwind CSS + React project",
    required: true,
    description:
      "Catalyst is React-only and framework-agnostic (Next.js, Remix, Inertia, or plain React). It assumes Tailwind’s default theme (spacing, colors, shadows). Heavy theme overrides require editing components.",
    docsAnchor: "#before-you-start",
  },
  {
    id: "download",
    title: "Download catalyst-ui-kit.zip from your Tailwind Plus account",
    required: true,
    description:
      "Unzip and copy either the javascript/ or typescript/ component folder into your project’s components directory. This MCP never redistributes zip contents — you must download with your license.",
    docsAnchor: "#adding-catalyst-to-your-project",
  },
  {
    id: "dependencies",
    title: "Install runtime dependencies",
    required: true,
    description: "Required packages used by Catalyst components.",
    commands: [
      "npm install @headlessui/react motion clsx",
      "npm install tailwindcss@latest",
    ],
  },
  {
    id: "link",
    title: "Wire the Link component to your router",
    required: true,
    description:
      "Default Link is a plain <a>. Replace with Next.js, Remix, or Inertia Link so navbar/sidebar/button hrefs use client-side navigation. Wrap with Headless.DataInteractive.",
    docsAnchor: "#client-side-router-integration",
  },
  {
    id: "inter",
    title: "Optional: Inter font via Tailwind v4 @theme",
    required: false,
    description:
      "Catalyst is designed with Inter. Set --font-sans (and cv11 feature settings) in @theme, or use your framework’s font API.",
    code: {
      filename: "app.css",
      language: "css",
      content: `@theme {
  --font-sans: Inter, sans-serif;
  --font-sans--font-feature-settings: "cv11";
}`,
    },
    commands: [
      '<!-- CDN fallback --> <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />',
    ],
  },
  {
    id: "heroicons",
    title: "Optional: Heroicons",
    required: false,
    description:
      "Most controls use 16×16 solid icons (@heroicons/react/16/solid). NavbarItem and SidebarItem use 20×20 (@heroicons/react/20/solid). Custom icons need data-slot=\"icon\".",
    commands: ["npm install @heroicons/react"],
  },
  {
    id: "theming",
    title: "Theming & customization boundaries",
    required: false,
    description:
      "Prefer documented color props (Button, Badge, Checkbox, Switch, Radio). Use className only for layout (max-w-*, flex gaps) — docs warn it is a sharp knife. For brand palettes, extend Tailwind @theme and/or edit copied component source (licensed).",
  },
];

export const CATALYST_LINK_SNIPPETS: Record<
  CatalystRouter,
  { filename: string; content: string }
> = {
  plain: {
    filename: "link.tsx",
    content: `import * as Headless from '@headlessui/react'
import React, { forwardRef } from 'react'

export const Link = forwardRef(function Link(
  props: { href: string } & React.ComponentPropsWithoutRef<'a'>,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  return (
    <Headless.DataInteractive>
      <a {...props} ref={ref} />
    </Headless.DataInteractive>
  )
})
`,
  },
  next: {
    filename: "link.tsx",
    content: `import * as Headless from '@headlessui/react'
import NextLink, { type LinkProps } from 'next/link'
import React, { forwardRef } from 'react'

export const Link = forwardRef(function Link(
  props: LinkProps & React.ComponentPropsWithoutRef<'a'>,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  return (
    <Headless.DataInteractive>
      <NextLink {...props} ref={ref} />
    </Headless.DataInteractive>
  )
})
`,
  },
  remix: {
    filename: "link.tsx",
    content: `import * as Headless from '@headlessui/react'
import { Link as RemixLink, type LinkProps } from '@remix-run/react'
import React, { forwardRef } from 'react'

export const Link = forwardRef(function Link(
  props: { href: string | LinkProps['to'] } & Omit<LinkProps, 'to'>,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  return (
    <Headless.DataInteractive>
      <RemixLink {...props} to={props.href} ref={ref} />
    </Headless.DataInteractive>
  )
})
`,
  },
  inertia: {
    filename: "link.tsx",
    content: `import * as Headless from '@headlessui/react'
import { Link as InertiaLink, type InertiaLinkProps } from '@inertiajs/react'
import React, { forwardRef } from 'react'

export const Link = forwardRef(function Link(
  props: InertiaLinkProps,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  return (
    <Headless.DataInteractive>
      <InertiaLink {...props} ref={ref} />
    </Headless.DataInteractive>
  )
})
`,
  },
};

function p(name: string, description: string, def?: string): CatalystProp {
  return { name, description, default: def };
}

/** Full component inventory from docs nav (26 entries including Select). */
export const CATALYST_COMPONENTS: CatalystComponentDef[] = [
  {
    id: "sidebar-layout",
    name: "Sidebar layout",
    slug: "sidebar-layout",
    group: "Layouts",
    docsUrl: `${CATALYST_DOCS_BASE}/sidebar-layout`,
    file: "sidebar-layout",
    exports: ["SidebarLayout"],
    props: [
      p("navbar", "Navbar content for mobile/top bar"),
      p("sidebar", "Sidebar menu content"),
      p("children", "Main page content"),
    ],
    iconSize: "mixed",
    features: ["Combines Sidebar + Navbar", "Responsive mobile sidebar"],
    examples: ["Full app shell with dropdown account menu"],
    related: ["sidebar", "navbar"],
  },
  {
    id: "stacked-layout",
    name: "Stacked layout",
    slug: "stacked-layout",
    group: "Layouts",
    docsUrl: `${CATALYST_DOCS_BASE}/stacked-layout`,
    file: "stacked-layout",
    exports: ["StackedLayout"],
    props: [
      p("navbar", "Top navbar content"),
      p("sidebar", "Optional mobile sidebar content"),
      p("children", "Main page content"),
    ],
    features: ["Horizontal nav shell", "Optional mobile sidebar"],
    examples: ["Marketing-style app chrome"],
    related: ["navbar", "sidebar"],
  },
  {
    id: "auth-layout",
    name: "Auth layout",
    slug: "auth-layout",
    group: "Layouts",
    docsUrl: `${CATALYST_DOCS_BASE}/auth-layout`,
    file: "auth-layout",
    exports: ["AuthLayout"],
    props: [p("children", "Centered page content (login/register forms)")],
    features: ["Centered auth pages", "Works with Field/Input/Checkbox/Button"],
    examples: ["Login page", "Registration", "Forgot password"],
    related: ["input", "button", "checkbox", "heading", "text"],
  },
  {
    id: "alert",
    name: "Alert",
    slug: "alert",
    group: "Overlays",
    docsUrl: `${CATALYST_DOCS_BASE}/alert`,
    file: "alert",
    exports: ["Alert", "AlertTitle", "AlertDescription", "AlertBody", "AlertActions"],
    props: [
      p("open", "Controlled open state"),
      p("onClose", "Close handler"),
      p("size", "Dialog size variant (docs examples)", "md"),
    ],
    features: ["Confirm dialogs", "Headless UI Dialog based"],
    examples: ["Refund confirmation"],
    related: ["dialog", "button"],
  },
  {
    id: "avatar",
    name: "Avatar",
    slug: "avatar",
    group: "Elements",
    docsUrl: `${CATALYST_DOCS_BASE}/avatar`,
    file: "avatar",
    exports: ["Avatar", "AvatarButton"],
    props: [
      p("src", "Image URL"),
      p("initials", "Fallback initials when no src"),
      p("square", "Square instead of round", "false"),
      p("href", "AvatarButton link target"),
      p("className", "Size via size-* utilities e.g. size-6/8/10"),
    ],
    classNameNotes: "Use className for size (size-6, size-8, size-10).",
    features: ["Image or initials", "AvatarButton for clickable avatars"],
    examples: ["Sized avatars", "Initials fallback", "As button/link"],
  },
  {
    id: "badge",
    name: "Badge",
    slug: "badge",
    group: "Elements",
    docsUrl: `${CATALYST_DOCS_BASE}/badge`,
    file: "badge",
    exports: ["Badge", "BadgeButton"],
    props: [
      p("color", "Badge color (18 adaptive palette colors)", "zinc"),
      p("href", "BadgeButton link target"),
    ],
    colors: CATALYST_BADGE_COLORS,
    defaultColor: "zinc",
    features: ["18 colors with light/dark contrast", "BadgeButton for interactive badges"],
    examples: ["Status labels", "Badge as button"],
  },
  {
    id: "button",
    name: "Button",
    slug: "button",
    group: "Elements",
    docsUrl: `${CATALYST_DOCS_BASE}/button`,
    file: "button",
    exports: ["Button"],
    props: [
      p("type", "button | submit | reset", "button"),
      p("color", "Solid or adaptive color variant", "dark/zinc"),
      p("outline", "Outline secondary style", "false"),
      p("plain", "Plain tertiary style", "false"),
      p("disabled", "Disabled state", "false"),
      p("href", "Render as Link when set"),
    ],
    colors: CATALYST_CONTROL_COLORS,
    defaultColor: "dark/zinc",
    iconSize: "16",
    features: ["Solid / outline / plain", "Link via href", "Icon children with data-slot"],
    examples: ["Primary save", "Outline draft", "Plain cancel", "With icon"],
  },
  {
    id: "checkbox",
    name: "Checkbox",
    slug: "checkbox",
    group: "Forms",
    docsUrl: `${CATALYST_DOCS_BASE}/checkbox`,
    file: "checkbox",
    exports: ["Checkbox", "CheckboxField", "CheckboxGroup"],
    props: [
      p("color", "Control color", "dark/zinc"),
      p("disabled", "Disable control", "false"),
      p("name", "Form name"),
      p("value", "Form value"),
      p("defaultChecked", "Uncontrolled initial"),
      p("checked", "Controlled state"),
      p("onChange", "Change handler"),
    ],
    colors: CATALYST_CONTROL_COLORS,
    defaultColor: "dark/zinc",
    features: ["Field + Label + Description composition", "Group layout", "Adaptive + solid colors"],
    examples: ["Standalone", "With label/description", "Disabled", "Color variants"],
    related: ["fieldset"],
  },
  {
    id: "combobox",
    name: "Combobox",
    slug: "combobox",
    group: "Forms",
    docsUrl: `${CATALYST_DOCS_BASE}/combobox`,
    file: "combobox",
    exports: ["Combobox", "ComboboxOption", "ComboboxLabel", "ComboboxDescription"],
    props: [
      p("disabled", "Disable", "false"),
      p("invalid", "Validation error style", "false"),
      p("anchor", "Dropdown position", "bottom"),
      p("name", "Form name"),
      p("options", "Options collection"),
      p("filter", "Custom filter function"),
      p("displayValue", "Stringify selected option"),
      p("defaultValue", "Uncontrolled initial"),
      p("value", "Controlled value"),
      p("onChange", "Change handler"),
      p("placeholder", "Empty placeholder"),
    ],
    iconSize: "16",
    features: ["Searchable select", "Filter + displayValue", "Invalid state", "Works with Field/Label"],
    examples: ["Basic people picker", "With descriptions", "Controlled"],
    related: ["fieldset", "listbox"],
  },
  {
    id: "description-list",
    name: "Description list",
    slug: "description-list",
    group: "Data display",
    docsUrl: `${CATALYST_DOCS_BASE}/description-list`,
    file: "description-list",
    exports: ["DescriptionList", "DescriptionTerm", "DescriptionDetails"],
    props: [p("children", "Terms and details pairs")],
    features: ["Definition lists for detail screens"],
    examples: ["Order details"],
  },
  {
    id: "dialog",
    name: "Dialog",
    slug: "dialog",
    group: "Overlays",
    docsUrl: `${CATALYST_DOCS_BASE}/dialog`,
    file: "dialog",
    exports: ["Dialog", "DialogTitle", "DialogDescription", "DialogBody", "DialogActions"],
    props: [
      p("open", "Controlled open"),
      p("onClose", "Close handler"),
      p("size", "Width size token", "lg"),
    ],
    features: ["Modal dialogs", "Composable title/body/actions"],
    examples: ["Create form modal"],
    related: ["alert", "button"],
  },
  {
    id: "divider",
    name: "Divider",
    slug: "divider",
    group: "Elements",
    docsUrl: `${CATALYST_DOCS_BASE}/divider`,
    file: "divider",
    exports: ["Divider"],
    props: [p("soft", "Softer border style", "false")],
    features: ["Horizontal rule styling"],
    examples: ["Section break"],
  },
  {
    id: "dropdown",
    name: "Dropdown",
    slug: "dropdown",
    group: "Overlays",
    docsUrl: `${CATALYST_DOCS_BASE}/dropdown`,
    file: "dropdown",
    exports: [
      "Dropdown",
      "DropdownButton",
      "DropdownMenu",
      "DropdownItem",
      "DropdownHeader",
      "DropdownSection",
      "DropdownHeading",
      "DropdownDivider",
      "DropdownLabel",
      "DropdownDescription",
      "DropdownShortcut",
    ],
    props: [
      p("color", "DropdownButton color", "dark/zinc"),
      p("outline", "Outline button style", "false"),
      p("plain", "Plain button style", "false"),
      p("anchor", "Menu position", "bottom"),
      p("href", "Item as link"),
      p("as", "Render DropdownButton as another component e.g. SidebarItem"),
    ],
    colors: CATALYST_CONTROL_COLORS,
    defaultColor: "dark/zinc",
    iconSize: "16",
    features: ["Menu with sections", "anchor positioning", "as prop for custom triggers", "Keyboard accessible"],
    examples: ["Account menu", "Sectioned menu", "as={SidebarItem}"],
    related: ["button", "sidebar"],
  },
  {
    id: "fieldset",
    name: "Fieldset",
    slug: "fieldset",
    group: "Forms",
    docsUrl: `${CATALYST_DOCS_BASE}/fieldset`,
    file: "fieldset",
    exports: ["Fieldset", "Legend", "FieldGroup", "Field", "Label", "Description", "ErrorMessage"],
    props: [
      p("disabled", "Disable entire field/fieldset", "false"),
    ],
    features: ["Associates labels via generated IDs", "ErrorMessage for validation", "FieldGroup spacing"],
    examples: ["Form with legend", "Error states"],
    related: ["input", "select", "textarea", "checkbox"],
  },
  {
    id: "heading",
    name: "Heading",
    slug: "heading",
    group: "Typography",
    docsUrl: `${CATALYST_DOCS_BASE}/heading`,
    file: "heading",
    exports: ["Heading", "Subheading"],
    props: [
      p("level", "Heading level 1-6"),
      p("children", "Text content"),
    ],
    features: ["Page titles", "Subheading companion"],
    examples: ["Page header"],
  },
  {
    id: "input",
    name: "Input",
    slug: "input",
    group: "Forms",
    docsUrl: `${CATALYST_DOCS_BASE}/input`,
    file: "input",
    exports: ["Input", "InputGroup"],
    props: [
      p("disabled", "Disable", "false"),
      p("invalid", "Validation error", "false"),
      p("name", "Form name"),
      p("defaultValue", "Uncontrolled"),
      p("value", "Controlled"),
      p("onChange", "Change handler"),
      p("type", "HTML input type"),
    ],
    features: ["InputGroup for leading/trailing icons", "invalid + ErrorMessage", "Works with Field/Label"],
    examples: ["Basic", "With label", "Invalid", "With icon"],
    related: ["fieldset"],
  },
  {
    id: "listbox",
    name: "Listbox",
    slug: "listbox",
    group: "Forms",
    docsUrl: `${CATALYST_DOCS_BASE}/listbox`,
    file: "listbox",
    exports: ["Listbox", "ListboxOption", "ListboxLabel", "ListboxDescription"],
    props: [
      p("disabled", "Disable", "false"),
      p("invalid", "Validation error", "false"),
      p("name", "Form name"),
      p("defaultValue", "Uncontrolled"),
      p("value", "Controlled"),
      p("onChange", "Change handler"),
      p("placeholder", "Empty text"),
    ],
    features: ["Custom select list", "Option labels/descriptions"],
    examples: ["Status picker"],
    related: ["combobox", "select", "fieldset"],
  },
  {
    id: "navbar",
    name: "Navbar",
    slug: "navbar",
    group: "Navigation",
    docsUrl: `${CATALYST_DOCS_BASE}/navbar`,
    file: "navbar",
    exports: [
      "Navbar",
      "NavbarDivider",
      "NavbarItem",
      "NavbarLabel",
      "NavbarSection",
      "NavbarSpacer",
    ],
    props: [
      p("href", "NavbarItem link"),
      p("current", "Active item state"),
      p("aria-label", "Icon-only item label"),
    ],
    iconSize: "20",
    features: ["Sections + spacer", "Icon items use 20×20 Heroicons", "Works inside layouts"],
    examples: ["Top nav with search and avatar"],
    related: ["sidebar-layout", "stacked-layout"],
  },
  {
    id: "pagination",
    name: "Pagination",
    slug: "pagination",
    group: "Navigation",
    docsUrl: `${CATALYST_DOCS_BASE}/pagination`,
    file: "pagination",
    exports: [
      "Pagination",
      "PaginationPrevious",
      "PaginationNext",
      "PaginationList",
      "PaginationPage",
      "PaginationGap",
    ],
    props: [
      p("href", "Page/previous/next link"),
      p("current", "Current page on PaginationPage"),
    ],
    features: ["Composable prev/next/list", "Gap ellipsis"],
    examples: ["Standard page list"],
  },
  {
    id: "radio",
    name: "Radio button",
    slug: "radio",
    group: "Forms",
    docsUrl: `${CATALYST_DOCS_BASE}/radio`,
    file: "radio",
    exports: ["RadioGroup", "Radio", "RadioField"],
    props: [
      p("color", "Radio color", "dark/zinc"),
      p("disabled", "Disable group or radio", "false"),
      p("name", "Form name on group"),
      p("defaultValue", "Uncontrolled selection"),
      p("value", "Controlled selection / option value"),
      p("onChange", "Group change handler"),
    ],
    colors: CATALYST_CONTROL_COLORS,
    defaultColor: "dark/zinc",
    features: ["RadioGroup + RadioField + Label", "Adaptive/solid colors"],
    examples: ["Two-option choice", "Colored radios"],
    related: ["fieldset"],
  },
  {
    id: "select",
    name: "Select",
    slug: "select",
    group: "Forms",
    docsUrl: `${CATALYST_DOCS_BASE}/select`,
    file: "select",
    exports: ["Select"],
    props: [
      p("disabled", "Disable", "false"),
      p("invalid", "Validation error", "false"),
      p("name", "Form name"),
      p("defaultValue", "Uncontrolled"),
      p("value", "Controlled"),
      p("onChange", "Change handler"),
      p("className", "Layout only e.g. max-w-40"),
    ],
    classNameNotes: "className is a sharp knife — only layout utilities like max-w-*.",
    features: ["Native select styling", "Field/Label/ErrorMessage", "Controlled mode", "Custom Headless Field layouts"],
    examples: ["Basic", "With label", "Disabled", "Invalid", "Constrained width", "Custom layout"],
    related: ["fieldset", "listbox"],
  },
  {
    id: "sidebar",
    name: "Sidebar",
    slug: "sidebar",
    group: "Navigation",
    docsUrl: `${CATALYST_DOCS_BASE}/sidebar`,
    file: "sidebar",
    exports: [
      "Sidebar",
      "SidebarHeader",
      "SidebarBody",
      "SidebarFooter",
      "SidebarSection",
      "SidebarHeading",
      "SidebarItem",
      "SidebarLabel",
      "SidebarSpacer",
    ],
    props: [
      p("href", "SidebarItem link"),
      p("current", "Active item"),
      p("as", "Polymorphic trigger e.g. DropdownButton as={SidebarItem}"),
    ],
    iconSize: "20",
    features: ["Header/body/footer slots", "Sections + headings", "data-slot=icon for custom icons", "20×20 icons"],
    examples: ["Full app sidebar", "Team dropdown in header"],
    related: ["sidebar-layout", "dropdown"],
  },
  {
    id: "switch",
    name: "Switch",
    slug: "switch",
    group: "Forms",
    docsUrl: `${CATALYST_DOCS_BASE}/switch`,
    file: "switch",
    exports: ["Switch", "SwitchField", "SwitchGroup"],
    props: [
      p("color", "Switch color", "dark/zinc"),
      p("disabled", "Disable", "false"),
      p("name", "Form name"),
      p("value", "Form value"),
      p("defaultChecked", "Uncontrolled"),
      p("checked", "Controlled"),
      p("onChange", "Change handler"),
    ],
    colors: CATALYST_CONTROL_COLORS,
    defaultColor: "dark/zinc",
    features: ["SwitchField with Label/Description", "Adaptive/solid colors"],
    examples: ["Allow embedding toggle"],
    related: ["fieldset", "checkbox"],
  },
  {
    id: "table",
    name: "Table",
    slug: "table",
    group: "Data display",
    docsUrl: `${CATALYST_DOCS_BASE}/table`,
    file: "table",
    exports: ["Table", "TableHead", "TableBody", "TableRow", "TableHeader", "TableCell"],
    props: [
      p("bleed", "Edge-to-edge table", "false"),
      p("dense", "Compact rows", "false"),
      p("grid", "Grid lines", "false"),
      p("striped", "Striped rows", "false"),
      p("className", "Cell/row layout tweaks"),
    ],
    features: ["bleed/dense/grid/striped", "Semantic table parts"],
    examples: ["Users table"],
  },
  {
    id: "text",
    name: "Text",
    slug: "text",
    group: "Typography",
    docsUrl: `${CATALYST_DOCS_BASE}/text`,
    file: "text",
    exports: ["Text", "TextLink", "Strong", "Code"],
    props: [
      p("href", "TextLink URL"),
      p("children", "Content"),
    ],
    features: ["Body copy", "Inline links", "Strong + Code"],
    examples: ["Plan upsell sentence"],
  },
  {
    id: "textarea",
    name: "Textarea",
    slug: "textarea",
    group: "Forms",
    docsUrl: `${CATALYST_DOCS_BASE}/textarea`,
    file: "textarea",
    exports: ["Textarea"],
    props: [
      p("disabled", "Disable", "false"),
      p("invalid", "Validation error", "false"),
      p("resizable", "Vertical resize", "true"),
      p("name", "Form name"),
      p("defaultValue", "Uncontrolled"),
      p("value", "Controlled"),
      p("onChange", "Change handler"),
      p("rows", "Visible rows"),
    ],
    features: ["resizable toggle", "invalid + ErrorMessage", "Field composition"],
    examples: ["Description field"],
    related: ["fieldset"],
  },
];

export function getCatalystComponent(slug: string): CatalystComponentDef | undefined {
  const s = slug.toLowerCase().replace(/\s+/g, "-");
  return CATALYST_COMPONENTS.find(
    (c) => c.slug === s || c.id === s || c.name.toLowerCase() === slug.toLowerCase()
  );
}

export function listCatalystByGroup() {
  const groups = new Map<string, CatalystComponentDef[]>();
  for (const c of CATALYST_COMPONENTS) {
    const list = groups.get(c.group) || [];
    list.push(c);
    groups.set(c.group, list);
  }
  return Object.fromEntries(groups);
}

/** Inventory of every customization surface mentioned in the docs */
export function listCatalystCustomizations() {
  return {
    setup: CATALYST_SETUP_STEPS.map((s) => ({
      id: s.id,
      title: s.title,
      required: s.required,
    })),
    language: ["typescript", "javascript"] as CatalystLang[],
    routers: ["next", "remix", "inertia", "plain"] as CatalystRouter[],
    dependencies: {
      required: ["@headlessui/react", "motion", "clsx", "tailwindcss@latest", "react"],
      optional: ["@heroicons/react"],
    },
    fonts: {
      recommended: "Inter",
      themeCss: {
        "--font-sans": "Inter, sans-serif",
        "--font-sans--font-feature-settings": '"cv11"',
      },
      cdn: "https://rsms.me/inter/inter.css",
    },
    icons: {
      package: "@heroicons/react",
      defaultSize: "16/solid",
      navbarSidebarSize: "20/solid",
      customIconAttr: 'data-slot="icon"',
    },
    colors: {
      adaptive: CATALYST_ADAPTIVE_COLORS,
      solid: CATALYST_SOLID_COLORS,
      controlComponents: ["button", "checkbox", "switch", "radio", "dropdown-button"],
      controlDefault: "dark/zinc",
      badge: CATALYST_BADGE_COLORS,
      badgeDefault: "zinc",
      badgeCount: CATALYST_BADGE_COLORS.length,
      controlCount: CATALYST_CONTROL_COLORS.length,
    },
    buttonStyles: ["solid (color prop)", "outline", "plain"],
    formStates: ["disabled", "invalid", "controlled value/onChange", "defaultValue/defaultChecked"],
    classNamePolicy:
      "Docs: className is a sharp knife — only add non-conflicting layout utilities (e.g. max-w-*, flex gap). Prefer color/outline/plain props for visual variants.",
    themePolicy:
      "Built on Tailwind default theme. Significant @theme overrides may require editing copied component source (allowed under your Plus license for your projects).",
    download: CATALYST_DOWNLOAD_URL,
    docs: CATALYST_DOCS_BASE,
    demo: CATALYST_DEMO_URL,
    product: CATALYST_PRODUCT_URL,
    components: CATALYST_COMPONENTS.length,
    note: "Component source lives in catalyst-ui-kit.zip from your account. This MCP scaffolds setup/theming and documents public APIs; it does not ship the zip.",
  };
}

export function getCatalystSetupGuide() {
  return {
    title: "Catalyst UI Kit setup (from official docs)",
    steps: CATALYST_SETUP_STEPS,
    linkSnippets: CATALYST_LINK_SNIPPETS,
    customizations: listCatalystCustomizations(),
    components: CATALYST_COMPONENTS.map((c) => ({
      slug: c.slug,
      name: c.name,
      group: c.group,
      docsUrl: c.docsUrl,
    })),
  };
}
