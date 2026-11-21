'use strict';

// Run with: node --test tests/
// Exercises the skill offline in demo mode (no Home Assistant, no location set).
const test = require('node:test');
const assert = require('node:assert');
const { buildSkill } = require('../lambda/index');
const { parseIcs, toAgendaItems } = require('../lambda/lib/calendar');
const { zonedTimeToDate, dateKey } = require('../lambda/lib/time');

function envelope(request, { apl = true } = {}) {
  return {
    version: '1.0',
    session: {
      new: request.type === 'LaunchRequest',
      sessionId: 'session-1',
      application: { applicationId: 'amzn1.ask.skill.test' },
      user: { userId: 'user-1' },
    },
    context: {
      System: {
        application: { applicationId: 'amzn1.ask.skill.test' },
        user: { userId: 'user-1' },
        device: {
          deviceId: 'device-1',
          supportedInterfaces: apl ? { 'Alexa.Presentation.APL': { runtime: { maxVersion: '2023.3' } } } : {},
        },
        apiEndpoint: 'https://api.amazonalexa.com',
      },
    },
    request: { requestId: 'req-1', timestamp: new Date().toISOString(), locale: 'en-US', ...request },
  };
}

const skill = buildSkill().create();
const invoke = (request, opts) => skill.invoke(envelope(request, opts));

function renderDirective(res) {
  return (res.response.directives || []).find((d) => d.type === 'Alexa.Presentation.APL.RenderDocument');
}

test('launch renders the dashboard with demo data', async () => {
  const res = await invoke({ type: 'LaunchRequest' });
  const directive = renderDirective(res);
  assert.ok(directive, 'expected a RenderDocument directive');
  assert.strictEqual(directive.document.type, 'APL');
  assert.strictEqual(res.response.shouldEndSession, undefined, 'screen should stay up');

  const d = directive.datasources.dashboard;
  assert.strictEqual(d.tiles.length, 8);
  assert.deepStrictEqual(
    d.tiles.map((t) => t.kind),
    ['toggle', 'toggle', 'toggle', 'toggle', 'scene', 'scene', 'sensor', 'sensor']
  );
  assert.strictEqual(d.tiles[0].status, 'On · 70%');
  assert.strictEqual(d.weather.condition, 'Partly cloudy');
  assert.ok(d.agenda.length > 0, 'sample agenda should have events');
  assert.strictEqual(d.camera.mode, 'none');
  assert.strictEqual(d.media.enabled, true);
  assert.match(d.footer, /Sample devices, weather, calendar/);
});

test('devices without a screen get a spoken explanation', async () => {
  const res = await invoke({ type: 'LaunchRequest' }, { apl: false });
  assert.ok(!renderDirective(res));
  assert.match(res.response.outputSpeech.ssml, /needs a device with a screen/);
  assert.strictEqual(res.response.shouldEndSession, true);
});

test('tapping a toggle tile flips its state without redrawing', async () => {
  const tap = await invoke({ type: 'Alexa.Presentation.APL.UserEvent', arguments: ['tile', 'light.kitchen'] });
  assert.ok(!renderDirective(tap), 'toggle should update optimistically on screen');

  const res = await invoke({ type: 'Alexa.Presentation.APL.UserEvent', arguments: ['refresh'] });
  const kitchen = renderDirective(res).datasources.dashboard.tiles.find((t) => t.id === 'light.kitchen');
  assert.strictEqual(kitchen.on, true);
});

test('tapping a scene redraws, and unknown entities are ignored', async () => {
  const scene = await invoke({ type: 'Alexa.Presentation.APL.UserEvent', arguments: ['tile', 'scene.movie_time'] });
  assert.ok(renderDirective(scene));

  const unknown = await invoke({ type: 'Alexa.Presentation.APL.UserEvent', arguments: ['tile', 'lock.front_door'] });
  assert.ok(!renderDirective(unknown));
  assert.ok(!unknown.response.outputSpeech);
});

test('stop closes the skill', async () => {
  const res = await invoke({ type: 'IntentRequest', intent: { name: 'AMAZON.StopIntent', confirmationStatus: 'NONE' } });
  assert.strictEqual(res.response.shouldEndSession, true);
});

test('time zone conversion handles daylight saving', () => {
  // 2026-07-01 09:00 in New York is UTC-4; 2026-12-01 09:00 is UTC-5.
  const summer = zonedTimeToDate({ year: 2026, month: 7, day: 1, hour: 9 }, 'America/New_York');
  const winter = zonedTimeToDate({ year: 2026, month: 12, day: 1, hour: 9 }, 'America/New_York');
  assert.strictEqual(summer.toISOString(), '2026-07-01T13:00:00.000Z');
  assert.strictEqual(winter.toISOString(), '2026-12-01T14:00:00.000Z');
  assert.strictEqual(dateKey(new Date('2026-11-21T03:00:00Z'), 'America/Los_Angeles'), '2026-11-20');
});

test('iCal parsing and agenda building', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'SUMMARY:Dentist\\, checkup',
    'DTSTART;TZID=America/New_York:20261121T150000',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:Long event title that',
    '  wraps onto a folded line',
    'DTSTART:20261122T010000Z',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:Holiday',
    'DTSTART;VALUE=DATE:20261121',
    'DTEND;VALUE=DATE:20261123',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:Cancelled thing',
    'STATUS:CANCELLED',
    'DTSTART:20261121T170000Z',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:Already over',
    'DTSTART:20261121T100000Z',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const events = parseIcs(ics, 'America/New_York');
  assert.strictEqual(events.length, 4, 'cancelled event dropped');
  assert.strictEqual(events[0].title, 'Dentist, checkup');
  assert.strictEqual(events[0].start.toISOString(), '2026-11-21T20:00:00.000Z');
  assert.strictEqual(events[1].title, 'Long event title that wraps onto a folded line');

  const now = new Date('2026-11-21T17:00:00Z'); // noon in New York
  const items = toAgendaItems(events, 'America/New_York', now, 3, 10);
  assert.deepStrictEqual(items, [
    { day: 'Today', time: 'All day', title: 'Holiday' },
    { day: 'Today', time: '3:00 PM', title: 'Dentist, checkup' },
    { day: 'Today', time: '8:00 PM', title: 'Long event title that wraps onto a folded line' },
  ]);
});
