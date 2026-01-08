export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Execute a function with exponential backoff retry.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error = new Error("No attempts made");

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === options.maxAttempts) {
        break;
      }

      // Exponential backoff: baseDelay * 2^(attempt-1), capped at maxDelay
      const delay = Math.min(
        options.baseDelay * Math.pow(2, attempt - 1),
        options.maxDelay
      );

      options.onRetry?.(attempt, lastError);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

/**
 * Convenience function to create retry options from config.
 */
export function createRetryOptions(
  config: { maxAttempts: number; baseDelay: number; maxDelay: number },
  onRetry?: (attempt: number, error: Error) => void
): RetryOptions {
  return { ...config, onRetry };
}
