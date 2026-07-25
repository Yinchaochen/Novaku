import { approximateCityLookupCoordinates } from '../cityLocation';

describe('approximateCityLookupCoordinates', () => {
  it('removes device-level precision before coordinates enter a URL', () => {
    expect(
      approximateCityLookupCoordinates({
        latitude: 48.137154,
        longitude: 11.576124,
      })
    ).toEqual({
      latitude: 48.14,
      longitude: 11.58,
    });
  });

  it('keeps negative coordinates in the correct hemisphere', () => {
    expect(
      approximateCityLookupCoordinates({
        latitude: -33.86882,
        longitude: -151.20929,
      })
    ).toEqual({
      latitude: -33.87,
      longitude: -151.21,
    });
  });
});
