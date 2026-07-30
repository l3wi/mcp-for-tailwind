/**
 * Helpers for selecting format / Tailwind version / theme controls on
 * Tailwind Plus UI block pages. Tolerates picker label churn (v4.0 → v4.3, etc.).
 */
import type { Page } from "puppeteer-core";
import type { CodeFormat, Theme, TailwindVersion } from "../types/index.ts";
import { TIMING } from "../config.ts";

const FORMAT_LABELS: Record<CodeFormat, string> = {
  react: "React",
  vue: "Vue",
  html: "HTML",
};

/**
 * Given option labels from a <select>, pick the best match for a version request.
 * - "v4" → highest semver-like v4.x label (or any option starting with v4)
 * - "v3.4" / "v3" → first v3.x option
 * - exact label → that label if present
 */
export function resolveVersionOption(
  options: string[],
  requested: TailwindVersion
): string | null {
  const cleaned = options.map((o) => o.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;

  // Exact match first
  const exact = cleaned.find((o) => o === requested);
  if (exact) return exact;

  if (requested === "v4" || requested.startsWith("v4")) {
    const v4s = cleaned.filter((o) => /^v4(\.|$)/i.test(o) || o.toLowerCase() === "v4");
    if (v4s.length === 0) {
      // Fallbacks sometimes show "4.0" without the v
      const bare = cleaned.filter((o) => /^4(\.|$)/.test(o));
      if (bare.length) return bare.sort().at(-1) ?? null;
      return null;
    }
    // Prefer highest lexical/semver-ish label (v4.3 > v4.1 > v4.0 > v4)
    return v4s.sort((a, b) => compareVersionLabels(a, b)).at(-1) ?? null;
  }

  if (requested === "v3.4" || requested.startsWith("v3")) {
    return (
      cleaned.find((o) => o === "v3.4") ||
      cleaned.find((o) => /^v3/i.test(o)) ||
      null
    );
  }

  // Fuzzy: option contains requested string
  return cleaned.find((o) => o.toLowerCase().includes(String(requested).toLowerCase())) ?? null;
}

function compareVersionLabels(a: string, b: string): number {
  const pa = a.replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

export async function selectFormat(page: Page, format: CodeFormat): Promise<boolean> {
  const label = FORMAT_LABELS[format];
  const selects = await page.$$("select");

  for (const select of selects) {
    const options = await select.$$eval("option", (opts) =>
      opts.map((o) => (o.textContent || o.value || "").trim())
    );
    if (options.some((o) => ["React", "Vue", "HTML"].includes(o))) {
      try {
        // Try by visible text then by value
        const values = await select.$$eval("option", (opts) =>
          opts.map((o) => ({ text: (o.textContent || "").trim(), value: o.value }))
        );
        const match = values.find((v) => v.text === label || v.value === label.toLowerCase());
        if (match) {
          await select.select(match.value || match.text);
          await delay(TIMING.formatChangeDelayMs);
          return true;
        }
        await select.select(label);
        await delay(TIMING.formatChangeDelayMs);
        return true;
      } catch {
        // try next select
      }
    }
  }
  return false;
}

export async function selectVersion(
  page: Page,
  version: TailwindVersion
): Promise<{ ok: boolean; resolved: string | null }> {
  const selects = await page.$$("select");

  for (const select of selects) {
    const optionData = await select.$$eval("option", (opts) =>
      opts.map((o) => ({
        text: (o.textContent || "").trim(),
        value: o.value,
      }))
    );
    const labels = optionData.map((o) => o.text || o.value);
    const isVersionSelect = labels.some(
      (l) => /^v?\d+(\.\d+)*/i.test(l) && (l.includes("v3") || l.includes("v4") || l.startsWith("3") || l.startsWith("4"))
    );
    if (!isVersionSelect) continue;

    const resolved = resolveVersionOption(labels, version);
    if (!resolved) continue;

    const match = optionData.find((o) => o.text === resolved || o.value === resolved);
    try {
      await select.select(match?.value || resolved);
      await delay(TIMING.versionChangeDelayMs);
      return { ok: true, resolved };
    } catch {
      // continue
    }
  }

  return { ok: false, resolved: null };
}

/**
 * Select light / dark / system theme on the code panel.
 * Tailwind Plus (Aug 2025+) exposes a picker with these three modes.
 */
export async function selectTheme(page: Page, theme: Theme): Promise<boolean> {
  // Prefer radiogroup / aria-labelled controls
  const clicked = await page.evaluate((target: string) => {
    const normalize = (s: string) => s.trim().toLowerCase();
    const want =
      target === "system"
        ? ["system", "system mode", "auto"]
        : target === "dark"
          ? ["dark", "dark only", "dark mode"]
          : ["light", "light only", "light mode"];

    // Buttons and radios with accessible names
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, [role="radio"], [role="tab"], label, input[type="radio"]'
      )
    );

    for (const el of candidates) {
      const label = normalize(
        el.getAttribute("aria-label") ||
          el.getAttribute("title") ||
          el.textContent ||
          (el as HTMLInputElement).value ||
          ""
      );
      if (!label) continue;
      if (want.some((w) => label === w || label.includes(w))) {
        if (el instanceof HTMLInputElement) {
          el.click();
        } else {
          el.click();
        }
        return true;
      }
    }

    // data-theme / data-mode attributes
    const themed = document.querySelector<HTMLElement>(
      `[data-theme="${target}"], [data-mode="${target}"], [data-color-scheme="${target}"]`
    );
    if (themed) {
      themed.click();
      return true;
    }

    return false;
  }, theme);

  if (clicked) {
    await delay(TIMING.themeChangeDelayMs);
    return true;
  }

  // Fallback: radio by value
  const radio = await page.$(`input[type="radio"][value="${theme}"]`);
  if (radio) {
    await radio.click();
    await delay(TIMING.themeChangeDelayMs);
    return true;
  }

  // light is usually the default — treat as success if we wanted light
  return theme === "light";
}

export async function clickCodeTab(page: Page, variantIndex: number): Promise<boolean> {
  const tabs = await page.$$('[role="tab"]');
  let codeTabCount = 0;

  for (const tab of tabs) {
    const text = await tab.evaluate((el) => (el.textContent || "").trim());
    if (text === "Code" || text.toLowerCase() === "code") {
      if (codeTabCount === variantIndex) {
        await tab.click();
        await delay(TIMING.uiInteractionDelayMs);
        return true;
      }
      codeTabCount++;
    }
  }
  return false;
}

export async function extractVisibleCode(page: Page, variantIndex: number): Promise<string | null> {
  return page.evaluate((targetVariantIndex) => {
    const tabPanels = Array.from(document.querySelectorAll('[role="tabpanel"]'));
    let codeTabCount = 0;

    for (const panel of tabPanels) {
      const tabName = panel.getAttribute("aria-label") || "";
      const hidden =
        panel.getAttribute("hidden") !== null ||
        panel.getAttribute("data-state") === "inactive";
      if (tabName === "Code" || panel.querySelector("code")) {
        if (codeTabCount === targetVariantIndex || (!hidden && panel.querySelector("code"))) {
          const codeEl = panel.querySelector("code");
          if (codeEl?.textContent && codeEl.textContent.length > 40) {
            return codeEl.textContent;
          }
        }
        if (tabName === "Code") codeTabCount++;
      }
    }

    for (const el of Array.from(document.querySelectorAll("code"))) {
      const text = el.textContent || "";
      if (
        text.length > 40 &&
        (text.includes("import") ||
          text.includes("export") ||
          text.includes("<template>") ||
          text.includes("<section") ||
          text.includes("<div") ||
          text.includes("el-") ||
          text.includes("@tailwindcss"))
      ) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return text;
      }
    }

    return null;
  }, variantIndex);
}

export function notesForCode(code: string, format: CodeFormat): string[] {
  const notes: string[] = [];
  if (format === "html") {
    if (
      code.includes("el-") ||
      code.includes("tailwindplus") ||
      code.includes("@tailwindplus/elements") ||
      code.includes("data-")
    ) {
      notes.push(
        "HTML interactivity may require Tailwind Plus Elements — see https://tailwindcss.com/plus/ui-blocks/documentation/elements"
      );
    }
  }
  if (code.includes("@headlessui")) {
    notes.push("Requires Headless UI (@headlessui/react or @headlessui/vue)");
  }
  if (code.includes("'use client'") || code.includes('"use client"')) {
    notes.push("React Server Components: this file is a client component");
  }
  return notes;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

