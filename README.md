# MakeAlexa — Custom APL Dashboard for Echo Show 11

A **safe, 100% Amazon-supported** way to give your Echo Show 11 a fast, custom-built
dashboard — no rooting, no bootloader unlocking, no voided warranty.

It uses **APL (Alexa Presentation Language)**, Amazon's own UI framework for Echo Show
displays, delivered through a custom Alexa Skill. You say *"Alexa, open my dashboard"*
(or set it as a routine), and the Echo Show renders a touch-responsive screen you fully
control.

## What it gives you

| Area | What you get |
|------|--------------|
| 🕐 **Header** | Big clock, date, and current weather (icon + temp) |
| 💡 **Smart home** | Touch tiles for lights, plugs, thermostat, scenes — tap to toggle |
| 📅 **Agenda** | Upcoming calendar events in a scrollable strip |
| 📹 **Media / Cameras** | A video card for a camera stream (HLS) or now-playing art |

Everything is a native APL layout, so it renders at full speed on the device — far
snappier than trying to run a third-party launcher.

## Why this route (and not jailbreaking)

The Echo Show 11 (2025) is a brand-new device. The community rooting/LineageOS projects
only target **old 2019–2021 hardware** via the `amonet` MediaTek exploit, and newer units
ship with firmware too new to unlock. Attempting it risks a **permanent, unrecoverable
brick**. APL is the officially sanctioned path to a custom on-screen experience and works
on current firmware today.

## Project layout

```
MakeAlexa/
├── skill-package/                 # Skill definition (deployed as-is by ASK CLI)
│   ├── skill.json                 # Skill manifest
│   └── interactionModels/
│       └── custom/en-US.json      # Voice interaction model
├── lambda/                        # Skill backend (AWS Lambda / Node.js)
│   ├── index.js                   # Request handlers + APL directives
│   ├── package.json
│   └── apl/
│       ├── dashboard.json         # The APL document (the actual UI)
│       └── datasource.js          # Builds live data (time, weather, devices…)
├── ask-resources.json             # ASK CLI project config
├── docs/
│   └── deployment.md              # Step-by-step deploy guide
└── README.md
```

## Quick start

You need an [Amazon Developer account](https://developer.amazon.com) (free) and the
[ASK CLI](https://developer.amazon.com/en-US/docs/alexa/smapi/quick-start-alexa-skills-kit-command-line-interface.html).

```bash
npm install -g ask-cli
ask configure
cd lambda && npm install && cd ..
ask deploy
```

Then on your Echo Show 11 (signed into the same Amazon account), say:

> "Alexa, open my dashboard"

Full details, including how to wire up real smart-home devices and a camera feed, are in
[`docs/deployment.md`](docs/deployment.md).

## Status

This is a working **v1 scaffold**: the dashboard renders with sample data and touch tiles
report their taps to the backend. Wiring tiles to *real* device actions (via the Alexa
Smart Home API or your own Home Assistant endpoint) is documented as the next step in the
deployment guide — tell the assistant which devices you have and it can fill that in.
