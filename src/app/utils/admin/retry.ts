type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 1000;
  const shouldRetry = options.shouldRetry ?? (() => true);

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      const canRetry = attempt < retries && shouldRetry(error, attempt + 1);
      if (!canRetry) {
        throw error;
      }

      const exponentialDelay = Math.min(
        maxDelayMs,
        baseDelayMs * Math.pow(2, attempt)
      );
      const jitteredDelay = Math.floor(
        exponentialDelay + Math.random() * exponentialDelay * 0.25
      );

      await wait(jitteredDelay);
      attempt += 1;
    }
  }
}

