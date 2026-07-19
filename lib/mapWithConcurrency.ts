export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('invalid_concurrency');
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let hasFailure = false;
  let firstFailure: unknown;

  const worker = async () => {
    while (!hasFailure) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;

      try {
        results[index] = await mapper(items[index], index);
      } catch (error) {
        hasFailure = true;
        firstFailure = error;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  if (hasFailure) throw firstFailure;
  return results;
}
