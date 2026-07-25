const CITY_LOOKUP_DECIMAL_PLACES = 2;

export function approximateCityLookupCoordinates(coordinates: {
  latitude: number;
  longitude: number;
}) {
  return {
    latitude: Number(coordinates.latitude.toFixed(CITY_LOOKUP_DECIMAL_PLACES)),
    longitude: Number(coordinates.longitude.toFixed(CITY_LOOKUP_DECIMAL_PLACES)),
  };
}
