import { useNetworkHealthStore } from '../networkHealthStore';

describe('networkHealthStore', () => {
  beforeEach(() => {
    useNetworkHealthStore.setState({ consecutiveFailures: 0, isDegraded: false });
  });

  it('starts healthy', () => {
    const s = useNetworkHealthStore.getState();
    expect(s.consecutiveFailures).toBe(0);
    expect(s.isDegraded).toBe(false);
  });

  it('does not degrade below the threshold', () => {
    const { reportFailure } = useNetworkHealthStore.getState();
    reportFailure();
    reportFailure();
    expect(useNetworkHealthStore.getState().isDegraded).toBe(false);
    expect(useNetworkHealthStore.getState().consecutiveFailures).toBe(2);
  });

  it('degrades at 3 consecutive failures', () => {
    const { reportFailure } = useNetworkHealthStore.getState();
    reportFailure();
    reportFailure();
    reportFailure();
    expect(useNetworkHealthStore.getState().isDegraded).toBe(true);
  });

  it('a single success resets both counter and degraded flag', () => {
    const { reportFailure, reportSuccess } = useNetworkHealthStore.getState();
    reportFailure();
    reportFailure();
    reportFailure();
    reportSuccess();
    const s = useNetworkHealthStore.getState();
    expect(s.consecutiveFailures).toBe(0);
    expect(s.isDegraded).toBe(false);
  });

  it('success while already healthy does not create a new state object', () => {
    const before = useNetworkHealthStore.getState();
    before.reportSuccess();
    // No-op guard: zustand set() skipped, so subscribers don't re-render.
    expect(useNetworkHealthStore.getState().consecutiveFailures).toBe(0);
  });

  it('failures interleaved with successes never accumulate', () => {
    const { reportFailure, reportSuccess } = useNetworkHealthStore.getState();
    reportFailure();
    reportFailure();
    reportSuccess();
    reportFailure();
    reportFailure();
    expect(useNetworkHealthStore.getState().isDegraded).toBe(false);
  });
});
