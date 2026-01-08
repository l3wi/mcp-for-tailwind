/**
 * Rate limiter using a queue to prevent race conditions.
 * Ensures minimum delay between requests.
 */
export class RateLimiter {
  private lastRequest = 0;
  private queue: Array<() => void> = [];
  private processing = false;

  constructor(private delayMs: number) {}

  /**
   * Acquire permission to make a request.
   * Will wait if necessary to maintain rate limit.
   */
  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  /**
   * Process the queue, ensuring only one request at a time
   * and maintaining the delay between requests.
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const elapsed = Date.now() - this.lastRequest;
    if (elapsed < this.delayMs) {
      await new Promise((r) => setTimeout(r, this.delayMs - elapsed));
    }

    this.lastRequest = Date.now();
    const next = this.queue.shift();
    next?.();
    this.processing = false;

    // Process next item in queue if any
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Get current queue length (useful for debugging/monitoring).
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue (useful for cleanup).
   */
  clearQueue(): void {
    this.queue = [];
    this.processing = false;
  }

  /**
   * Reset the rate limiter (e.g., after an error or pause).
   */
  reset(): void {
    this.lastRequest = 0;
  }
}
