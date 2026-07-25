import { mapWithConcurrency } from '../mapWithConcurrency';

describe('mapWithConcurrency', () => {
  it('preserves result order while limiting active work', async () => {
    let active = 0;
    let maxActive = 0;

    const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((resolve) => setImmediate(resolve));
      active -= 1;
      return item * 10;
    });

    expect(result).toEqual([10, 20, 30, 40, 50]);
    expect(maxActive).toBe(2);
  });

  it('waits for active work to settle and does not start queued work after a failure', async () => {
    const started: number[] = [];
    const finished: number[] = [];

    await expect(
      mapWithConcurrency([0, 1, 2, 3], 2, async (item) => {
        started.push(item);
        if (item === 1) throw new Error('upload_failed');
        await new Promise<void>((resolve) => setImmediate(resolve));
        finished.push(item);
        return item;
      }),
    ).rejects.toThrow('upload_failed');

    expect(started).toEqual([0, 1]);
    expect(finished).toEqual([0]);
  });
});
