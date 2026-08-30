'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, MapPin, Search } from 'lucide-react';
import { useI18n } from '@/src/i18n/useI18n';

export type AddressAutocompleteSelection = {
  id: string;
  label: string;
  countryCode: string;
  postcode: string;
  settlement: string;
  street: string;
  district?: string;
  houseNumber: string;
  lat: number | null;
  lon: number | null;
  sourceSystem: 'OSM';
  sourceRecordId: string;
  addressLevel: 'BUILDING';
  datasetVersion: string;
  normalizationVersion: string;
  confidence: number;
};

type Props = {
  id: string;
  label: string;
  query: string;
  selection: AddressAutocompleteSelection | null;
  manualMode: boolean;
  disabled?: boolean;
  allowManual?: boolean;
  showAttribution?: boolean;
  onQueryChange: (value: string) => void;
  onSelectionChange: (value: AddressAutocompleteSelection | null) => void;
  onManualModeChange: (value: boolean) => void;
};

type ApiPayload = {
  suggestions?: unknown[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeOption(value: unknown): AddressAutocompleteSelection | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const read = (key: string) => typeof item[key] === 'string' ? String(item[key]).trim() : '';
  const id = read('id');
  const label = read('label');
  const confidence = Number(item.confidence);
  if (
    !id
    || !UUID.test(id)
    || !label
    || read('countryCode') !== 'HU'
    || !/^[0-9]{4}$/.test(read('postcode'))
    || !read('settlement')
    || !read('street')
    || !read('houseNumber')
    || item.sourceSystem !== 'OSM'
    || !read('sourceRecordId')
    || item.addressLevel !== 'BUILDING'
  ) return null;

  const lat = item.lat === null || item.lat === undefined ? null : Number(item.lat);
  const lon = item.lon === null || item.lon === undefined ? null : Number(item.lon);
  return {
    id,
    label,
    countryCode: 'HU',
    postcode: read('postcode'),
    settlement: read('settlement'),
    street: read('street'),
    district: read('district') || undefined,
    houseNumber: read('houseNumber'),
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    sourceSystem: 'OSM',
    sourceRecordId: read('sourceRecordId'),
    addressLevel: 'BUILDING',
    datasetVersion: read('datasetVersion'),
    normalizationVersion: read('normalizationVersion'),
    confidence: Number.isFinite(confidence) ? confidence : 0,
  };
}

export default function AddressAutocomplete({
  id,
  label,
  query,
  selection,
  manualMode,
  disabled = false,
  allowManual = true,
  showAttribution = true,
  onQueryChange,
  onSelectionChange,
  onManualModeChange,
}: Props) {
  const { t } = useI18n();
  const generatedId = useId().replace(/:/g, '');
  const listboxId = `${id}-${generatedId}-listbox`;
  const [options, setOptions] = useState<AddressAutocompleteSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const requestSequence = useRef(0);

  const activeOptionId = open && activeIndex >= 0 && options[activeIndex]
    ? `${listboxId}-option-${activeIndex}`
    : undefined;
  const canSearch = !manualMode && query.trim().length >= 3 && (!selection || selection.label !== query);
  const noResults = canSearch && !loading && !error && open && options.length === 0;

  useEffect(() => {
    if (!canSearch) {
      setOptions([]);
      setLoading(false);
      setError('');
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    // A query change invalidates the previous result set immediately. This
    // prevents Enter or a delayed click from selecting a stale address while
    // the debounced request for the new text is still pending.
    setOptions([]);
    setOpen(false);
    setActiveIndex(-1);

    const controller = new AbortController();
    const sequence = ++requestSequence.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/location/autocomplete?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json() as ApiPayload;
        if (!response.ok) throw new Error(t('onboarding.addressSearch.unavailable'));
        if (sequence !== requestSequence.current) return;
        const next = Array.isArray(payload.suggestions)
          ? payload.suggestions.map(normalizeOption).filter((item): item is AddressAutocompleteSelection => item !== null)
          : [];
        setOptions(next);
        setOpen(true);
        setActiveIndex(next.length ? 0 : -1);
      } catch (caught) {
        if (controller.signal.aborted || sequence !== requestSequence.current) return;
        setOptions([]);
        setOpen(true);
        setActiveIndex(-1);
        setError(caught instanceof Error ? caught.message : t('onboarding.addressSearch.unavailable'));
      } finally {
        if (!controller.signal.aborted && sequence === requestSequence.current) setLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [canSearch, query, selection, t]);

  const statusText = useMemo(() => {
    if (loading) return t('onboarding.addressSearch.loading');
    if (error) return error;
    if (noResults) return t('onboarding.addressSearch.noResults');
    if (selection) return t('onboarding.addressSearch.selected');
    return '';
  }, [error, loading, noResults, selection, t]);

  function choose(option: AddressAutocompleteSelection) {
    onQueryChange(option.label);
    onSelectionChange(option);
    onManualModeChange(false);
    setOptions([]);
    setOpen(false);
    setActiveIndex(-1);
    setError('');
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!options.length || !open) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? options.length - 1 : current - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) choose(option);
    }
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={open && options.length > 0 ? listboxId : undefined}
          aria-expanded={open && options.length > 0}
          aria-activedescendant={activeOptionId}
          aria-describedby={`${id}-help ${id}-status`}
          aria-busy={loading}
          required
          minLength={5}
          maxLength={manualMode ? 300 : 120}
          autoComplete="street-address"
          value={query}
          disabled={disabled}
          onFocus={() => { if (options.length || error) setOpen(true); }}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            onQueryChange(event.target.value);
            if (selection) onSelectionChange(null);
            setError('');
          }}
          className="input-base min-h-11 pl-10 pr-10"
          placeholder={t('onboarding.addressSearch.placeholder')}
        />
        {loading ? <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-brand-700" aria-hidden="true" /> : null}
      </div>

      <p id={`${id}-help`} className="mt-1.5 text-xs leading-relaxed text-canvas-muted">
        {manualMode ? t('onboarding.addressSearch.manualHelp') : t('onboarding.addressSearch.help')}
      </p>
      <p id={`${id}-status`} role="status" aria-live="polite" className="sr-only">{statusText}</p>

      {selection && !manualMode ? (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span><strong>{t('onboarding.addressSearch.selected')}:</strong> {selection.label}</span>
        </div>
      ) : null}

      {open && options.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t('onboarding.addressSearch.resultsLabel')}
          className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-canvas-line bg-white p-1.5 shadow-overlay"
        >
          {options.map((option, index) => (
            <li
              id={`${listboxId}-option-${index}`}
              key={option.id}
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
              className={`flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${activeIndex === index ? 'bg-brand-50 text-brand-950' : 'text-slate-700 hover:bg-canvas-sage'}`}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-snug">{option.label}</span>
                <span className="mt-0.5 block text-xs text-canvas-muted">{t('onboarding.addressSearch.buildingLevel')}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {open && (noResults || error) ? (
        <div className={`mt-2 rounded-xl border px-3 py-2.5 text-sm ${error ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-canvas-line bg-canvas-sage text-canvas-muted'}`}>
          {error || t('onboarding.addressSearch.noResults')}
        </div>
      ) : null}

      {showAttribution || allowManual ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          {showAttribution ? (
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
            >
              © OpenStreetMap contributors
            </a>
          ) : <span />}
          {allowManual ? (
            <button
              type="button"
              disabled={disabled}
              className="font-semibold text-canvas-muted underline decoration-slate-300 underline-offset-2 hover:text-canvas-ink"
              onClick={() => {
                onManualModeChange(!manualMode);
                onSelectionChange(null);
                setOptions([]);
                setOpen(false);
                setError('');
              }}
            >
              {manualMode ? t('onboarding.addressSearch.backToSearch') : t('onboarding.addressSearch.manualAction')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
