/**
 * Dashboard settings. This is the only file you need to edit.
 *
 * Anything left empty falls back to sample data, so the dashboard works
 * out of the box ("demo mode"). Fill sections in one at a time.
 *
 * IMPORTANT: if you put a Home Assistant token here, edit this file in the
 * Alexa developer console's Code tab, not in a public Git repository.
 */
module.exports = {
  // Shown in the footer.
  title: 'Home',

  // 'celsius' or 'fahrenheit'
  units: 'celsius',

  // true = 14:05, false = 2:05 PM
  clock24h: false,

  // Used for weather. Find yours at https://www.latlong.net
  // Leave latitude/longitude as null to show sample weather.
  location: {
    name: '',
    latitude: null,
    longitude: null,
  },

  // Used when the Echo's own time zone can't be read.
  defaultTimeZone: 'UTC',

  // How often the screen refreshes its data while it is showing.
  refreshMinutes: 15,

  // Home Assistant connection. Must be reachable from the internet
  // (for example your Nabu Casa remote URL, or a reverse proxy).
  // Create the token in Home Assistant: Profile > Security > Long-lived access tokens.
  homeAssistant: {
    url: '', // e.g. 'https://abc123.ui.nabu.casa'
    token: '',
  },

  // Smart home tiles, in display order.
  //   type 'toggle' : lights, switches, fans, plugs (tap = toggle)
  //   type 'scene'  : scenes and scripts (tap = run)
  //   type 'sensor' : read-only value, e.g. a thermostat or temperature sensor
  // 'entity' is the Home Assistant entity id. Ignored in demo mode.
  tiles: [
    { name: 'Living Room', entity: 'light.living_room', type: 'toggle' },
    { name: 'Kitchen', entity: 'light.kitchen', type: 'toggle' },
    { name: 'Bedroom', entity: 'light.bedroom', type: 'toggle' },
    { name: 'Fan', entity: 'fan.bedroom', type: 'toggle' },
    { name: 'Movie Time', entity: 'scene.movie_time', type: 'scene' },
    { name: 'Good Night', entity: 'script.good_night', type: 'scene' },
    { name: 'Thermostat', entity: 'climate.home', type: 'sensor' },
    { name: 'Outside', entity: 'sensor.outdoor_temperature', type: 'sensor' },
  ],

  // Calendar agenda. Uses Home Assistant calendar entities if listed,
  // otherwise an iCal link (Google Calendar: Settings > your calendar >
  // "Secret address in iCal format"). Recurring events are only expanded
  // when using Home Assistant.
  calendar: {
    haEntities: [], // e.g. ['calendar.family']
    icsUrl: '',
    days: 3,
    maxEvents: 6,
  },

  // Camera card. An HLS stream (.m3u8) plays as live video. Otherwise a
  // Home Assistant camera entity shows a snapshot that updates on refresh.
  camera: {
    label: 'Front Door',
    hlsUrl: '',
    haEntity: '', // e.g. 'camera.front_door'
  },

  // Now-playing card for a Home Assistant media player.
  mediaPlayer: {
    haEntity: '', // e.g. 'media_player.living_room_speaker'
  },
};
