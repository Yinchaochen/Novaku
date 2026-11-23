import { closeScreen, screenFromSegments } from '../screenTracking';

describe('screenFromSegments', () => {
  it('drops route groups', () => {
    expect(screenFromSegments(['(tabs)', 'plaza'], {})).toEqual({ screen: '/plaza', entityId: null });
  });

  it('keeps the pattern and moves the id to entity_id', () => {
    expect(screenFromSegments(['p', '[id]'], { id: 'post-123' })).toEqual({ screen: '/p/[id]', entityId: 'post-123' });
    expect(screenFromSegments(['users', '[id]'], { id: ['a', 'b'] })).toEqual({ screen: '/users/[id]', entityId: null });
  });

  it('names the root screen', () => {
    expect(screenFromSegments([], {})).toEqual({ screen: '/', entityId: null });
  });
});

describe('closeScreen', () => {
  it('turns the open screen into a view with its dwell time', () => {
    const startedAt = Date.UTC(2026, 10, 23, 12, 0, 0);
    expect(closeScreen({ screen: '/plaza', entityId: null, startedAt }, startedAt + 4500)).toEqual({
      screen: '/plaza',
      entity_id: null,
      started_at: '2026-11-23T12:00:00.000Z',
      dwell_ms: 4500,
    });
  });

  it('has nothing to close when nothing is open', () => {
    expect(closeScreen(null, 1000)).toBeNull();
  });
});
