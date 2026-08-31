export const ADDRESS_REGISTRY_VERSION = '1.0' as const;

export type AddressRegistryMatchType = 'EXACT_HOUSE' | 'PREFIX_HOUSE' | 'FUZZY';

export type AddressRegistryAttribution = {
  text: string;
  url: string;
};

export type AddressRegistrySuggestion = {
  canonicalAddressId: string;
  sourceSystem: 'OSM';
  sourceRecordId: string;
  formattedAddress: string;
  countryCode: string;
  postalCode: string;
  settlement: string;
  district?: string | null;
  settlementPart?: string | null;
  streetName: string;
  streetType?: string | null;
  houseNumberFrom: string;
  houseNumberTo?: string | null;
  houseNumberSuffix?: string | null;
  buildingMark?: string | null;
  addressLevel: 'BUILDING';
  latitude: number | null;
  longitude: number | null;
  coordinatePrecision: string;
  confidence: number;
  matchType: AddressRegistryMatchType;
  datasetVersion: string;
  normalizationVersion: string;
  attribution: AddressRegistryAttribution;
};

export type AddressRegistrySuggestResponse = {
  version: typeof ADDRESS_REGISTRY_VERSION;
  items: AddressRegistrySuggestion[];
  attribution: AddressRegistryAttribution;
};

export type AddressRegistryResolveResponse = {
  version: typeof ADDRESS_REGISTRY_VERSION;
  resolution: 'EXACT' | 'LINEAGE_REDIRECT';
  requestedCanonicalAddressId: string;
  resolvedCanonicalAddressId: string;
  sourceRecordId: string;
  item: AddressRegistrySuggestion;
};

/**
 * PanelLakó currently accepts only complete Hungarian building identities.
 * Keep this product rule separate from the reusable registry contract, which
 * intentionally remains country-neutral for other applications.
 */
export function isHungarianBuildingAddress(
  address: AddressRegistrySuggestion,
): boolean {
  return address.countryCode === 'HU'
    && address.addressLevel === 'BUILDING'
    && /^[0-9]{4}$/.test(address.postalCode)
    && Boolean(address.settlement)
    && Boolean(address.streetName)
    && Boolean(address.houseNumberFrom);
}

export function formatRegistryHouseNumber(
  address: Pick<
    AddressRegistrySuggestion,
    'houseNumberFrom' | 'houseNumberTo' | 'houseNumberSuffix' | 'buildingMark'
  >,
): string {
  const range = address.houseNumberTo
    ? `${address.houseNumberFrom}-${address.houseNumberTo}`
    : address.houseNumberFrom;
  const rawSuffix = address.houseNumberSuffix?.trim() ?? '';
  const suffix = rawSuffix
    ? /^[\/-]/.test(rawSuffix) ? rawSuffix : `/${rawSuffix}`
    : '';
  const buildingMark = address.buildingMark?.trim() ?? '';
  return `${range}${suffix}${buildingMark ? ` ${buildingMark}` : ''}`.trim();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OSM_SOURCE_ID = /^osm:(node|way|relation):[0-9]+$/;
const OSM_ATTRIBUTION_URL = 'https://www.openstreetmap.org/copyright';

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
}

function nullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function nullableCoordinate(record: Record<string, unknown>, key: string): number | null | undefined {
  const value = record[key];
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function normalizeAddressRegistrySuggestion(value: unknown): AddressRegistrySuggestion | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const canonicalAddressId = readString(record, 'canonicalAddressId');
  const sourceRecordId = readString(record, 'sourceRecordId');
  const formattedAddress = readString(record, 'formattedAddress');
  const countryCode = readString(record, 'countryCode').toUpperCase();
  const postalCode = readString(record, 'postalCode');
  const settlement = readString(record, 'settlement');
  const streetName = readString(record, 'streetName');
  const houseNumberFrom = readString(record, 'houseNumberFrom');
  const coordinatePrecision = readString(record, 'coordinatePrecision');
  const datasetVersion = readString(record, 'datasetVersion');
  const normalizationVersion = readString(record, 'normalizationVersion');
  const confidenceValue = typeof record.confidence === 'number'
    ? record.confidence
    : Number.NaN;
  const latitude = nullableCoordinate(record, 'latitude');
  const longitude = nullableCoordinate(record, 'longitude');
  const matchType = record.matchType;
  const attributionValue = record.attribution;
  const attribution = attributionValue && typeof attributionValue === 'object' && !Array.isArray(attributionValue)
    ? {
        text: readString(attributionValue as Record<string, unknown>, 'text'),
        url: readString(attributionValue as Record<string, unknown>, 'url'),
      }
    : null;

  if (
    !canonicalAddressId
    || !UUID.test(canonicalAddressId)
    || record.sourceSystem !== 'OSM'
    || !sourceRecordId
    || !OSM_SOURCE_ID.test(sourceRecordId)
    || !formattedAddress
    || formattedAddress.length > 500
    || !countryCode
    || !/^[A-Z]{2}$/.test(countryCode)
    || !postalCode
    || (countryCode === 'HU' && !/^[0-9]{4}$/.test(postalCode))
    || !settlement
    || !streetName
    || !houseNumberFrom
    || record.addressLevel !== 'BUILDING'
    || !coordinatePrecision
    || coordinatePrecision.length > 50
    || !Number.isFinite(confidenceValue)
    || confidenceValue < 0
    || confidenceValue > 1
    || typeof matchType !== 'string'
    || !['EXACT_HOUSE', 'PREFIX_HOUSE', 'FUZZY'].includes(matchType)
    || !datasetVersion
    || datasetVersion.length > 100
    || !normalizationVersion
    || normalizationVersion.length > 100
    || !attribution?.text
    || attribution.text.length > 200
    || attribution.url !== OSM_ATTRIBUTION_URL
    || latitude === undefined
    || longitude === undefined
    || (latitude === null) !== (longitude === null)
    || (latitude !== null && (latitude < -90 || latitude > 90))
    || (longitude !== null && (longitude < -180 || longitude > 180))
  ) {
    return null;
  }

  return {
    canonicalAddressId,
    sourceSystem: 'OSM',
    sourceRecordId,
    formattedAddress,
    countryCode,
    postalCode,
    settlement,
    district: nullableString(record, 'district'),
    settlementPart: nullableString(record, 'settlementPart'),
    streetName,
    streetType: nullableString(record, 'streetType'),
    houseNumberFrom,
    houseNumberTo: nullableString(record, 'houseNumberTo'),
    houseNumberSuffix: nullableString(record, 'houseNumberSuffix'),
    buildingMark: nullableString(record, 'buildingMark'),
    addressLevel: 'BUILDING',
    latitude,
    longitude,
    coordinatePrecision,
    confidence: confidenceValue,
    matchType: matchType as AddressRegistryMatchType,
    datasetVersion,
    normalizationVersion,
    attribution,
  };
}
