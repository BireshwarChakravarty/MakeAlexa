# MakeAlexa: a custom dashboard for Echo Show 11

A fast, custom touch dashboard for your Echo Show 11, built only with Amazon-supported
tools. There's no rooting and no bootloader unlocking, and your warranty stays intact.

It's a private Alexa skill that draws its screen with
**[APL (Alexa Presentation Language)](https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/understand-apl.html)**,
Amazon's own UI framework for Echo Show displays. Say *"Alexa, open my dashboard"* and you get:

| Panel | What it shows | Data source |
|------|---------------|-------------|
| **Clock and date** | Large clock that the Echo keeps current; tap it to refresh | The Echo itself |
| **Weather** | Current temperature, conditions, today's high and low | [Open-Meteo](https://open-meteo.com) (free, no key) |
| **Smart home tiles** | Tap to toggle lights, plugs and fans, or run scenes; sensor readouts | [Home Assistant](https://www.home-assistant.io) |
| **Camera** | Live HLS video, or a snapshot that updates every refresh | HLS link or Home Assistant |
| **Now playing** | Track, artist, cover art, Play/Pause | Home Assistant |
| **Agenda** | Upcoming events for the next few days | Home Assistant calendar or any iCal link |

Every panel shows **sample data until you configure it**, so the dashboard works on your
Echo right away.

## Get started

Follow **[docs/deployment.md](docs/deployment.md)**. It takes about 15 minutes and needs a
free Amazon Developer account. The skill is Alexa-hosted, so you don't need AWS.

All personal settings live in one file: **[`lambda/config.js`](lambda/config.js)**.

## Limits worth knowing

- **It doesn't replace the home screen.** You open it by voice or with a routine, and it
  refreshes itself while it's showing. The Echo can still return to its own home screen
  after a while. No supported method can permanently replace the launcher.
- **Tiles go through Home Assistant**, not the Alexa app. Amazon doesn't let custom skills
  control devices you set up in the Alexa app.
- **Home Assistant must be reachable from the internet** (for example through Nabu Casa),
  because the skill runs in Amazon's cloud.

### Why not jailbreak it?

The community firmware projects (LineageOS, techo5) only support **2019–2021 Echo Show
models** through a MediaTek bootloader exploit. Nothing exists for the 2025 Echo Show 11,
and trying an unsupported exploit risks a permanently bricked device.

## Project layout

```
MakeAlexa/
├── skill-package/
│   ├── skill.json                     # Skill manifest (APL screen interface enabled)
│   └── interactionModels/custom/
│       └── en-US.json                 # Voice commands
├── lambda/                            # Skill code (Node.js), deployed to Alexa-hosted
│   ├── config.js                      # ← your settings
│   ├── index.js                       # Request and touch-event handlers
│   ├── apl/
│   │   ├── dashboard.json             # The screen layout (APL document)
│   │   └── datasource.js              # Collects all data for the screen
│   └── lib/                           # Weather, calendar, tiles, media, Home Assistant, time
├── docs/
│   ├── deployment.md                  # Step-by-step setup
│   └── apl-preview-data.json          # Sample data for the console's APL preview
├── scripts/preview-data.js            # Regenerates the preview data from config.js
└── tests/skill.test.js                # Offline tests (demo mode)
```

## Development

```bash
npm install                            # also installs lambda/ dependencies
npm test                               # runs the offline test suite
npm run preview-data -- America/New_York
```
