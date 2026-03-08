import { parseLeadLocation } from '../locationUtils';

describe('parseLeadLocation', () => {
  test('returns null for null or undefined input', () => {
    expect(parseLeadLocation(null)).toBeNull();
    expect(parseLeadLocation(undefined)).toBeNull();
  });

  test('parses GeoJSON Point format', () => {
    const geojson = { type: 'Point', coordinates: [-122.4194, 37.7749] };
    expect(parseLeadLocation(geojson)).toEqual({
      longitude: -122.4194,
      latitude: 37.7749,
    });
  });

  test('parses legacy {x, y} format', () => {
    const legacy = { x: -122.4194, y: 37.7749 };
    expect(parseLeadLocation(legacy)).toEqual({
      longitude: -122.4194,
      latitude: 37.7749,
    });
  });

  test('parses object with coordinates array directly', () => {
    const direct = { coordinates: [-122.4194, 37.7749] };
    expect(parseLeadLocation(direct)).toEqual({
      longitude: -122.4194,
      latitude: 37.7749,
    });
  });

  test('parses object with longitude and latitude fields', () => {
      const lonlat = { longitude: -122.4194, latitude: 37.7749 };
      expect(parseLeadLocation(lonlat)).toEqual({
          longitude: -122.4194,
          latitude: 37.7749,
      });
  });

  test('parses stringified JSON', () => {
    const stringified = JSON.stringify({ type: 'Point', coordinates: [-122.4194, 37.7749] });
    expect(parseLeadLocation(stringified)).toEqual({
      longitude: -122.4194,
      latitude: 37.7749,
    });
  });

  test('handles invalid data gracefully', () => {
    expect(parseLeadLocation({})).toBeNull();
    expect(parseLeadLocation('invalid json')).toBeNull();
    expect(parseLeadLocation({ type: 'Point', coordinates: ['not a number', 37.7749] })).toBeNull();
  });
});
