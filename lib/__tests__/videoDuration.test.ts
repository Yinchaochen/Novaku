import { pickedVideoDurationMs, videoDurationSeconds } from '../videoDuration';

describe('pickedVideoDurationMs', () => {
  it('keeps milliseconds from the native pickers', () => {
    expect(pickedVideoDurationMs(240_000, 'ios')).toBe(240_000);
    expect(pickedVideoDurationMs(240_000, 'android')).toBe(240_000);
  });

  it('turns the web picker seconds into milliseconds', () => {
    // A four-minute clip arrived as 240 and used to become 0 seconds, which the API rejects.
    expect(pickedVideoDurationMs(240, 'web')).toBe(240_000);
    expect(pickedVideoDurationMs(12.4, 'web')).toBe(12_400);
  });

  it('treats missing or broken values as unknown', () => {
    expect(pickedVideoDurationMs(null, 'web')).toBe(0);
    expect(pickedVideoDurationMs(undefined, 'ios')).toBe(0);
    expect(pickedVideoDurationMs(Number.NaN, 'web')).toBe(0);
    expect(pickedVideoDurationMs(Infinity, 'web')).toBe(0);
    expect(pickedVideoDurationMs(-3, 'android')).toBe(0);
  });
});

describe('videoDurationSeconds', () => {
  it('rounds to whole seconds and never sends 0 for a real clip', () => {
    expect(videoDurationSeconds(240_000)).toBe(240);
    expect(videoDurationSeconds(299_600)).toBe(300);
    expect(videoDurationSeconds(300)).toBe(1);
  });

  it('stays 0 when the length is unknown', () => {
    expect(videoDurationSeconds(0)).toBe(0);
  });
});
