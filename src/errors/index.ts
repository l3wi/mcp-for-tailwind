/**
 * Custom error classes for Tailwind MCP.
 */

export class TailwindMCPError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "TailwindMCPError";
  }
}

export class AuthRequiredError extends TailwindMCPError {
  constructor(message = "Authentication required. Run 'login' first.") {
    super("AUTH_REQUIRED", message);
  }
}

export class AuthExpiredError extends TailwindMCPError {
  constructor() {
    super("AUTH_EXPIRED", "Session expired. Run 'login' to refresh.");
  }
}

export class BlockNotFoundError extends TailwindMCPError {
  constructor(blockSlug: string, category?: string) {
    super("BLOCK_NOT_FOUND", `Block '${blockSlug}' not found${category ? ` in ${category}` : ""}.`);
  }
}

export class VariantNotFoundError extends TailwindMCPError {
  constructor(variantSlug: string, blockSlug: string) {
    super("VARIANT_NOT_FOUND", `Variant '${variantSlug}' not found in ${blockSlug}.`);
  }
}

export class CodeFetchError extends TailwindMCPError {
  constructor(variantIndex: number) {
    super("CODE_FETCH_FAILED", `Could not fetch code for variant ${variantIndex}. The page structure may have changed.`);
  }
}

export class VariantIndexOutOfRangeError extends TailwindMCPError {
  constructor(variantIndex: number, totalVariants: number) {
    super("VARIANT_INDEX_OUT_OF_RANGE", `Variant index ${variantIndex} out of range. Only ${totalVariants} variants available.`);
  }
}
