# Deploying the dashboard to your Echo Show 11

This takes about 15 minutes. You need:

- A free **Amazon Developer account** at https://developer.amazon.com. Sign in with the
  **same Amazon account your Echo Show uses**, so the skill shows up on your device
  automatically.
- Nothing else. The skill is **Alexa-hosted**, so Amazon runs the code for free and you
  don't need an AWS account.

The skill stays private in development mode. You don't publish it, and only your account
can use it.

---

## Step 1: Create the skill

1. Go to the [Alexa developer console](https://developer.amazon.com/alexa/console/ask) and
   click **Create Skill**.
2. **Name:** `My Dashboard`. **Primary locale:** English (US). This must match your Echo's
   language setting; see "Other languages" below.
3. **Type of experience:** *Other*. **Model:** *Custom*. **Hosting service:**
   *Alexa-hosted (Node.js)*. Choose the hosting region closest to you.
4. **Templates:** choose **Start from Scratch**, then click **Create Skill**. Creation
   takes a minute or two.

## Step 2: Add the voice commands

1. In the left menu open **Interaction Model → JSON Editor**.
2. Replace everything with the contents of
   [`skill-package/interactionModels/custom/en-US.json`](../skill-package/interactionModels/custom/en-US.json).
3. Click **Save**, then **Build skill**.

## Step 3: Turn on the screen interface

1. Open **Interfaces** in the left menu.
2. Switch on **Alexa Presentation Language**. If the console asks which viewport
   profiles to support, tick the **Hub Landscape** ones. The Echo Show 11 is a landscape hub.
3. Click **Save Interfaces**, then build the model again.

## Step 4: Add the code

1. Open the **Code** tab at the top.
2. Recreate the files from this repository's [`lambda/`](../lambda) folder, keeping the
   same folder structure. Use the editor's *New file* and *New folder* buttons, then paste
   in each file's contents:

   ```
   lambda/
   ├── index.js          (replace the template's index.js)
   ├── package.json      (replace the template's package.json)
   ├── config.js
   ├── apl/
   │   ├── dashboard.json
   │   └── datasource.js
   └── lib/
       ├── calendar.js
       ├── homeassistant.js
       ├── http.js
       ├── media.js
       ├── tiles.js
       ├── time.js
       └── weather.js
   ```

   You can delete the template's `util.js` and `local-debugger.js` if they exist.
3. Click **Save**, then **Deploy**.

**Faster alternative (if you're comfortable with a terminal):** every Alexa-hosted skill
is backed by a Git repository. With the [ASK CLI](https://developer.amazon.com/en-US/docs/alexa/smapi/quick-start-alexa-skills-kit-command-line-interface.html)
installed and set up (`npm install -g ask-cli`, then `ask configure`), copy the skill ID
from the console (**Build → Endpoint**, or the skills list) and run:

```bash
ask init --hosted-skill-id <your-skill-id>
```

That clones the hosted skill into a new folder. Copy this repository's `lambda/` folder over
the one in the clone, commit, and `git push`. The push deploys the code.

## Step 5: Enable testing and try it

1. Open the **Test** tab and change *Skill testing is enabled in* from *Off* to
   **Development**.
2. On your Echo Show 11, say: **"Alexa, open my dashboard."**

You'll see the dashboard in demo mode: sample tiles, weather and calendar. Tapping a tile
toggles it. The footer says which panels are still showing sample data.

> **Preview without the device:** in the console, open the APL authoring tool
> (**Multimodal Responses** in the left menu), start a blank visual response, and paste [`lambda/apl/dashboard.json`](../lambda/apl/dashboard.json)
> into the APL tab and [`docs/apl-preview-data.json`](apl-preview-data.json) into the Data
> tab. Pick the *Hub Landscape Large* viewport to see the layout.

---

## Step 6: Make it yours (edit `config.js`)

Edit `lambda/config.js` in the console's **Code** tab, then click **Deploy**. Each section
works on its own, so connect them one at a time.

### Weather (no account needed)

Set your coordinates (look them up at https://www.latlong.net) and units:

```js
units: 'celsius',
location: { name: 'Home', latitude: 51.51, longitude: -0.13 },
```

Weather comes from [Open-Meteo](https://open-meteo.com), which is free and needs no key.

### Smart home tiles, cameras and media (Home Assistant)

Custom Alexa skills can't control the devices you set up in the Alexa app; Amazon doesn't
give them access. The tiles control devices through
**[Home Assistant](https://www.home-assistant.io)** instead. Home Assistant is free and
works with almost every brand.

1. Home Assistant must be **reachable from the internet** because the skill runs in
   Amazon's cloud. The easiest way is
   [Home Assistant Cloud (Nabu Casa)](https://www.nabucasa.com), which gives you a remote
   URL. A reverse proxy with HTTPS also works.
2. In Home Assistant, open your **Profile → Security → Long-lived access tokens** and
   create a token.
3. In `config.js`:

   ```js
   homeAssistant: {
     url: 'https://your-id.ui.nabu.casa',
     token: 'paste-token-here',
   },
   ```

4. Change `tiles` to your own entities. The entity ids are in Home Assistant under
   **Settings → Devices & services → Entities**.

   ```js
   tiles: [
     { name: 'Living Room', entity: 'light.living_room', type: 'toggle' },
     { name: 'Movie Time',  entity: 'scene.movie_time',  type: 'scene'  },
     { name: 'Thermostat',  entity: 'climate.home',      type: 'sensor' },
   ],
   ```

   - `toggle`: lights, switches, plugs, fans. Tapping turns them on or off.
   - `scene`: scenes and scripts. Tapping runs them.
   - `sensor`: shows a value and does nothing when tapped.

   The skill can only act on entities listed here. A tap can never reach anything else in
   your Home Assistant.

5. **Camera:** set `camera.haEntity` to a camera entity such as `camera.front_door` to show
   a snapshot that updates every refresh. For **live video**, set `camera.hlsUrl` to an HLS
   stream (`.m3u8`) that's reachable over HTTPS. Most cameras only output RTSP; the
   [go2rtc](https://github.com/AlexxIT/go2rtc) add-on for Home Assistant can convert RTSP
   to HLS.
6. **Media:** set `mediaPlayer.haEntity` to a `media_player.*` entity to show what's
   playing, with a Play/Pause button.

> **Keep your token out of Git.** Paste it only in the console's Code tab. Don't commit
> it to a public repository.

### Calendar

Pick one:

- **Home Assistant calendars:** `calendar.haEntities: ['calendar.family']`. Repeating
  events are handled correctly.
- **Any iCal link:** `calendar.icsUrl: '...'`. In Google Calendar, go to *Settings → your
  calendar → Secret address in iCal format*. With an iCal link, repeating events only show
  their first occurrence, so prefer Home Assistant if you rely on them.

---

## Opening the dashboard automatically

Custom skills can't replace the Echo's home screen. To get close:

- **Routine:** in the Alexa app, create a routine (for example *When: 7:00 AM daily*, or
  *When: motion detected*). Add the action **Customized → "open my dashboard"**, and set
  **From** to your Echo Show 11.
- The dashboard asks the Echo to stay on screen for up to an hour, and refreshes itself
  every `refreshMinutes`. The Echo may still return to its home screen sooner.
- **Tap the clock** to refresh it at any time.

## Other languages

The skill ships with English (US). If your Echo is set to a different English locale
(UK, India, Canada, Australia), add that locale in the console (**language dropdown → Language
settings**). Then paste the same interaction model JSON for it, and build again.

## Troubleshooting

| Problem | Fix |
|---|---|
| "I don't know that" when you say "open my dashboard" | Check that testing is set to **Development** (Step 5) and that the locale matches your Echo's language. |
| The skill speaks but shows nothing | Turn on the APL interface (Step 3) and build again. |
| Footer says "Can't reach Home Assistant" | The URL must work from outside your home network over HTTPS. Check the token. |
| A tile says "Not found" | The entity id in `config.js` doesn't exist in Home Assistant. |
| Camera snapshot is blank | Your Echo loads the image directly, so Home Assistant's URL must be reachable from the Echo too. |
| Something else | In the console, open **Code → CloudWatch Logs** to see error messages. |

## Running the tests locally (optional)

```bash
npm install
npm test
npm run preview-data -- America/New_York
```

`npm run preview-data` takes the time zone after `--`. It regenerates
`docs/apl-preview-data.json` from your `config.js`.
