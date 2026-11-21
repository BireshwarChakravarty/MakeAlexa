'use strict';

// Camera card and now-playing card.
const config = require('../config');
const ha = require('./homeassistant');

const demoMedia = { playing: true };

function buildCamera(states, demo) {
  const { label = 'Camera', hlsUrl = '', haEntity = '' } = config.camera || {};
  if (hlsUrl) return { mode: 'video', url: hlsUrl, label, hint: '' };

  if (haEntity && !demo) {
    const entity = states && states[haEntity];
    const token = entity && entity.attributes && entity.attributes.access_token;
    if (token) {
      // Snapshot via Home Assistant's camera proxy. The token rotates every
      // few minutes, so each refresh gets a fresh URL and a fresh picture.
      const url = ha.absoluteUrl(`/api/camera_proxy/${haEntity}?token=${encodeURIComponent(token)}`);
      return { mode: 'image', url, label, hint: '' };
    }
    return { mode: 'none', url: '', label, hint: 'Camera unavailable' };
  }
  return { mode: 'none', url: '', label, hint: 'Add a camera in config.js' };
}

function buildMedia(states, demo) {
  const entityId = (config.mediaPlayer || {}).haEntity;
  if (demo) {
    return {
      enabled: true,
      title: 'Sample track',
      subtitle: 'Connect a media player in config.js',
      art: '',
      playing: demoMedia.playing,
      interactive: true,
    };
  }
  if (!entityId) return { enabled: false, title: '', subtitle: '', art: '', playing: false, interactive: false };

  const entity = states && states[entityId];
  if (!entity || entity.state === 'unavailable') {
    return { enabled: true, title: 'Media player unavailable', subtitle: '', art: '', playing: false, interactive: false };
  }
  const a = entity.attributes || {};
  const active = entity.state === 'playing' || entity.state === 'paused';
  return {
    enabled: true,
    title: active ? a.media_title || 'Playing' : 'Nothing playing',
    subtitle: active ? a.media_artist || a.media_album_name || a.friendly_name || '' : a.friendly_name || '',
    art: active && a.entity_picture ? ha.absoluteUrl(a.entity_picture) : '',
    playing: entity.state === 'playing',
    interactive: active,
  };
}

async function performMediaAction(action) {
  if (action !== 'play_pause') return;
  if (!ha.enabled()) {
    demoMedia.playing = !demoMedia.playing;
    return;
  }
  const entityId = (config.mediaPlayer || {}).haEntity;
  if (!entityId) return;
  await ha.callService('media_player', 'media_play_pause', { entity_id: entityId });
}

module.exports = { buildCamera, buildMedia, performMediaAction };
