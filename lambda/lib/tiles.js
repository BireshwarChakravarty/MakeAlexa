'use strict';

// Smart home tiles: turns Home Assistant entity states into tile view models,
// and carries out taps. Without Home Assistant, tiles run on in-memory demo state.
const config = require('../config');
const ha = require('./homeassistant');

const demoStates = new Map();

function demoEntityState(tile, index) {
  const f = config.units === 'fahrenheit';
  const domain = tile.entity.split('.')[0];
  if (tile.type === 'toggle') {
    const on = index === 0;
    return { state: on ? 'on' : 'off', attributes: on && domain === 'light' ? { brightness: 178 } : {} };
  }
  if (tile.type === 'scene') return { state: 'scening', attributes: {} };
  if (domain === 'climate') return { state: 'heat', attributes: { current_temperature: f ? 70 : 21, hvac_action: 'heating' } };
  return { state: f ? '54' : '12', attributes: { unit_of_measurement: f ? '°F' : '°C' } };
}

function getDemoState(tile, index) {
  if (!demoStates.has(tile.entity)) demoStates.set(tile.entity, demoEntityState(tile, index));
  return demoStates.get(tile.entity);
}

function capitalize(text) {
  const s = String(text).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function roundTemp(value) {
  return Math.round(Number(value) * 10) / 10;
}

function onStatus(attributes) {
  if (attributes.brightness != null) return `On · ${Math.round((attributes.brightness / 255) * 100)}%`;
  if (attributes.percentage != null) return `On · ${attributes.percentage}%`;
  return 'On';
}

function sensorStatus(entity) {
  const a = entity.attributes || {};
  if (a.current_temperature != null) return `${roundTemp(a.current_temperature)}° · ${capitalize(a.hvac_action || entity.state)}`;
  const unit = a.unit_of_measurement;
  if (!unit) return capitalize(entity.state);
  return `${entity.state}${unit.startsWith('°') ? unit : ` ${unit}`}`;
}

function toViewModel(tile, entity, offline) {
  const base = { id: tile.entity, name: tile.name, kind: tile.type, on: false, interactive: false };
  if (offline) return { ...base, status: 'Offline' };
  if (!entity) return { ...base, status: 'Not found' };
  if (entity.state === 'unavailable' || entity.state === 'unknown') return { ...base, status: 'Unavailable' };

  if (tile.type === 'toggle') {
    const on = ['on', 'open', 'playing', 'home'].includes(entity.state);
    return { ...base, on, status: on ? onStatus(entity.attributes || {}) : 'Off', interactive: true };
  }
  if (tile.type === 'scene') return { ...base, status: 'Tap to run', interactive: true };
  return { ...base, status: sensorStatus(entity) };
}

// states: map of entity_id -> state (Home Assistant), or null if unreachable.
function buildTiles(states, demo) {
  return (config.tiles || []).map((tile, i) => {
    if (demo) return toViewModel(tile, getDemoState(tile, i), false);
    return toViewModel(tile, states && states[tile.entity], !states);
  });
}

// Only entities listed in config.tiles can be acted on: a tap can never reach
// an arbitrary Home Assistant entity.
async function performTileAction(entityId) {
  const index = (config.tiles || []).findIndex((t) => t.entity === entityId);
  const tile = config.tiles[index];
  if (!tile || tile.type === 'sensor') return null;

  if (!ha.enabled()) {
    if (tile.type === 'toggle') {
      const s = getDemoState(tile, index);
      s.state = s.state === 'on' ? 'off' : 'on';
    }
    return tile;
  }

  try {
    if (tile.type === 'toggle') {
      await ha.callService('homeassistant', 'toggle', { entity_id: entityId });
    } else {
      const domain = entityId.split('.')[0] === 'script' ? 'script' : 'scene';
      await ha.callService(domain, 'turn_on', { entity_id: entityId });
    }
  } catch (e) {
    e.tileName = tile.name;
    throw e;
  }
  return tile;
}

module.exports = { buildTiles, performTileAction };
