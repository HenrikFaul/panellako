// English (en) locale strings
// Placeholder file — full i18n integration pending.
// Pre-commit hook requires this file to be present alongside component changes.

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
} as const;

export type EnMessages = typeof en;
