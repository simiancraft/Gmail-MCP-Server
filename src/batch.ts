export interface BatchResult<T, U> {
    successes: U[];
    failures: { item: T; error: Error }[];
}

/**
 * Process items in batches. If a whole batch fails, retry each item
 * individually so partial progress is preserved.
 */
export async function processBatches<T, U>(
    items: T[],
    batchSize: number,
    processFn: (batch: T[]) => Promise<U[]>,
): Promise<BatchResult<T, U>> {
    const successes: U[] = [];
    const failures: { item: T; error: Error }[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        try {
            const results = await processFn(batch);
            successes.push(...results);
        } catch (_error) {
            // If batch fails, try individual items
            for (const item of batch) {
                try {
                    const result = await processFn([item]);
                    successes.push(...result);
                } catch (itemError) {
                    failures.push({ item, error: itemError as Error });
                }
            }
        }
    }

    return { successes, failures };
}
