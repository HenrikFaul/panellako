import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import AddressAutocomplete, { type AddressAutocompleteSelection } from '../../components/address-autocomplete';

const suggestion = {
  id: '11111111-1111-4111-8111-111111111111',
  label: '1135 Budapest, Gidófalvy Lajos utca 9.',
  countryCode: 'HU',
  postcode: '1135',
  settlement: 'Budapest',
  street: 'Gidófalvy Lajos utca',
  district: 'XIII. kerület',
  houseNumber: '9',
  lat: 47.535,
  lon: 19.071,
  source: 'supabase',
  sourceSystem: 'OSM',
  sourceRecordId: 'osm:node:123',
  addressLevel: 'BUILDING',
  datasetVersion: 'osm-hu-2026-08-30',
  normalizationVersion: 'address-registry-v1',
  confidence: 0.99,
};

function Harness() {
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<AddressAutocompleteSelection | null>(null);
  const [manual, setManual] = useState(false);
  return (
    <AddressAutocomplete
      id="address"
      label="Pontos cím"
      query={query}
      selection={selection}
      manualMode={manual}
      onQueryChange={setQuery}
      onSelectionChange={setSelection}
      onManualModeChange={setManual}
    />
  );
}

beforeEach(() => {
  document.documentElement.lang = 'hu';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ suggestions: [suggestion] }),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AddressAutocomplete', () => {
  it('implements an ARIA combobox and supports keyboard selection', async () => {
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Pontos cím' });
    expect(input).toHaveAttribute('aria-autocomplete', 'list');

    fireEvent.change(input, { target: { value: '1135 Gidófalvy 9' } });

    expect(await screen.findByRole('option', { name: /Gidófalvy Lajos utca 9/i })).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(input).toHaveValue(suggestion.label);
      expect(screen.getByText(/Ellenőrzött címforrás kiválasztva:/i)).toBeInTheDocument();
    });
  });

  it('invalidates a selection when its visible text is edited', async () => {
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Pontos cím' });
    fireEvent.change(input, { target: { value: '1135 Gidófalvy 9' } });
    await screen.findByRole('option', { name: /Gidófalvy Lajos utca 9/i });
    fireEvent.click(screen.getByText(suggestion.label));
    expect(screen.getByText(/Ellenőrzött címforrás kiválasztva:/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: `${suggestion.label} más` } });
    expect(screen.queryByText(/Ellenőrzött címforrás kiválasztva:/i)).not.toBeInTheDocument();
  });

  it('removes stale active-descendant state when the result list closes on blur', async () => {
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Pontos cím' });
    fireEvent.change(input, { target: { value: '1135 Gidófalvy 9' } });
    await screen.findByRole('option', { name: /Gidófalvy Lajos utca 9/i });
    expect(input).toHaveAttribute('aria-activedescendant');

    fireEvent.blur(input, { relatedTarget: null });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('offers an explicit manual-review mode without pretending the address is verified', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Nem találom a címemet' }));

    expect(screen.getByText(/kézzel megadott cím csak ellenőrzési kérelmet indít/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vissza a címkereséshez' })).toBeInTheDocument();
  });

  it('shows OSM attribution next to every address workflow', () => {
    render(<Harness />);
    expect(screen.getByRole('link', { name: /OpenStreetMap contributors/i })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/copyright',
    );
  });
});
