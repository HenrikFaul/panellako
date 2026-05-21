// Budapest 2030 — EU Green Capital Strategic Indicators
// Static data file: all 11 EU Green Capital indicators + 5 strategy pillars
// Sources: KSH, EEA, BKK Annual Reports, Budapest 2030 ITS Strategy Document

export type IndicatorStatus = 'jo' | 'kozepes' | 'kritikus';
export type TrendDirection = 'javul' | 'stabil' | 'romlik';

export interface BudapestIndicator {
  id: string;
  categoryHu: string;
  nameHu: string;
  descriptionHu: string;
  currentValue: number;
  unit: string;
  euThreshold: number;
  target2030: number;
  baselineYear: number;
  currentYear: number;
  status: IndicatorStatus;
  trend: TrendDirection;
  historicalData: { year: number; value: number }[];
  districtData: { district: number; name: string; value: number }[];
  residentActionHu: string[];
  dataSourceHu: string;
  euComparisonData: { city: string; value: number; color: string }[];
}

export interface Budapest2030Goal {
  id: string;
  nameHu: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  progressPercent: number;
  dataSourceHu: string;
}

export interface Budapest2030Pillar {
  id: 'elheto' | 'zold' | 'dinamikus' | 'gondoskodo' | 'okos';
  nameHu: string;
  icon: string;
  colorClass: string;
  goals: Budapest2030Goal[];
}

// ─── 11 EU Green Capital Indicators ──────────────────────────────────────────

export const BUDAPEST_INDICATORS: BudapestIndicator[] = [
  {
    id: 'levego',
    categoryHu: 'Levegőminőség',
    nameHu: 'PM2.5 részecskék',
    descriptionHu: 'Légköri finomrészecske-koncentráció éves átlag. Az EU határérték 12 µg/m³, Budapest jelenleg enyhe túllépéssel küzd, de az érték csökkentő trendben van az autóforgalom és az ipar csökkentése nyomán.',
    currentValue: 14,
    unit: 'µg/m³',
    euThreshold: 12,
    target2030: 10,
    baselineYear: 2015,
    currentYear: 2023,
    status: 'kozepes',
    trend: 'javul',
    historicalData: [
      { year: 2015, value: 22 },
      { year: 2016, value: 20 },
      { year: 2017, value: 19 },
      { year: 2018, value: 18 },
      { year: 2019, value: 17 },
      { year: 2020, value: 16 },
      { year: 2021, value: 15 },
      { year: 2022, value: 14 },
      { year: 2023, value: 14 },
    ],
    districtData: [
      { district: 1,  name: 'I. ker.',   value: 12.1 },
      { district: 2,  name: 'II. ker.',  value: 11.4 },
      { district: 3,  name: 'III. ker.', value: 13.7 },
      { district: 4,  name: 'IV. ker.',  value: 15.2 },
      { district: 5,  name: 'V. ker.',   value: 14.8 },
      { district: 6,  name: 'VI. ker.',  value: 16.1 },
      { district: 7,  name: 'VII. ker.', value: 17.3 },
      { district: 8,  name: 'VIII. ker.',value: 18.5 },
      { district: 9,  name: 'IX. ker.',  value: 16.8 },
      { district: 10, name: 'X. ker.',   value: 15.9 },
      { district: 11, name: 'XI. ker.',  value: 12.9 },
      { district: 12, name: 'XII. ker.', value: 10.8 },
      { district: 13, name: 'XIII. ker.',value: 14.2 },
      { district: 14, name: 'XIV. ker.', value: 14.7 },
      { district: 15, name: 'XV. ker.',  value: 13.8 },
      { district: 16, name: 'XVI. ker.', value: 13.1 },
      { district: 17, name: 'XVII. ker.',value: 12.6 },
      { district: 18, name: 'XVIII. ker.',value: 13.9 },
      { district: 19, name: 'XIX. ker.', value: 15.4 },
      { district: 20, name: 'XX. ker.',  value: 16.2 },
      { district: 21, name: 'XXI. ker.', value: 17.1 },
      { district: 22, name: 'XXII. ker.',value: 11.9 },
      { district: 23, name: 'XXIII. ker.',value: 13.3 },
    ],
    residentActionHu: [
      'Használj tömegközlekedést vagy kerékpárt a személyautó helyett — ez a legtöbbet tesz a PM2.5 csökkentéséért.',
      'Kerüld a fatüzelés és szemérégetés légszennyező hatásait a kertes területeken.',
      'Télen inkább gáz- vagy elektromos fűtést válassz a szilárd tüzelőanyag helyett.',
    ],
    dataSourceHu: 'EEA Air Quality Database, OLM (Országos Légköri Mérőhálózat) 2023',
    euComparisonData: [
      { city: 'Budapest', value: 14,  color: '#6366f1' },
      { city: 'Bécs',     value: 9.8, color: '#22c55e' },
      { city: 'Prága',    value: 13.1,color: '#eab308' },
      { city: 'Varsó',    value: 18.4,color: '#f97316' },
      { city: 'Pozsony',  value: 14.8,color: '#a855f7' },
    ],
  },
  {
    id: 'zaj',
    categoryHu: 'Zajszennyezés',
    nameHu: 'Zajterhelés (>55 dB Lden)',
    descriptionHu: 'A 24 órás súlyozott hangnyomásszintnek (Lden) kitett, 55 dB feletti zajnak folyamatosan exposed lakók aránya. Az EU célérték 15% alatt van, Budapest messze meghaladja ezt a frekventált közlekedési tengelyek miatt.',
    currentValue: 23,
    unit: '% lakos',
    euThreshold: 15,
    target2030: 18,
    baselineYear: 2015,
    currentYear: 2023,
    status: 'kritikus',
    trend: 'stabil',
    historicalData: [
      { year: 2015, value: 26 },
      { year: 2016, value: 25.5 },
      { year: 2017, value: 25 },
      { year: 2018, value: 24.8 },
      { year: 2019, value: 24.5 },
      { year: 2020, value: 22 },
      { year: 2021, value: 23.5 },
      { year: 2022, value: 23.2 },
      { year: 2023, value: 23 },
    ],
    districtData: [],
    residentActionHu: [
      'Jelezd a Főpolgármesteri Hivatal Zöld Főváros pályázatán a kerületed zajterhelési pontjait.',
      'Kerékpáros és gyalogos mozgalmakba való bekapcsolódás csökkenti a közúti forgalmat.',
    ],
    dataSourceHu: 'Budapest Főváros Zajvédelmi Intézkedési Terv 2021–2025, EEA Noise Report',
    euComparisonData: [
      { city: 'Budapest', value: 23,  color: '#6366f1' },
      { city: 'Bécs',     value: 11,  color: '#22c55e' },
      { city: 'Prága',    value: 19,  color: '#eab308' },
      { city: 'Varsó',    value: 25,  color: '#f97316' },
      { city: 'Pozsony',  value: 21,  color: '#a855f7' },
    ],
  },
  {
    id: 'hulladek',
    categoryHu: 'Hulladékgazdálkodás',
    nameHu: 'Szelektív hulladékgyűjtési arány',
    descriptionHu: 'A keletkező kommunális hulladékból újrafeldolgozásra kerülő arány. Budapest 22%-os rátája messze elmarad az EU 50%-os célértékétől; az infrastruktúra fejlesztése és a szemléletváltás együttesen szükséges.',
    currentValue: 22,
    unit: '% recycling',
    euThreshold: 50,
    target2030: 40,
    baselineYear: 2015,
    currentYear: 2023,
    status: 'kritikus',
    trend: 'javul',
    historicalData: [
      { year: 2015, value: 12 },
      { year: 2016, value: 13 },
      { year: 2017, value: 14 },
      { year: 2018, value: 15 },
      { year: 2019, value: 17 },
      { year: 2020, value: 18 },
      { year: 2021, value: 19 },
      { year: 2022, value: 21 },
      { year: 2023, value: 22 },
    ],
    districtData: [],
    residentActionHu: [
      'Helyezd az újrahasznosítható anyagokat (papír, műanyag, üveg, fém) a szelektív kukába.',
      'Csökkentsd a csomagolási hulladékot: hozd el a saját bevásárlózsákodat és kerüld az egyszer használatos termékeket.',
      'Komposztálj a lakóközösségeden belül: egy kiskertben vagy erkélyen is megoldható a biohulladék feldolgozása.',
    ],
    dataSourceHu: 'KSH Hulladékgazdálkodási Statisztika, Fővárosi Hulladékgazdálkodási Terv 2023',
    euComparisonData: [
      { city: 'Budapest', value: 22,  color: '#6366f1' },
      { city: 'Bécs',     value: 58,  color: '#22c55e' },
      { city: 'Prága',    value: 38,  color: '#eab308' },
      { city: 'Varsó',    value: 29,  color: '#f97316' },
      { city: 'Pozsony',  value: 27,  color: '#a855f7' },
    ],
  },
  {
    id: 'termeszet',
    categoryHu: 'Természet és biodiverzitás',
    nameHu: 'Zöldterület / fő',
    descriptionHu: 'Könnyen elérhető (300 m-en belüli) zöldterület négyzetmétere fejenként. A WHO ajánlása 9 m²/fő; Budapest 7.2 m²-rel közeledik a célhoz, de különösen a belső kerületekben hiányos a zöld infrastruktúra.',
    currentValue: 7.2,
    unit: 'm²/fő',
    euThreshold: 9,
    target2030: 9,
    baselineYear: 2015,
    currentYear: 2023,
    status: 'kozepes',
    trend: 'javul',
    historicalData: [
      { year: 2015, value: 5.8 },
      { year: 2016, value: 5.9 },
      { year: 2017, value: 6.1 },
      { year: 2018, value: 6.3 },
      { year: 2019, value: 6.5 },
      { year: 2020, value: 6.7 },
      { year: 2021, value: 6.9 },
      { year: 2022, value: 7.0 },
      { year: 2023, value: 7.2 },
    ],
    districtData: [],
    residentActionHu: [
      'Támogasd a közösségi kertprogramokat — az urbanizált területeken is létrehozhatók kisebb zöld oázisok.',
      'Ültesd be az erkélyt vagy loggiát cserepes növényekkel a biodiverzitás növeléséhez.',
    ],
    dataSourceHu: 'Budapest Főváros Zöldinfrastruktúra Stratégia 2021, EEA Urban Green Infrastructure',
    euComparisonData: [
      { city: 'Budapest', value: 7.2,  color: '#6366f1' },
      { city: 'Bécs',     value: 18.5, color: '#22c55e' },
      { city: 'Prága',    value: 10.1, color: '#eab308' },
      { city: 'Varsó',    value: 8.4,  color: '#f97316' },
      { city: 'Pozsony',  value: 9.7,  color: '#a855f7' },
    ],
  },
  {
    id: 'viz',
    categoryHu: 'Vízfogyasztás',
    nameHu: 'Ivóvíz-felhasználás',
    descriptionHu: 'Napi egy főre jutó ivóvíz-felhasználás. Budapest 92 L/fő/nap értéke már az EU 80 L/fő/nap célérték közelébe ért, de a hálózati veszteségek (18-22%) még jelentős tartalékot jelentenek.',
    currentValue: 92,
    unit: 'L/fő/nap',
    euThreshold: 80,
    target2030: 80,
    baselineYear: 2015,
    currentYear: 2023,
    status: 'kozepes',
    trend: 'javul',
    historicalData: [
      { year: 2015, value: 115 },
      { year: 2016, value: 112 },
      { year: 2017, value: 109 },
      { year: 2018, value: 107 },
      { year: 2019, value: 104 },
      { year: 2020, value: 100 },
      { year: 2021, value: 97 },
      { year: 2022, value: 95 },
      { year: 2023, value: 92 },
    ],
    districtData: [],
    residentActionHu: [
      'Ellenőrizd a vízórát rendszeresen: egy csöpögő csap napi 20-50 litert veszteget.',
      'Zuhanyozás helyett fürdetés: 5 perces zuhany ~50 L, kád ~150 L.',
      'Esővíz-gyűjtéssel öntözd a balkonládákat és erkélyi növényeket.',
    ],
    dataSourceHu: 'Fővárosi Vízművek Éves Jelentés 2023, KSH Vízgazdálkodási Statisztika',
    euComparisonData: [
      { city: 'Budapest', value: 92,  color: '#6366f1' },
      { city: 'Bécs',     value: 74,  color: '#22c55e' },
      { city: 'Prága',    value: 88,  color: '#eab308' },
      { city: 'Varsó',    value: 98,  color: '#f97316' },
      { city: 'Pozsony',  value: 95,  color: '#a855f7' },
    ],
  },
  {
    id: 'okoinnovacio',
    categoryHu: 'Öko-innováció',
    nameHu: 'Ökoinnovációs foglalkoztatás',
    descriptionHu: 'A zöldgazdaságban (megújuló energia, hulladékgazdálkodás, víztisztítás, ökológiai szolgáltatások) foglalkoztatottak aránya az összes munkavállalóhoz képest. Budapest elmarad az EU 5%-os referenciaértéktől.',
    currentValue: 3.2,
    unit: '% munkaerő',
    euThreshold: 5,
    target2030: 6,
    baselineYear: 2015,
    currentYear: 2023,
    status: 'kozepes',
    trend: 'javul',
    historicalData: [
      { year: 2015, value: 1.8 },
      { year: 2016, value: 2.0 },
      { year: 2017, value: 2.2 },
      { year: 2018, value: 2.4 },
      { year: 2019, value: 2.6 },
      { year: 2020, value: 2.8 },
      { year: 2021, value: 2.9 },
      { year: 2022, value: 3.1 },
      { year: 2023, value: 3.2 },
    ],
    districtData: [],
    residentActionHu: [
      'Fontold meg az átképzést zöldenergia- vagy fenntarthatósági szakirányra — növekvő szektorok.',
      'Válassz helyi zöldgazdasági vállalkozásokat termékek és szolgáltatások esetén.',
    ],
    dataSourceHu: 'KSH Munkaerőpiaci Statisztika, NKFI Hivatal Innovációs Jelentés 2023',
    euComparisonData: [
      { city: 'Budapest', value: 3.2, color: '#6366f1' },
      { city: 'Bécs',     value: 6.1, color: '#22c55e' },
      { city: 'Prága',    value: 4.2, color: '#eab308' },
      { city: 'Varsó',    value: 3.5, color: '#f97316' },
      { city: 'Pozsony',  value: 3.8, color: '#a855f7' },
    ],
  },
  {
    id: 'kozlekedes',
    categoryHu: 'Helyi közlekedés',
    nameHu: 'Tömegközlekedési modal share',
    descriptionHu: 'Naponta tömegközlekedéssel (metró, villamos, busz, HÉV, hajó) utazók aránya az összes utazáson belül. Budapest 42%-os értéke elmarad az EU 50%-os célától, de a BKK fejlesztések hatása lassan érzékelhető.',
    currentValue: 42,
    unit: '% modal share',
    euThreshold: 50,
    target2030: 55,
    baselineYear: 2015,
    currentYear: 2023,
    status: 'kozepes',
    trend: 'stabil',
    historicalData: [
      { year: 2015, value: 45 },
      { year: 2016, value: 44.5 },
      { year: 2017, value: 44 },
      { year: 2018, value: 43.5 },
      { year: 2019, value: 43 },
      { year: 2020, value: 38 },
      { year: 2021, value: 41 },
      { year: 2022, value: 42 },
      { year: 2023, value: 42 },
    ],
    districtData: [],
    residentActionHu: [
      'Hagyd otthon az autódat és válts BKK bérlettel tömegközlekedésre — Budapest BKK hálózata Közép-Európa egyik legsűrűbb hálózata.',
      'Kerékpárt + metróban szállítani is lehetséges: kombinált közlekedés csökkenti az autófüggőséget.',
      'Nézd meg a BKK FUTÁR alkalmazást a valós idejű menetrend-információhoz.',
    ],
    dataSourceHu: 'BKK Éves Jelentés 2023, KSH Közlekedési Statisztika',
    euComparisonData: [
      { city: 'Budapest', value: 42, color: '#6366f1' },
      { city: 'Bécs',     value: 62, color: '#22c55e' },
      { city: 'Prága',    value: 54, color: '#eab308' },
      { city: 'Varsó',    value: 49, color: '#f97316' },
      { city: 'Pozsony',  value: 38, color: '#a855f7' },
    ],
  },
  {
    id: 'co2',
    categoryHu: 'CO₂ kibocsátás',
    nameHu: 'Egy főre jutó CO₂ kibocsátás',
    descriptionHu: 'Az éves szén-dioxid-ekvivalens kibocsátás főre vetítve, a közlekedést, fűtést és fogyasztást beleértve. Budapest 4.8 t CO₂/fő értéke csökkentő trendben van, de az EU 3.0 t/fő célértéktől még messze van.',
    currentValue: 4.8,
    unit: 't CO₂/fő/év',
    euThreshold: 3.0,
    target2030: 3.5,
    baselineYear: 2015,
    currentYear: 2023,
    status: 'kritikus',
    trend: 'javul',
    historicalData: [
      { year: 2015, value: 6.8 },
      { year: 2016, value: 6.5 },
      { year: 2017, value: 6.3 },
      { year: 2018, value: 6.1 },
      { year: 2019, value: 5.8 },
      { year: 2020, value: 5.2 },
      { year: 2021, value: 5.4 },
      { year: 2022, value: 5.0 },
      { year: 2023, value: 4.8 },
    ],
    districtData: [],
    residentActionHu: [
      'Kapcsolj át megújuló energiaforrásra: napelemek, zöldáram-tarifák — akár bérelt lakásban is lehetséges.',
      'Csökkentsd a fűtési hőmérsékletet 1 °C-kal: évi kb. 6% energiamegtakarítást jelent.',
      'Rövid utakon autó helyett gyaloglás vagy kerékpározás: nulla CO₂ kibocsátással.',
    ],
    dataSourceHu: 'EEA GHG Inventory, KSH Energiafelhasználási Statisztika, Budapest Klímastratégia 2023',
    euComparisonData: [
      { city: 'Budapest', value: 4.8, color: '#6366f1' },
      { city: 'Bécs',     value: 3.1, color: '#22c55e' },
      { city: 'Prága',    value: 5.4, color: '#eab308' },
      { city: 'Varsó',    value: 6.1, color: '#f97316' },
      { city: 'Pozsony',  value: 4.5, color: '#a855f7' },
    ],
  },
  {
    id: 'energia',
    categoryHu: 'Energiagazdálkodás',
    nameHu: 'Megújuló energiaforrások aránya',
    descriptionHu: 'A városi energia-felhasználásból megújuló forrásokból (napenergia, geotermia, biomassza) fedezett részarány. Budapest 18%-os aránya elmarad az EU 30%-os célértéktől, de a napelem-kapacitás gyorsan növekszik.',
    currentValue: 18,
    unit: '% megújuló',
    euThreshold: 30,
    target2030: 32,
    baselineYear: 2015,
    currentYear: 2023,
    status: 'kozepes',
    trend: 'javul',
    historicalData: [
      { year: 2015, value: 7 },
      { year: 2016, value: 8 },
      { year: 2017, value: 9 },
      { year: 2018, value: 10 },
      { year: 2019, value: 12 },
      { year: 2020, value: 14 },
      { year: 2021, value: 15 },
      { year: 2022, value: 16 },
      { year: 2023, value: 18 },
    ],
    districtData: [],
    residentActionHu: [
      'Telepíts napelemeket a tetőre vagy erkélyre: a METÁR+ pályázat támogatja a magánszemélyeket.',
      'Válassz zöldáram-tarifát a közüzemi szolgáltatótól — egyre több elérhetővé válik.',
    ],
    dataSourceHu: 'MEKH (Magyar Energetikai és Közszolgáltatási Hivatal) Éves Összefoglaló 2023',
    euComparisonData: [
      { city: 'Budapest', value: 18, color: '#6366f1' },
      { city: 'Bécs',     value: 45, color: '#22c55e' },
      { city: 'Prága',    value: 22, color: '#eab308' },
      { city: 'Varsó',    value: 14, color: '#f97316' },
      { city: 'Pozsony',  value: 20, color: '#a855f7' },
    ],
  },
  {
    id: 'terulet',
    categoryHu: 'Területhasználat',
    nameHu: 'Beépítettségi arány',
    descriptionHu: 'A városi területből burkolt (beépített, leaszfaltozott) felszín aránya. Budapest 52%-os értéke közepesnek számít az EU-ban; a kizöldítési programok (tetőkertek, felszíni vízkezelés) csökkenthetik ezt az arányt.',
    currentValue: 52,
    unit: '% beépítettség',
    euThreshold: 50,
    target2030: 48,
    baselineYear: 2015,
    currentYear: 2023,
    status: 'kozepes',
    trend: 'stabil',
    historicalData: [
      { year: 2015, value: 54 },
      { year: 2016, value: 54 },
      { year: 2017, value: 53.5 },
      { year: 2018, value: 53.5 },
      { year: 2019, value: 53 },
      { year: 2020, value: 53 },
      { year: 2021, value: 52.5 },
      { year: 2022, value: 52 },
      { year: 2023, value: 52 },
    ],
    districtData: [],
    residentActionHu: [
      'Követeld az önkormányzattól a beton helyett zöldfelületek létrehozását a köztereken.',
      'Csatlakozz helyi közösségi kert-kezdeményezésekhez: üres telkek zöldítése csökkenti a beépítettséget.',
    ],
    dataSourceHu: 'BM OTÉK Alapadatok, Budapest Főváros Területfejlesztési Terv 2023',
    euComparisonData: [
      { city: 'Budapest', value: 52, color: '#6366f1' },
      { city: 'Bécs',     value: 41, color: '#22c55e' },
      { city: 'Prága',    value: 48, color: '#eab308' },
      { city: 'Varsó',    value: 55, color: '#f97316' },
      { city: 'Pozsony',  value: 50, color: '#a855f7' },
    ],
  },
  {
    id: 'iranyitas',
    categoryHu: 'Irányítás és részvétel',
    nameHu: 'Környezeti stratégiai pontszám',
    descriptionHu: 'A városi klíma- és fenntarthatósági stratégia kidolgozottságát, végrehajtási monitoring rendszerét és polgári bevonási mechanizmusait mérő összetett EU-index (0–100). Budapest 65/100 pontja a célhoz közelíti, de a végrehajtási lépések ütemezése még hiányos.',
    currentValue: 65,
    unit: 'pont /100',
    euThreshold: 75,
    target2030: 80,
    baselineYear: 2015,
    currentYear: 2023,
    status: 'kozepes',
    trend: 'javul',
    historicalData: [
      { year: 2015, value: 40 },
      { year: 2016, value: 44 },
      { year: 2017, value: 47 },
      { year: 2018, value: 50 },
      { year: 2019, value: 54 },
      { year: 2020, value: 57 },
      { year: 2021, value: 60 },
      { year: 2022, value: 62 },
      { year: 2023, value: 65 },
    ],
    districtData: [],
    residentActionHu: [
      'Vegyél részt a Fővárosi Önkormányzat közmeghallgatásain és online konzultációin.',
      'Kövesd nyomon a Budapest 2030 stratégia megvalósítási riportjait és jelezd észrevételeidet.',
    ],
    dataSourceHu: 'EEA European Green Capital Assessment 2023, Budapest 2030 ITS Megvalósítási Riport',
    euComparisonData: [
      { city: 'Budapest', value: 65, color: '#6366f1' },
      { city: 'Bécs',     value: 88, color: '#22c55e' },
      { city: 'Prága',    value: 72, color: '#eab308' },
      { city: 'Varsó',    value: 61, color: '#f97316' },
      { city: 'Pozsony',  value: 68, color: '#a855f7' },
    ],
  },
];

// ─── Budapest 2030 Strategy Pillars ──────────────────────────────────────────

export const BUDAPEST_2030_PILLARS: Budapest2030Pillar[] = [
  {
    id: 'elheto',
    nameHu: 'Élhető Budapest',
    icon: '🏙️',
    colorClass: 'text-sky-400',
    goals: [
      {
        id: 'elheto-lakas',
        nameHu: 'Megfizethető lakhatás',
        currentValue: 41,
        targetValue: 60,
        unit: '% megfizethető lakás az összes lakásból',
        progressPercent: 68,
        dataSourceHu: 'KSH Lakásstatisztika 2023',
      },
      {
        id: 'elheto-kozter',
        nameHu: 'Köztéri férőhely',
        currentValue: 7.2,
        targetValue: 12,
        unit: 'm² köztér/fő',
        progressPercent: 60,
        dataSourceHu: 'Budapest Főváros Területrendezési Terv 2023',
      },
      {
        id: 'elheto-szocialis',
        nameHu: 'Szociális szolgáltatás lefedettség',
        currentValue: 62,
        targetValue: 90,
        unit: '% lefedettség',
        progressPercent: 69,
        dataSourceHu: 'BSSZ (Budapest Szociális Szolgáltatói Hálózat) Éves Riport 2023',
      },
    ],
  },
  {
    id: 'zold',
    nameHu: 'Zöld Budapest',
    icon: '🌿',
    colorClass: 'text-emerald-400',
    goals: [
      {
        id: 'zold-fedeles',
        nameHu: 'Zöldfelület-arány',
        currentValue: 34,
        targetValue: 45,
        unit: '% zöldfelület',
        progressPercent: 76,
        dataSourceHu: 'Budapest Zöldinfrastruktúra Stratégia 2023',
      },
      {
        id: 'zold-alkalmazkodas',
        nameHu: 'Klimaadaptációs tervek',
        currentValue: 8,
        targetValue: 23,
        unit: 'kerület rendelkezik tervvel',
        progressPercent: 35,
        dataSourceHu: 'Budapest Klímastratégia Megvalósítási Riport 2023',
      },
      {
        id: 'zold-biokoriodor',
        nameHu: 'Ökológiai folyosók',
        currentValue: 42,
        targetValue: 85,
        unit: 'km ökológiai folyosó',
        progressPercent: 49,
        dataSourceHu: 'DINP (Duna-Ipoly NP) Tájöko Felmérés 2022',
      },
    ],
  },
  {
    id: 'dinamikus',
    nameHu: 'Dinamikus Budapest',
    icon: '⚡',
    colorClass: 'text-amber-400',
    goals: [
      {
        id: 'din-gdp',
        nameHu: 'GDP növekedés',
        currentValue: 3.1,
        targetValue: 5.0,
        unit: '% éves növekedés',
        progressPercent: 62,
        dataSourceHu: 'KSH Regionális GDP 2023',
      },
      {
        id: 'din-zoldjob',
        nameHu: 'Zöldgazdasági munkahelyek',
        currentValue: 3.2,
        targetValue: 8.0,
        unit: '% munkaerőpiaci részesedés',
        progressPercent: 40,
        dataSourceHu: 'NKFI Hivatal, KSH 2023',
      },
      {
        id: 'din-startup',
        nameHu: 'Innovatív startupok',
        currentValue: 820,
        targetValue: 1500,
        unit: 'aktív innovátorstartup',
        progressPercent: 55,
        dataSourceHu: 'Startup Hungary Ökoszisztéma Riport 2023',
      },
    ],
  },
  {
    id: 'gondoskodo',
    nameHu: 'Gondoskodó Budapest',
    icon: '❤️',
    colorClass: 'text-rose-400',
    goals: [
      {
        id: 'gon-egeszseg',
        nameHu: 'Egészségügyi hozzáférés',
        currentValue: 74,
        targetValue: 95,
        unit: '% lefedettség (30 percen belül kórház)',
        progressPercent: 78,
        dataSourceHu: 'ÁNTSZ Egészségügyi Ellátottsági Térkép 2023',
      },
      {
        id: 'gon-tarsadalmi',
        nameHu: 'Társadalmi befogadás index',
        currentValue: 58,
        targetValue: 80,
        unit: 'pont /100',
        progressPercent: 73,
        dataSourceHu: 'TÁRKI Társadalmi Befogadás Monitor 2023',
      },
      {
        id: 'gon-lakas-megfizethetoseg',
        nameHu: 'Lakhatási megfizethetőség',
        currentValue: 28,
        targetValue: 50,
        unit: '% jövedelem alatt kiadás a lakásra (átlag)',
        progressPercent: 56,
        dataSourceHu: 'KSH Lakásstatisztika, MNB Lakáspiaci Riport 2023',
      },
    ],
  },
  {
    id: 'okos',
    nameHu: 'Okos Budapest',
    icon: '🔬',
    colorClass: 'text-violet-400',
    goals: [
      {
        id: 'okos-szolg',
        nameHu: 'Smart city szolgáltatások',
        currentValue: 38,
        targetValue: 70,
        unit: '% digitálisan elérhető önkormányzati szolgáltatás',
        progressPercent: 54,
        dataSourceHu: 'Budapest Smart City Stratégia Megvalósítási Riport 2023',
      },
      {
        id: 'okos-opendata',
        nameHu: 'Nyílt adatok indexe',
        currentValue: 62,
        targetValue: 90,
        unit: 'pont /100',
        progressPercent: 69,
        dataSourceHu: 'Kormányzati Open Data Monitor 2023',
      },
      {
        id: 'okos-digital',
        nameHu: 'Digitális részvétel',
        currentValue: 31,
        targetValue: 60,
        unit: '% aktív digitális közösségi részvétel',
        progressPercent: 52,
        dataSourceHu: 'Budapest Digitális Stratégia Monitoring 2023',
      },
    ],
  },
];

// ─── Normalization helper for radar chart (0–100 scale, 100 = best) ───────────

export function normalizeForRadar(indicator: BudapestIndicator, value: number): number {
  // For indicators where lower is better, we invert
  const lowerIsBetter = ['levego', 'zaj', 'hulladek', 'viz', 'co2', 'terulet'];
  // For indicators where higher is better
  const higherIsBetter = ['termeszet', 'okoinnovacio', 'kozlekedes', 'energia', 'iranyitas'];

  if (lowerIsBetter.includes(indicator.id)) {
    // normalize: 100 means value equals threshold (best), 0 means 2x threshold
    const ratio = Math.min(value, indicator.euThreshold * 2) / (indicator.euThreshold * 2);
    return Math.round((1 - ratio) * 100);
  } else {
    // higher is better: 100 means reached target, 0 means 0
    const target = Math.max(indicator.euThreshold, indicator.target2030);
    return Math.min(100, Math.round((value / target) * 100));
  }
}

// ─── All 5 EU comparison cities ───────────────────────────────────────────────

export const EU_COMPARISON_CITIES = [
  { id: 'Budapest', color: '#6366f1', label: 'Budapest' },
  { id: 'Bécs',     color: '#22c55e', label: 'Bécs' },
  { id: 'Prága',    color: '#eab308', label: 'Prága' },
  { id: 'Varsó',    color: '#f97316', label: 'Varsó' },
  { id: 'Pozsony',  color: '#a855f7', label: 'Pozsony' },
];
