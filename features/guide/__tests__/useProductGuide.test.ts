import { act, renderHook } from '@testing-library/react-native';

const mockUpdateGuideMutate = jest.fn();
const mockRecordEventMutate = jest.fn();

jest.mock('../../auth/useAuth', () => ({
  CURRENT_PRODUCT_GUIDE_VERSION: 1,
  useUpdateProductGuide: () => ({ mutate: mockUpdateGuideMutate }),
  useRecordProductGuideEvent: () => ({ mutate: mockRecordEventMutate }),
}));

import { useGuideAutoAdvance, useProductGuide, useProductGuideController } from '../useProductGuide';
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

const resetGuideStore = () =>
  useProductGuideStore.setState({
    step: null,
    confirmingPublish: false,
    hasStartedThisSession: false,
  });

const autoAdvanceInput = (patch: Partial<Parameters<typeof useGuideAutoAdvance>[0]> = {}) => ({
  composerVisible: false,
  mediaCount: 0,
  title: '',
  body: '',
  placesCount: 0,
  ...patch,
});

describe('product guide walkthrough', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetGuideStore();
    useAuthStore.setState({ user: asUser() });
  });

  it('arms the walkthrough at the compose entry once for an onboarded user', async () => {
    await renderHook(() => useProductGuideController());
    expect(useProductGuideStore.getState().step).toBe('compose_entry');
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

  it('advances only from the current step (Continue and real actions share this path)', async () => {
    useProductGuideStore.setState({ step: 'photo', hasStartedThisSession: true });
    const { result } = await renderHook(() => useProductGuide());

    await act(async () => result.current.advanceFrom('title'));
    expect(useProductGuideStore.getState().step).toBe('photo');

    await act(async () => result.current.advanceFrom('photo'));
    expect(useProductGuideStore.getState().step).toBe('title');
  });

  it('opening the composer advances the entry step; closing it rewinds composer steps', async () => {
    useProductGuideStore.setState({ step: 'compose_entry', hasStartedThisSession: true });
    const { rerender } = await renderHook((input: ReturnType<typeof autoAdvanceInput>) => useGuideAutoAdvance(input), {
      initialProps: autoAdvanceInput(),
    });

    await act(async () => rerender(autoAdvanceInput({ composerVisible: true })));
    expect(useProductGuideStore.getState().step).toBe('photo');

    useProductGuideStore.setState({ step: 'body' });
    await act(async () => rerender(autoAdvanceInput({ composerVisible: false })));
    expect(useProductGuideStore.getState().step).toBe('compose_entry');
  });

  it('advances photo on a real media add and location on a real place add', async () => {
    useProductGuideStore.setState({ step: 'photo', hasStartedThisSession: true });
    const { rerender } = await renderHook((input: ReturnType<typeof autoAdvanceInput>) => useGuideAutoAdvance(input), {
      initialProps: autoAdvanceInput({ composerVisible: true }),
    });

    await act(async () => rerender(autoAdvanceInput({ composerVisible: true, mediaCount: 1 })));
    expect(useProductGuideStore.getState().step).toBe('title');

    useProductGuideStore.setState({ step: 'location' });
    await act(async () =>
      rerender(autoAdvanceInput({ composerVisible: true, mediaCount: 1, placesCount: 1 })),
    );
    expect(useProductGuideStore.getState().step).toBe('publish');
  });

  it('advances text steps only after the input passes validation length, debounced', async () => {
    jest.useFakeTimers();
    try {
      useProductGuideStore.setState({ step: 'title', hasStartedThisSession: true });
      const { rerender } = await renderHook((input: ReturnType<typeof autoAdvanceInput>) => useGuideAutoAdvance(input), {
        initialProps: autoAdvanceInput({ composerVisible: true }),
      });

      await act(async () => rerender(autoAdvanceInput({ composerVisible: true, title: '柏林' })));
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(useProductGuideStore.getState().step).toBe('title');

      await act(async () =>
        rerender(autoAdvanceInput({ composerVisible: true, title: '柏林跳蚤市场攻略' })),
      );
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(useProductGuideStore.getState().step).toBe('body');
    } finally {
      jest.useRealTimers();
    }
  });

  it('back only moves between composer steps and stops at the photo step', async () => {
    useProductGuideStore.setState({ step: 'title', hasStartedThisSession: true });
    const { result } = await renderHook(() => useProductGuide());

    await act(async () => result.current.goBackStep());
    expect(useProductGuideStore.getState().step).toBe('photo');

    await act(async () => result.current.goBackStep());
    expect(useProductGuideStore.getState().step).toBe('photo');
    expect(mockUpdateGuideMutate).not.toHaveBeenCalled();
    expect(mockRecordEventMutate).not.toHaveBeenCalled();
  });

  it('completing via the guided publish records the action and versions the server', async () => {
    useProductGuideStore.setState({ step: 'publish', hasStartedThisSession: true });
    const { result } = await renderHook(() => useProductGuide());

    await act(async () => result.current.completeWalkthrough('action'));
    expect(useProductGuideStore.getState().step).toBeNull();
    expect(mockRecordEventMutate).toHaveBeenCalledWith({ event: 'plaza_step_done', detail: 'action' });
    expect(mockUpdateGuideMutate).toHaveBeenCalledWith({ product_guide_version: 1 });
  });

  it('the final Continue finishes the tour as a dismiss-completion', async () => {
    useProductGuideStore.setState({ step: 'publish', hasStartedThisSession: true });
    const { result } = await renderHook(() => useProductGuide());

    await act(async () => result.current.completeWalkthrough('dismiss'));
    expect(useProductGuideStore.getState().step).toBeNull();
    expect(mockRecordEventMutate).toHaveBeenCalledWith({ event: 'plaza_step_done', detail: 'dismiss' });
    expect(mockUpdateGuideMutate).toHaveBeenCalledWith({ product_guide_version: 1 });
  });

  it('skip ends the guide and marks it complete on the server', async () => {
    useProductGuideStore.setState({ step: 'photo', hasStartedThisSession: true });
    const { result } = await renderHook(() => useProductGuide());

    await act(async () => result.current.skipAll());
    expect(useProductGuideStore.getState().step).toBeNull();
    expect(mockRecordEventMutate).toHaveBeenCalledWith({ event: 'skipped' });
    expect(mockUpdateGuideMutate).toHaveBeenCalledWith({ product_guide_version: 1 });
  });

  it('a manual re-walk after completion stays purely local', async () => {
    useAuthStore.setState({ user: asUser({ product_guide_version: 1 }) });
    const { result } = await renderHook(() => useProductGuide());

    await act(async () => result.current.startWalkthrough({ composerOpen: false }));
    expect(useProductGuideStore.getState().step).toBe('compose_entry');

    useProductGuideStore.setState({ step: 'publish' });
    await act(async () => result.current.completeWalkthrough('action'));
    expect(useProductGuideStore.getState().step).toBeNull();
    expect(mockUpdateGuideMutate).not.toHaveBeenCalled();
    expect(mockRecordEventMutate).not.toHaveBeenCalled();
  });

  it('the publish step intercepts the real submit behind an explicit confirm', async () => {
    useProductGuideStore.setState({ step: 'publish', hasStartedThisSession: true });
    const { result } = await renderHook(() => useProductGuide());

    expect(result.current.shouldInterceptPublish).toBe(true);
    await act(async () => result.current.requestPublishConfirm());
    expect(useProductGuideStore.getState().confirmingPublish).toBe(true);
    await act(async () => result.current.cancelPublishConfirm());
    expect(useProductGuideStore.getState().confirmingPublish).toBe(false);
  });

  it('restart re-arms the walkthrough and resets the server version', async () => {
    useProductGuideStore.setState({ step: null, hasStartedThisSession: true });
    const { result } = await renderHook(() => useProductGuide());

    await act(async () => result.current.restart());
    expect(useProductGuideStore.getState().step).toBe('compose_entry');
    expect(mockUpdateGuideMutate).toHaveBeenCalledWith({ product_guide_version: 0 });
    expect(mockRecordEventMutate).toHaveBeenCalledWith({ event: 'started' });
  });
});
