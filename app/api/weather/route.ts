import { NextResponse } from 'next/server';

// Budapest, 1134 Gidófalvy Lajos utca 9 — AccuWeather uses city/neighborhood keys
// Location key discovered via: /locations/v1/cities/search?q=Budapest&language=hu
// Budapest city key on AccuWeather is 187423 (district-level keys fetched below)
const FALLBACK_LOCATION_KEY = '187423'; // Budapest, Hungary
const SEARCH_QUERY = '1134 Budapest';

const AW_BASE = 'https://dataservice.accuweather.com';

interface CacheEntry<T> { data: T; expires: number }
const locationCache: CacheEntry<string> | null = null;
let _locationCache: CacheEntry<string> | null = locationCache;
let _weatherCache: CacheEntry<WeatherResult> | null = null;

export interface DailyForecast {
  date: string;        // ISO date
  icon: number;
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
  icon: number;        // AccuWeather icon number 1-44
  isDay: boolean;
  wind: number;        // km/h
  humidity: number;
  forecast: DailyForecast[];
  fetchedAt: string;
}

async function fetchLocationKey(apiKey: string): Promise<string> {
  if (_locationCache && _locationCache.expires > Date.now()) {
    return _locationCache.data;
  }
  try {
    const res = await fetch(
      `${AW_BASE}/locations/v1/cities/search?apikey=${apiKey}&q=${encodeURIComponent(SEARCH_QUERY)}&language=hu&details=false`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) throw new Error(`Location search ${res.status}`);
    const data = await res.json();
    const key = Array.isArray(data) && data.length > 0 ? String(data[0].Key) : FALLBACK_LOCATION_KEY;
    _locationCache = { data: key, expires: Date.now() + 24 * 3600 * 1000 };
    return key;
  } catch {
    return FALLBACK_LOCATION_KEY;
  }
}

async function fetchWeather(apiKey: string): Promise<WeatherResult> {
  if (_weatherCache && _weatherCache.expires > Date.now()) {
    return _weatherCache.data;
  }

  const locationKey = await fetchLocationKey(apiKey);

  const [currentRes, forecastRes] = await Promise.all([
    fetch(`${AW_BASE}/currentconditions/v1/${locationKey}?apikey=${apiKey}&details=true&language=hu`,
      { next: { revalidate: 1800 } }),
    fetch(`${AW_BASE}/forecasts/v1/daily/5day/${locationKey}?apikey=${apiKey}&metric=true&language=hu`,
      { next: { revalidate: 10800 } }),
  ]);

  if (!currentRes.ok || !forecastRes.ok) {
    throw new Error(`AccuWeather API error: current=${currentRes.status} forecast=${forecastRes.status}`);
  }

  const [currentData, forecastData] = await Promise.all([currentRes.json(), forecastRes.json()]);
  const c = Array.isArray(currentData) ? currentData[0] : currentData;

  const forecast: DailyForecast[] = (forecastData.DailyForecasts ?? []).slice(1, 5).map((d: {
    Date: string;
    Day: { Icon: number; IconPhrase: string };
    Temperature: { Minimum: { Value: number }; Maximum: { Value: number } };
  }) => ({
    date: d.Date,
    icon: d.Day.Icon,
    iconPhrase: d.Day.IconPhrase,
    minTemp: Math.round(d.Temperature.Minimum.Value),
    maxTemp: Math.round(d.Temperature.Maximum.Value),
  }));

  const result: WeatherResult = {
    locationKey,
    locationName: 'Budapest, XIII. ker.',
    temp: Math.round(c.Temperature?.Metric?.Value ?? 0),
    feelsLike: Math.round(c.RealFeelTemperature?.Metric?.Value ?? 0),
    conditionText: c.WeatherText ?? '',
    icon: c.WeatherIcon ?? 1,
    isDay: Boolean(c.IsDayTime),
    wind: Math.round(c.Wind?.Speed?.Metric?.Value ?? 0),
    humidity: c.RelativeHumidity ?? 0,
    forecast,
    fetchedAt: new Date().toISOString(),
  };

  _weatherCache = { data: result, expires: Date.now() + 30 * 60 * 1000 };
  return result;
}

// Mock data for when ACCUWEATHER_API_KEY is not set
function getMockWeather(): WeatherResult {
  const h = new Date().getHours();
  const isDay = h >= 6 && h < 20;
  return {
    locationKey: FALLBACK_LOCATION_KEY,
    locationName: 'Budapest, XIII. ker.',
    temp: 18,
    feelsLike: 17,
    conditionText: 'Részben felhős',
    icon: 6,
    isDay,
    wind: 12,
    humidity: 65,
    forecast: [
      { date: new Date(Date.now() + 86400000).toISOString(), icon: 2, iconPhrase: 'Napos', minTemp: 14, maxTemp: 22 },
      { date: new Date(Date.now() + 172800000).toISOString(), icon: 12, iconPhrase: 'Záporos', minTemp: 12, maxTemp: 18 },
      { date: new Date(Date.now() + 259200000).toISOString(), icon: 15, iconPhrase: 'Zivataros', minTemp: 11, maxTemp: 16 },
      { date: new Date(Date.now() + 345600000).toISOString(), icon: 3, iconPhrase: 'Napos', minTemp: 15, maxTemp: 24 },
    ],
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const apiKey = process.env.ACCUWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ...getMockWeather(), _mock: true });
  }

  try {
    const weather = await fetchWeather(apiKey);
    return NextResponse.json(weather);
  } catch (err) {
    console.error('[weather] API error:', err);
    return NextResponse.json({ ...getMockWeather(), _mock: true, _error: String(err) });
  }
}
