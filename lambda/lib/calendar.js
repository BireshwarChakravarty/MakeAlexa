'use strict';

// Agenda from Home Assistant calendars or an iCal (.ics) link.
const config = require('../config');
const ha = require('./homeassistant');
const { request } = require('./http');
const t = require('./time');

// ---------- iCal parsing ----------

function unescapeIcsText(value) {
  return value.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
}

function parseIcsDate(value, params, fallbackTimeZone) {
  const isDateOnly = /VALUE=DATE(?!-)/i.test(params) || /^\d{8}$/.test(value);
  if (isDateOnly) {
    return { allDay: true, key: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` };
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!m) return null;
  const fields = { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5], second: +m[6] };
  if (m[7] === 'Z') {
    return { allDay: false, date: new Date(Date.UTC(fields.year, fields.month - 1, fields.day, fields.hour, fields.minute, fields.second)) };
  }
  const tzMatch = /TZID=("?)([^";:]+)\1/i.exec(params);
  const timeZone = tzMatch && t.isValidTimeZone(tzMatch[2]) ? tzMatch[2] : fallbackTimeZone;
  return { allDay: false, date: t.zonedTimeToDate(fields, timeZone) };
}

// Returns normalized events: { title, allDay, start: Date } or { title, allDay, key, endKey }.
// Recurring events (RRULE) only contribute their first occurrence.
function parseIcs(text, fallbackTimeZone) {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current && current.start && !current.cancelled) {
        const title = current.title || '(No title)';
        if (current.start.allDay) {
          const endKey = current.end && current.end.allDay ? current.end.key : t.addDaysToKey(current.start.key, 1);
          events.push({ title, allDay: true, key: current.start.key, endKey });
        } else {
          events.push({ title, allDay: false, start: current.start.date });
        }
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const semicolon = head.indexOf(';');
    const name = (semicolon < 0 ? head : head.slice(0, semicolon)).toUpperCase();
    const params = semicolon < 0 ? '' : head.slice(semicolon + 1);

    if (name === 'SUMMARY') current.title = unescapeIcsText(value);
    else if (name === 'DTSTART') current.start = parseIcsDate(value, params, fallbackTimeZone);
    else if (name === 'DTEND') current.end = parseIcsDate(value, params, fallbackTimeZone);
    else if (name === 'STATUS' && value.toUpperCase() === 'CANCELLED') current.cancelled = true;
  }
  return events;
}

// ---------- Home Assistant ----------

function fromHaEvent(event) {
  const title = event.summary || '(No title)';
  if (event.start && event.start.date) {
    const endKey = event.end && event.end.date ? event.end.date : t.addDaysToKey(event.start.date, 1);
    return { title, allDay: true, key: event.start.date, endKey };
  }
  const start = new Date(event.start && event.start.dateTime);
  return Number.isNaN(start.getTime()) ? null : { title, allDay: false, start };
}

async function fromHomeAssistant(entities, now, days) {
  const end = new Date(now.getTime() + days * 86400000);
  const results = await Promise.allSettled(entities.map((id) => ha.getCalendarEvents(id, now, end)));
  const ok = results.filter((r) => r.status === 'fulfilled');
  if (!ok.length) throw results[0].reason;
  return ok.flatMap((r) => r.value).map(fromHaEvent).filter(Boolean);
}

// ---------- Sample data ----------

function sampleEvents(now) {
  const hour = 3600000;
  const roundedHour = Math.ceil(now.getTime() / hour) * hour;
  const todayKey = now.toISOString().slice(0, 10);
  return [
    { title: 'Team call', allDay: false, start: new Date(roundedHour + hour) },
    { title: 'Gym', allDay: false, start: new Date(roundedHour + 4 * hour) },
    { title: 'Recycling day', allDay: true, key: t.addDaysToKey(todayKey, 1), endKey: t.addDaysToKey(todayKey, 2) },
    { title: 'Dinner with friends', allDay: false, start: new Date(roundedHour + 28 * hour) },
  ];
}

// ---------- Agenda ----------

function toAgendaItems(events, timeZone, now, days, maxEvents) {
  const todayKey = t.dateKey(now, timeZone);
  const lastKey = t.addDaysToKey(todayKey, days - 1);
  const recentCutoff = now.getTime() - 30 * 60000; // keep events that just started

  return events
    .map((e) => {
      if (e.allDay) {
        if (e.endKey <= todayKey || e.key > lastKey) return null;
        const key = e.key < todayKey ? todayKey : e.key;
        return { title: e.title, key, sort: `${key} 0`, time: 'All day' };
      }
      if (e.start.getTime() < recentCutoff) return null;
      const key = t.dateKey(e.start, timeZone);
      if (key > lastKey) return null;
      return { title: e.title, key, sort: `${key} 1 ${e.start.toISOString()}`, time: t.formatTime(e.start, timeZone) };
    })
    .filter(Boolean)
    .sort((a, b) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0))
    .slice(0, maxEvents)
    .map((e) => ({ day: t.dayLabel(e.key, todayKey), time: e.time, title: e.title }));
}

async function getAgenda(timeZone, now = new Date()) {
  const { haEntities = [], icsUrl = '', days = 3, maxEvents = 6 } = config.calendar || {};
  let events;
  let sample = false;

  if (haEntities.length && ha.enabled()) {
    events = await fromHomeAssistant(haEntities, now, days);
  } else if (icsUrl) {
    events = parseIcs(await request(icsUrl, { timeoutMs: 3000 }), timeZone);
  } else {
    events = sampleEvents(now);
    sample = true;
  }
  return { sample, items: toAgendaItems(events, timeZone, now, days, maxEvents) };
}

module.exports = { getAgenda, parseIcs, toAgendaItems };
