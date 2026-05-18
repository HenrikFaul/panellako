import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// Open-Meteo — free, no API key needed, WMO weather codes
// Budapest, 1134 Gidófalvy Lajos utca 9
const LAT = 47.5116;
const LON = 19.0519;

const OM_BASE = 'https://api.open-meteo.com/v1/forecast';

interface CacheEntry<T> { data: T; expires: number }
let _weatherCache: CacheEntry<WeatherResult> | null = null;

export interface DailyForecast {
  date: string;       // ISO date YYYY-MM-DD
  icon: number;       // WMO weather code
  iconPhrase: string;
  minTemp: number;
  maxTemp: number;
}

export interface WeatherResult {
  locationKey: string;
  locationName: string;
  temp: number;
  feelsLike: number;
  conditionText: string;
  icon: number;       // WMO weather code 0-99
  isDay: boolean;
  wind: number;       // km/h
  humidity: number;
  forecast: DailyForecast[];
  fetchedAt: string;
}

// WMO code → Hungarian condition text
function wmoToText(code: number): string {
  if (code === 0)                  return 'Derült';
  if (code === 1)                  return 'Főleg derült';
  if (code === 2)                  return 'Részben felhős';
  if (code === 3)                  return 'Borult';
  if (code === 45 || code === 48)  return 'Köd';
  if (code === 51)                 return 'Gyenge szitálás';
  if (code === 53)                 return 'Mérsékelt szitálás';
  if (code === 55)                 return 'Sűrű szitálás';
  if (code === 56 || code === 57)  return 'Ónos szitálás';
  if (code === 61)                 return 'Gyenge eső';
  if (code === 63)                 return 'Mérsékelt eső';
  if (code === 65)                 return 'Erős eső';
  if (code === 66 || code === 67)  return 'Ónos eső';
  if (code === 71)                 return 'Gyenge havazás';
  if (code === 73)                 return 'Mérsékelt havazás';
  if (code === 75)                 return 'Erős havazás';
  if (code === 77)                 return 'Hóförgeteg';
  if (code === 80)                 return 'Záporok';
  if (code === 81)                 return 'Mérsékelt záporok';
  if (code === 82)                 return 'Erős záporok';
  if (code === 85 || code === 86)  return 'Hózáporok';
  if (code === 95)                 return 'Zivatar';
  if (code === 96 || code === 99)  return 'Zivatar jégesővel';
  return 'Változékony';
}

async function fetchWeather(): Promise<WeatherResult> {
  if (_weatherCache && _weatherCache.expires > Date.now()) {
    return _weatherCache.data;
  }

  const params = new URLSearchParams({
    latitude:  String(LAT),
    longitude: String(LON),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'weather_code',
      'wind_speed_10m',
      'relative_humidity_2m',
      'is_day',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
    ].join(','),
    timezone:        'Europe/Budapest',
    forecast_days:   '7',
    wind_speed_unit: 'kmh',
  });

  const res = await fetch(`${OM_BASE}?${params}`, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();

  const cur   = data.current;
  const daily = data.daily;

  // Skip index 0 (today's daily summary) → next 6 days for forecast
  const forecast: DailyForecast[] = [];
  for (let i = 1; i <= 6; i++) {
    if (!daily.time[i]) break;
    const code = daily.weather_code[i] as number;
    forecast.push({
      date:       daily.time[i],
      icon:       code,
      iconPhrase: wmoToText(code),
      minTemp:    Math.round(daily.temperature_2m_min[i]),
      maxTemp:    Math.round(daily.temperature_2m_max[i]),
    });
  }

  const result: WeatherResult = {
    locationKey:   `${LAT},${LON}`,
    locationName:  'Budapest, XIII. ker.',
    temp:          Math.round(cur.temperature_2m),
    feelsLike:     Math.round(cur.apparent_temperature),
    conditionText: wmoToText(cur.weather_code),
    icon:          cur.weather_code,
    isDay:         cur.is_day === 1,
    wind:          Math.round(cur.wind_speed_10m),
    humidity:      Math.round(cur.relative_humidity_2m),
    forecast,
    fetchedAt: new Date().toISOString(),
  };

  _weatherCache = { data: result, expires: Date.now() + 30 * 60 * 1000 };
  return result;
}

function getMockWeather(): WeatherResult {
  const h = new Date().getHours();
  const isDay = h >= 6 && h < 20;
  return {
    locationKey:   `${LAT},${LON}`,
    locationName:  'Budapest, XIII. ker.',
    temp:          18,
    feelsLike:     17,
    conditionText: 'Részben felhős',
    icon:          2,
    isDay,
    wind:          12,
    humidity:      65,
    forecast: [
      { date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),  icon: 0,  iconPhrase: 'Derült',        minTemp: 14, maxTemp: 22 },
      { date: new Date(Date.now() + 172800000).toISOString().slice(0, 10), icon: 63, iconPhrase: 'Mérsékelt eső', minTemp: 12, maxTemp: 18 },
      { date: new Date(Date.now() + 259200000).toISOString().slice(0, 10), icon: 95, iconPhrase: 'Zivatar',       minTemp: 11, maxTemp: 16 },
      { date: new Date(Date.now() + 345600000).toISOString().slice(0, 10), icon: 1,  iconPhrase: 'Főleg derült',  minTemp: 15, maxTemp: 24 },
      { date: new Date(Date.now() + 432000000).toISOString().slice(0, 10), icon: 2,  iconPhrase: 'Részben felhős',minTemp: 13, maxTemp: 21 },
      { date: new Date(Date.now() + 518400000).toISOString().slice(0, 10), icon: 3,  iconPhrase: 'Borult',        minTemp: 11, maxTemp: 17 },
    ],
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const weather = await fetchWeather();
    return NextResponse.json(weather);
  } catch (err) {
    console.error('[weather] Open-Meteo error:', err);
    return NextResponse.json({ ...getMockWeather(), _mock: true, _error: String(err) });
  }
}
