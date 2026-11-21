'use strict';

// Thin wrapper around the Home Assistant REST API.
// https://developers.home-assistant.io/docs/api/rest/
const config = require('../config');
const { request, getJson } = require('./http');

function enabled() {
  const { url, token } = config.homeAssistant || {};
  return Boolean(url && token);
}

function baseUrl() {
  return config.homeAssistant.url.replace(/\/+$/, '');
}

function absoluteUrl(path) {
  if (/^https?:\/\//.test(path)) return path;
  return `${baseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;
}

function authHeaders() {
  return { Authorization: `Bearer ${config.homeAssistant.token}` };
}

// One call returns every entity, which covers tiles, camera and media.
async function getStates() {
  const list = await getJson(`${baseUrl()}/api/states`, { headers: authHeaders(), timeoutMs: 3000 });
  const byId = {};
  for (const entity of list) byId[entity.entity_id] = entity;
  return byId;
}

async function callService(domain, service, data) {
  await request(`${baseUrl()}/api/services/${domain}/${service}`, {
    method: 'POST',
    headers: authHeaders(),
    body: data,
    timeoutMs: 4000,
  });
}

async function getCalendarEvents(entityId, start, end) {
  const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
  return getJson(`${baseUrl()}/api/calendars/${encodeURIComponent(entityId)}?${params}`, {
    headers: authHeaders(),
    timeoutMs: 3000,
  });
}

module.exports = { enabled, absoluteUrl, getStates, callService, getCalendarEvents };
