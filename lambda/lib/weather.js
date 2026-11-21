'use strict';

// Current weather from Open-Meteo: free, no API key. https://open-meteo.com
const config = require('../config');
const { getJson } = require('./http');

// WMO weather interpretation codes used by Open-Meteo.
const CONDITIONS = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Heavy showers',
  85: 'Snow showers',
  86: 'Snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm, hail',
  99: 'Thunderstorm, hail',
};

function describe(code) {
  return CONDITIONS[code] || 'Weather';
}

function sampleWeather() {
  const f = config.units === 'fahrenheit';
  return { temp: f ? 64 : 18, condition: 'Partly cloudy', high: f ? 70 : 21, low: f ? 52 : 11, place: 'Sample weather', sample: true };
}

async function getWeather() {
  const { latitude, longitude, name } = config.location || {};
  if (latitude == null || longitude == null) return sampleWeather();

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min',
    forecast_days: '1',
    timezone: 'auto',
  });
  if (config.units === 'fahrenheit') params.set('temperature_unit', 'fahrenheit');

  const data = await getJson(`https://api.open-meteo.com/v1/forecast?${params}`, { timeoutMs: 2500 });
  return {
    temp: Math.round(data.current.temperature_2m),
    condition: describe(data.current.weather_code),
    high: Math.round(data.daily.temperature_2m_max[0]),
    low: Math.round(data.daily.temperature_2m_min[0]),
    place: name || '',
    sample: false,
  };
}

module.exports = { getWeather, describe };
