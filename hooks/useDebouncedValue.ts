import { useEffect, useState } from 'react';

/**
 * Trailing-edge debounce for fast-changing values (search-as-you-type).
 * Returns the input value once it has been stable for `delayMs`.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
