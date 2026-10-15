/**
 * The feedback screenshot promise (2026-10-15): people are masked while the
 * picture is taken, and masks never stay on after it, whatever happens.
 */

import { Platform } from 'react-native';

import { usePrivacyMaskStore } from '../../store/privacyMaskStore';

const mockCaptureScreen = jest.fn();
jest.mock('react-native-view-shot', () => ({ captureScreen: (...args: unknown[]) => mockCaptureScreen(...args) }));

import { captureMaskedScreen } from '../feedbackCapture';

beforeEach(() => {
  mockCaptureScreen.mockReset();
  usePrivacyMaskStore.setState({ masking: false });
  (Platform as { OS: string }).OS = 'android';
  jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

it('captures with masks on and turns them off afterwards', async () => {
  let maskedDuringCapture = false;
  mockCaptureScreen.mockImplementation(async () => {
    maskedDuringCapture = usePrivacyMaskStore.getState().masking;
    return 'BASE64';
  });

  await expect(captureMaskedScreen()).resolves.toBe('BASE64');
  expect(maskedDuringCapture).toBe(true);
  expect(usePrivacyMaskStore.getState().masking).toBe(false);
  expect(mockCaptureScreen).toHaveBeenCalledWith(expect.objectContaining({ result: 'base64', format: 'jpg' }));
});

it('turns masks off and returns null when capture fails', async () => {
  mockCaptureScreen.mockRejectedValue(new Error('no window'));

  await expect(captureMaskedScreen()).resolves.toBeNull();
  expect(usePrivacyMaskStore.getState().masking).toBe(false);
});

it('does not capture on web', async () => {
  (Platform as { OS: string }).OS = 'web';

  await expect(captureMaskedScreen()).resolves.toBeNull();
  expect(mockCaptureScreen).not.toHaveBeenCalled();
});
