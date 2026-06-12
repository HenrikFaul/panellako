// Hungarian (hu) locale strings
// Placeholder file — full i18n integration pending.
// Pre-commit hook requires this file to be present alongside component changes.
// v0.9.33 — enterprise redesign: shared UI primitive strings + new error/status copy
// v0.9.33 round 2-3 — no new user-facing strings; superadmin/billing dark conversion, emoji-chrome sweep, bottom-nav scroll-spy

export const hu = {
  ui: {
    retry:               'Újrapróbálás',
    loading:             'Betöltés',
    noResults:           'Nincs találat',
    estimatedDataBadge:  'becsült adat — élő forrás nem elérhető',
    heatIslandUnavailable: 'Hősziget-adatok jelenleg nem elérhetők',
    unitMasterData:      'Albetét törzsadatok',
  },
  noiseMap: {
    loading:              'Zajtérkép betöltése…',
    layerLoading:         'Zajréteg betöltése (HungaroMet → NIF → EEA)…',
    iotToggle:            'IoT mérések (NoiseCapture)',
    iotLoading:           'IoT mérések lekérése…',
    iotUnavailable:       'NoiseCapture adatok jelenleg nem elérhetők',
    iotMeasurements:      'mérés',
    sourceBadge:          'Stratégiai zajtérkép',
    noisecaptureBadge:    'NoiseCapture',
    buildingTooltip:      'Az épület',
    unknownTime:          'ismeretlen időpont',
    noisecaptureLabel:    'NoiseCapture mérés',
    errorTitle:           'Zajadatok jelenleg nem elérhetők',
    errorBody:            'A HungaroMet, NIF és EEA WMS szerverek egyike sem válaszolt. Próbálj meg közvetlenül a forrásra navigálni:',
    legendTitle:          'Zajterhelés (dB)',
    legendFootnote:       'EU END 2002/49/EK irányelv',
  },
  superadmin: {
    users: {
      title:             'Felhasználók',
      search:            'Keresés név vagy e-mail alapján…',
      registeredAt:      'Regisztrált',
      trialEnd:          'Próbaidőszak vége',
      noMatch:           'Nincs találat',
      regDate:           'Regisztrációs dátum',
      notEditable:       'NEM MÓDOSÍTHATÓ',
      trialStart:        'Próbaidőszak kezdete',
      trialDays:         'Ingyenes időszak (nap)',
      expires:           'Lejár',
      neverExpires:      'Soha nem jár le',
      permanentAccess:   'Örökös hozzáférés',
      save:              'Mentés',
      cancel:            'Mégse',
      saved:             '✓ Mentve',
      trialExpired:      'Lejárt',
    },
    features: {
      title:             'Funkció & Tier',
      search:            'Szabad szöveges keresés (funkció / kulcs / útvonal)…',
      allModules:        'Összes modul',
      treeView:          'Fa nézet',
      flatView:          'Lapos útvonal',
      routeAudit:        'Routing audit',
      duplicate:         'duplikált route_path + menu_path',
      tiers:             'Tier-ek',
      features:          'Funkciók',
      modules:           'Modulok',
      active:            'Aktív',
      disabled:          'Kikapcsolt',
      save:              'Mentés',
      cancel:            'Mégse',
      name:              'Megnevezés',
      module:            'Modul',
      tier:              'Tier',
      routePath:         'Útvonal (route_path)',
      menuPath:          'Menü elhelyezkedés',
      description:       'Leírás',
      edit:              'Szerkesztés',
    },
  },
} as const;

export type HuMessages = typeof hu;
