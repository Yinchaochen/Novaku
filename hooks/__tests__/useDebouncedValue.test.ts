import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from '../useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the initial value immediately', async () => {
    const { result } = await renderHook(() => useDebouncedValue('berlin', 350));
    expect(result.current).toBe('berlin');
  });

  it('only emits after the value has been stable for the delay', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 350),
      { initialProps: { value: 'b' } },
    );

    await rerender({ value: 'be' });
    await rerender({ value: 'ber' });
    await act(() => {
      jest.advanceTimersByTime(300);
    });
    // Still the initial value — the trailing timer has not elapsed.
    expect(result.current).toBe('b');

    await act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current).toBe('ber');
  });

  it('restarts the timer on every change (trailing edge)', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 350),
      { initialProps: { value: 'shang' } },
    );

    await act(() => {
      jest.advanceTimersByTime(200);
    });
    await rerender({ value: 'shangh' });
    await act(() => {
      jest.advanceTimersByTime(200);
    });
    // 400ms total but only 200ms since the last change.
    expect(result.current).toBe('shang');

    await act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(result.current).toBe('shangh');
  });
});
