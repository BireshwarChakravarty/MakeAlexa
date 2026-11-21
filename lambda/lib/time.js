'use strict';

const Alexa = require('ask-sdk-core');
const config = require('../config');

const timeZoneCache = new Map();

function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(0);
    return true;
  } catch (e) {
    return false;
  }
}

// Reads the Echo's own time zone (no extra permission needed), falling back
// to config.defaultTimeZone.
async function getTimeZone(handlerInput) {
  const envelope = handlerInput.requestEnvelope;
  const deviceId = Alexa.getDeviceId(envelope);
  if (deviceId && timeZoneCache.has(deviceId)) return timeZoneCache.get(deviceId);

  const fallback = isValidTimeZone(config.defaultTimeZone) ? config.defaultTimeZone : 'UTC';
  const hasToken = Boolean(envelope.context && envelope.context.System && envelope.context.System.apiAccessToken);
  if (!deviceId || !hasToken || !handlerInput.serviceClientFactory) return fallback;

  try {
    const timeZone = await handlerInput.serviceClientFactory.getUpsServiceClient().getSystemTimeZone(deviceId);
    if (timeZone && isValidTimeZone(timeZone)) {
      timeZoneCache.set(deviceId, timeZone);
      return timeZone;
    }
  } catch (e) {
    console.warn('Could not read device time zone:', e.message);
  }
  return fallback;
}

function zonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = {};
  for (const { type, value } of formatter.formatToParts(date)) parts[type] = value;
  return parts;
}

// Offset of `timeZone` from UTC at instant `ms`, in milliseconds.
function timeZoneOffsetMs(ms, timeZone) {
  const p = zonedParts(new Date(ms), timeZone);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

// Converts a wall-clock time in `timeZone` to a Date.
function zonedTimeToDate({ year, month, day, hour = 0, minute = 0, second = 0 }, timeZone) {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset = timeZoneOffsetMs(guess, timeZone);
  let result = guess - offset;
  const corrected = timeZoneOffsetMs(result, timeZone);
  if (corrected !== offset) result = guess - corrected; // daylight-saving boundary
  return new Date(result);
}

// 'YYYY-MM-DD' of `date` as seen in `timeZone`.
function dateKey(date, timeZone) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

function addDaysToKey(key, days) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayLabel(key, todayKey) {
  if (key === todayKey) return 'Today';
  if (key === addDaysToKey(todayKey, 1)) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short' }).format(new Date(`${key}T12:00:00Z`));
}

function formatTime(date, timeZone, use24h = config.clock24h) {
  const options = { timeZone, hour: 'numeric', minute: '2-digit' };
  if (use24h) options.hourCycle = 'h23';
  else options.hour12 = true;
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

module.exports = {
  getTimeZone,
  isValidTimeZone,
  zonedTimeToDate,
  dateKey,
  addDaysToKey,
  dayLabel,
  formatTime,
};
