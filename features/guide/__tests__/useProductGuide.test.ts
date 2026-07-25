import { act, renderHook } from '@testing-library/react-native';

const mockUpdateGuideMutate = jest.fn();
const mockRecordEventMutate = jest.fn();

jest.mock('../../auth/useAuth', () => ({
  CURRENT_PRODUCT_GUIDE_VERSION: 1,
  useUpdateProductGuide: () => ({ mutate: mockUpdateGuideMutate }),
  useRecordProductGuideEvent: () => ({ mutate: mockRecordEventMutate }),
}));

import { useProductGuide, useProductGuideController } from '../useProductGuide';
import { useAuthStore } from '../../../store/authStore';
import { useProductGuideStore } from '../../../store/guideStore';

type StoredUser = ReturnType<typeof useAuthStore.getState>['user'];

const baseUser = {
  id: 'guide-test-user',
  onboarding_completed: true,
  product_guide_version: 0,
};

const asUser = (patch: Record<string, unknown> = {}): StoredUser =>
  ({ ...baseUser, ...patch }) as unknown as StoredUser;

describe('product guide', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProductGuideStore.setState({ step: null, hasStartedThisSession: false });
    useAuthStore.setState({ user: asUser() });
  });

  it('arms the odyssey step once for an onboarded user without the guide', async () => {
    await renderHook(() => useProductGuideController());
    expect(useProductGuideStore.getState().step).toBe('odyssey');
    expect(mockRecordEventMutate).toHaveBeenCalledWith({ event: 'started' });
    expect(mockRecordEventMutate).toHaveBeenCalledTimes(1);
  });

  it('does not arm when the guide version is already current', async () => {
    useAuthStore.setState({ user: asUser({ product_guide_version: 1 }) });
    await renderHook(() => useProductGuideController());
    expect(useProductGuideStore.getState().step).toBeNull();
    expect(mockRecordEventMutate).not.toHaveBeenCalled();
  });

  it('does not arm before onboarding completes', async () => {
    useAuthStore.setState({ user: asUser({ onboarding_completed: false }) });
    await renderHook(() => useProductGuideController());
    expect(useProductGuideStore.getState().step).toBeNull();
  });

  it('advances odyssey to plaza to done and completes on the server', async () => {
    useProductGuideStore.setState({ step: 'odyssey', hasStartedThisSession: true });
    const { result } = await renderHook(() => useProductGuide());

    await act(async () => result.current.completeOdysseyStep('action'));
    expect(useProductGuideStore.getState().step).toBe('plaza');
    expect(mockRecordEventMutate).toHaveBeenCalledWith({ event: 'odyssey_step_done', detail: 'action' });
    expect(mockUpdateGuideMutate).not.toHaveBeenCalled();

    await act(async () => result.current.completePlazaStep('dismiss'));
    expect(useProductGuideStore.getState().step).toBeNull();
    expect(mockRecordEventMutate).toHaveBeenCalledWith({ event: 'plaza_step_done', detail: 'dismiss' });
    expect(mockUpdateGuideMutate).toHaveBeenCalledWith({ product_guide_version: 1 });
  });

  it('ignores out-of-order step completions', async () => {
    useProductGuideStore.setState({ step: 'odyssey', hasStartedThisSession: true });
    const { result } = await renderHook(() => useProductGuide());

    await act(async () => result.current.completePlazaStep('action'));
    expect(useProductGuideStore.getState().step).toBe('odyssey');
    expect(mockUpdateGuideMutate).not.toHaveBeenCalled();
  });

  it('skip ends the guide and marks it complete on the server', async () => {
    useProductGuideStore.setState({ step: 'plaza', hasStartedThisSession: true });
    const { result } = await renderHook(() => useProductGuide());

    await act(async () => result.current.skipAll());
    expect(useProductGuideStore.getState().step).toBeNull();
    expect(mockRecordEventMutate).toHaveBeenCalledWith({ event: 'skipped' });
    expect(mockUpdateGuideMutate).toHaveBeenCalledWith({ product_guide_version: 1 });
  });

  it('restart re-arms the guide and resets the server version', async () => {
    useProductGuideStore.setState({ step: null, hasStartedThisSession: true });
    const { result } = await renderHook(() => useProductGuide());

    await act(async () => result.current.restart());
    expect(useProductGuideStore.getState().step).toBe('odyssey');
    expect(mockUpdateGuideMutate).toHaveBeenCalledWith({ product_guide_version: 0 });
    expect(mockRecordEventMutate).toHaveBeenCalledWith({ event: 'started' });
  });
});
