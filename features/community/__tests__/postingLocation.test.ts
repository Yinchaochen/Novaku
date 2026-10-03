/**
 * The device's position rides along with a new post so the server can name
 * the city it was written in (D-153). Publishing never asks for location,
 * never waits long for it, and never sends it finer than two decimals.
 */

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  Accuracy: { Low: 2 },
}));

import * as Location from 'expo-location';

// Untyped on purpose: the fixtures carry only the fields the helper reads.
const mockLocation = Location as unknown as Record<string, jest.Mock>;

import { getPostingLocation } from '../postingLocation';

beforeEach(() => {
  jest.clearAllMocks();
  mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
});

it('rounds a known position to two decimals', async () => {
  mockLocation.getLastKnownPositionAsync.mockResolvedValue({
    coords: { latitude: 31.230416, longitude: 121.473701 },
  });

  await expect(getPostingLocation()).resolves.toEqual({ latitude: 31.23, longitude: 121.47 });
  expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
});

it('asks for a fresh fix only when there is no recent one', async () => {
  mockLocation.getLastKnownPositionAsync.mockResolvedValue(null);
  mockLocation.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: 52.5234, longitude: 13.3224 },
  });

  await expect(getPostingLocation()).resolves.toEqual({ latitude: 52.52, longitude: 13.32 });
});

it('sends nothing, and never prompts, when location was not granted', async () => {
  mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

  await expect(getPostingLocation()).resolves.toBeNull();
  expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(mockLocation.getLastKnownPositionAsync).not.toHaveBeenCalled();
});

it('sends nothing when the position lookup throws', async () => {
  mockLocation.getLastKnownPositionAsync.mockRejectedValue(new Error('no provider'));

  await expect(getPostingLocation()).resolves.toBeNull();
});
