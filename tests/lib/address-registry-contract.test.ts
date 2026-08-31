import { describe, expect, it } from 'vitest';
import {
  formatRegistryHouseNumber,
  normalizeAddressRegistrySuggestion,
} from '@/lib/address-registry/contracts';

const valid = {
  canonicalAddressId: '11111111-1111-4111-8111-111111111111',
  sourceSystem: 'OSM',
  sourceRecordId: 'osm:way:987',
  formattedAddress: '1135 Budapest, Gidófalvy Lajos utca 9.',
  countryCode: 'HU',
  postalCode: '1135',
  settlement: 'Budapest',
  district: 'XIII. kerület',
  settlementPart: null,
  streetName: 'Gidófalvy Lajos',
  streetType: 'utca',
  houseNumberFrom: '9',
  houseNumberTo: null,
  houseNumberSuffix: null,
  buildingMark: null,
  addressLevel: 'BUILDING',
  latitude: 47.535,
  longitude: 19.071,
  coordinatePrecision: 'CENTROID',
  confidence: 0.99,
  matchType: 'EXACT_HOUSE',
  datasetVersion: 'osm-hu-2026-08-30',
  normalizationVersion: 'address-registry-v1',
  attribution: {
    text: '© OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/copyright',
  },
};

describe('Address Registry v1 contract normalization', () => {
  it('preserves ranges, suffixes and building marks in legacy display fields', () => {
    expect(formatRegistryHouseNumber({
      houseNumberFrom: '9',
      houseNumberTo: '11',
      houseNumberSuffix: 'A',
      buildingMark: 'B épület',
    })).toBe('9-11/A B épület');
    expect(formatRegistryHouseNumber({
      houseNumberFrom: '9',
      houseNumberTo: null,
      houseNumberSuffix: '/C',
      buildingMark: null,
    })).toBe('9/C');
  });

  it('accepts one strict Hungarian building record', () => {
    expect(normalizeAddressRegistrySuggestion(valid)).toMatchObject({
      canonicalAddressId: valid.canonicalAddressId,
      sourceRecordId: valid.sourceRecordId,
      countryCode: 'HU',
      addressLevel: 'BUILDING',
    });
  });

  it.each([
    ['non-UUID canonical identity', { canonicalAddressId: 'row-123' }],
    ['unstable source identity', { sourceRecordId: '987' }],
    ['non-building precision', { addressLevel: 'STREET' }],
    ['invalid Hungarian postcode', { postalCode: '113' }],
    ['unpaired coordinates', { longitude: null }],
    ['out-of-range coordinates', { latitude: 147.5 }],
    ['missing coordinate precision', { coordinatePrecision: undefined }],
    ['null confidence', { confidence: null }],
    ['string confidence', { confidence: '0.99' }],
    ['string coordinates', { latitude: '47.535', longitude: '19.071' }],
    ['untrusted attribution link', { attribution: { text: 'OSM', url: 'https://evil.example' } }],
  ])('rejects %s', (_label, override) => {
    expect(normalizeAddressRegistrySuggestion({ ...valid, ...override })).toBeNull();
  });
});
