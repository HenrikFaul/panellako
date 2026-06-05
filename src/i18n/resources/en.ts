// English (en) locale strings
// Placeholder file — full i18n integration pending.
// Pre-commit hook requires this file to be present alongside component changes.
// v0.9.32 — no new user-facing strings; best-practices adoptálás (TS, satisfies, oklch, errors, hooks)

export const en = {
  noiseMap: {
    loading:              'Loading noise map…',
    layerLoading:         'Loading noise layer (HungaroMet → NIF → EEA)…',
    iotToggle:            'IoT measurements (NoiseCapture)',
    iotLoading:           'Fetching IoT measurements…',
    iotUnavailable:       'NoiseCapture data currently unavailable',
    iotMeasurements:      'measurements',
    sourceBadge:          'Strategic noise map',
    noisecaptureBadge:    'NoiseCapture',
    buildingTooltip:      'Your building',
    unknownTime:          'unknown time',
    noisecaptureLabel:    'NoiseCapture measurement',
    errorTitle:           'Noise data currently unavailable',
    errorBody:            'None of the HungaroMet, NIF or EEA WMS servers responded. Try navigating directly to the source:',
    legendTitle:          'Noise level (dB)',
    legendFootnote:       'EU END Directive 2002/49/EC',
  },
  superadmin: {
    users: {
      title:             'Users',
      search:            'Search by name or email…',
      registeredAt:      'Registered',
      trialEnd:          'Trial expiry',
      noMatch:           'No results',
      regDate:           'Registration date',
      notEditable:       'READ ONLY',
      trialStart:        'Trial start date',
      trialDays:         'Free period (days)',
      expires:           'Expires',
      neverExpires:      'Never expires',
      permanentAccess:   'Permanent access',
      save:              'Save',
      cancel:            'Cancel',
      saved:             '✓ Saved',
      trialExpired:      'Expired',
    },
    features: {
      title:             'Feature & Tier',
      search:            'Free-text search (feature / key / route)…',
      allModules:        'All modules',
      treeView:          'Tree view',
      flatView:          'Flat route',
      routeAudit:        'Routing audit',
      duplicate:         'duplicate route_path + menu_path',
      tiers:             'Tiers',
      features:          'Features',
      modules:           'Modules',
      active:            'Active',
      disabled:          'Disabled',
      save:              'Save',
      cancel:            'Cancel',
      name:              'Name',
      module:            'Module',
      tier:              'Tier',
      routePath:         'Route path',
      menuPath:          'Menu location',
      description:       'Description',
      edit:              'Edit',
    },
  },
} as const;

export type EnMessages = typeof en;
