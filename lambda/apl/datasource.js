'use strict';

// Gathers everything the dashboard shows into one APL datasource.
const config = require('../config');
const ha = require('../lib/homeassistant');
const { getWeather } = require('../lib/weather');
const { getAgenda } = require('../lib/calendar');
const { buildTiles } = require('../lib/tiles');
const { buildCamera, buildMedia } = require('../lib/media');
const { formatTime } = require('../lib/time');

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function weatherView(weather) {
  if (!weather) return { temp: '--', condition: 'Weather unavailable', details: '' };
  const details = [`H ${weather.high}°  L ${weather.low}°`, weather.place].filter(Boolean).join('  ·  ');
  return { temp: String(weather.temp), condition: weather.condition, details };
}

async function buildDashboardData({ timeZone, now = new Date() }) {
  const problems = [];
  const demo = !ha.enabled();

  // Fetch in parallel. Alexa waits about 8 seconds for a response, and each
  // source has its own short timeout, so one slow source can't stall the screen.
  const [states, weather, agenda] = await Promise.all([
    demo
      ? null
      : ha.getStates().catch((e) => {
          console.error('Home Assistant error:', e.message);
          problems.push("Can't reach Home Assistant");
          return null;
        }),
    getWeather().catch((e) => {
      console.error('Weather error:', e.message);
      problems.push('Weather unavailable');
      return null;
    }),
    getAgenda(timeZone, now).catch((e) => {
      console.error('Calendar error:', e.message);
      problems.push('Calendar unavailable');
      return { sample: false, items: [] };
    }),
  ]);

  const samples = [];
  if (demo) samples.push('devices');
  if (weather && weather.sample) samples.push('weather');
  if (agenda.sample) samples.push('calendar');

  const footer = [
    config.title,
    `Updated ${formatTime(now, timeZone)}`,
    samples.length ? `Sample ${samples.join(', ')}: edit config.js` : '',
    ...problems,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return {
    clockFormat: config.clock24h ? 'HH:mm' : 'h:mm',
    showAmPm: !config.clock24h,
    weekdays: WEEKDAYS,
    months: MONTHS,
    weather: weatherView(weather),
    tiles: buildTiles(states, demo),
    agenda: agenda.items,
    camera: buildCamera(states, demo),
    media: buildMedia(states, demo),
    footer,
    refreshMs: Math.max(1, Number(config.refreshMinutes) || 15) * 60000,
  };
}

module.exports = { buildDashboardData };
