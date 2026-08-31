import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboard = readFileSync(
  resolve(process.cwd(), 'components/dashboard-client.tsx'),
  'utf8',
);

describe('legacy dashboard address-registry compatibility', () => {
  it('preserves canonical registry identity even while coordinates are pending', () => {
    expect(dashboard).not.toMatch(
      /\.filter\(\(item(?:: AddressOption)?\) => item\.lat !== null && item\.lon !== null\)/,
    );
    expect(dashboard).toContain('registry_canonical_address_id:');
    expect(dashboard).toContain("selectedAddress.sourceSystem === 'OSM' ? selectedAddress.id : null");
    expect(dashboard).toContain('a térképi koordináták feldolgozása még folyamatban van');
  });

  it('shows the mandatory OSM attribution in the existing profile address flow', () => {
    expect(dashboard).toContain('https://www.openstreetmap.org/copyright');
    expect(dashboard).toContain('© OpenStreetMap contributors');
    expect(dashboard).toContain('<AddressAutocomplete');
    expect(dashboard).toContain('id="profile-reference-address"');
    expect(dashboard).toContain('allowManual={false}');
    expect(dashboard).not.toContain("'OpenStreetMap (Nominatim)'");
  });

  it('does not re-resolve an unchanged saved address during a name-only save', () => {
    expect(dashboard).toContain('if (addressDirty && selectedAddress)');
    expect(dashboard).toContain("name.trim() !== savedName.trim()");
    expect(dashboard).not.toContain('addressOptions.map');
  });

  it('delegates search failures to the shared component without rendering upstream messages', () => {
    expect(dashboard).toContain("from '@/components/address-autocomplete'");
    expect(dashboard).not.toContain('setAddressError(');
    expect(dashboard).not.toContain('payload?.message');
  });
});
