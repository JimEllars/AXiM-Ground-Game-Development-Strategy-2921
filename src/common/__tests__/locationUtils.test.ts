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

  describe('Edge cases and malformed inputs', () => {
    test('returns null for empty string', () => {
      expect(parseLeadLocation('')).toBeNull();
    });

    test('returns null for whitespace strings', () => {
      expect(parseLeadLocation('   ')).toBeNull();
    });

    test('returns null for plain primitive types', () => {
      expect(parseLeadLocation(123)).toBeNull();
      expect(parseLeadLocation(true)).toBeNull();
    });

    test('returns null for plain arrays', () => {
      expect(parseLeadLocation([-122.4194, 37.7749])).toBeNull();
    });

    test('parses coordinates as strings that are valid numbers', () => {
      expect(parseLeadLocation({ type: 'Point', coordinates: ['-122.4194', '37.7749'] })).toEqual({
        longitude: -122.4194,
        latitude: 37.7749,
      });
      expect(parseLeadLocation({ x: '-122.4194', y: '37.7749' })).toEqual({
        longitude: -122.4194,
        latitude: 37.7749,
      });
      expect(parseLeadLocation({ coordinates: ['-122.4194', '37.7749'] })).toEqual({
        longitude: -122.4194,
        latitude: 37.7749,
      });
      expect(parseLeadLocation({ longitude: '-122.4194', latitude: '37.7749' })).toEqual({
        longitude: -122.4194,
        latitude: 37.7749,
      });
    });

    test('handles invalid coordinate elements', () => {
      expect(parseLeadLocation({ type: 'Point', coordinates: [NaN, 37.7749] })).toBeNull();
      expect(parseLeadLocation({ type: 'Point', coordinates: [-122.4194, 'invalid'] })).toBeNull();
      expect(parseLeadLocation({ x: NaN, y: 37.7749 })).toBeNull();
      expect(parseLeadLocation({ coordinates: [NaN, 37.7749] })).toBeNull();
    });

    test('handles missing or incomplete properties', () => {
      expect(parseLeadLocation({ x: -122.4194 })).toBeNull();
      expect(parseLeadLocation({ y: 37.7749 })).toBeNull();
      expect(parseLeadLocation({ longitude: -122.4194 })).toBeNull();
      expect(parseLeadLocation({ latitude: 37.7749 })).toBeNull();
      expect(parseLeadLocation({ type: 'Point' })).toBeNull(); // missing coordinates
      expect(parseLeadLocation({ type: 'Point', coordinates: [-122.4194] })).toBeNull(); // not enough coordinates
      expect(parseLeadLocation({ coordinates: [-122.4194] })).toBeNull(); // not enough coordinates
    });

    test('handles location properties that are null', () => {
      expect(parseLeadLocation({ x: null, y: 37.7749 })).toBeNull();
      expect(parseLeadLocation({ longitude: null, latitude: 37.7749 })).toBeNull();
    });

    test('ignores additional properties', () => {
      expect(parseLeadLocation({ type: 'Point', coordinates: [-122.4194, 37.7749], extra: 'ignored' })).toEqual({
        longitude: -122.4194,
        latitude: 37.7749,
      });
    });

    describe('Additional edge cases', () => {
      test('handles empty string coordinates which parse to 0', () => {
        // Technically Number("") is 0
        expect(parseLeadLocation({ type: 'Point', coordinates: ['', ''] })).toEqual({
          longitude: 0,
          latitude: 0,
        });
      });

      test('handles null coordinates elements which parse to 0', () => {
        expect(parseLeadLocation({ type: 'Point', coordinates: [null, null] })).toEqual({
          longitude: 0,
          latitude: 0,
        });
      });

      test('handles boolean coordinates which parse to 0 or 1', () => {
        expect(parseLeadLocation({ type: 'Point', coordinates: [false, true] })).toEqual({
          longitude: 0,
          latitude: 1,
        });
      });

      test('handles valid zero coordinates', () => {
        expect(parseLeadLocation({ x: 0, y: 0 })).toEqual({ longitude: 0, latitude: 0 });
        expect(parseLeadLocation({ coordinates: [0, 0] })).toEqual({ longitude: 0, latitude: 0 });
        expect(parseLeadLocation({ longitude: 0, latitude: 0 })).toEqual({ longitude: 0, latitude: 0 });
      });
    });
  });
});
