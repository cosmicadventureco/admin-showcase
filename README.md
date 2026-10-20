# Evergrove Wellness: platform showcase

An interactive, clickable showcase of the Cosmic Intake platform, rebranded as a
fictional wellness business. Use it to pitch the custom build: press
**Play Showcase** and the app tours itself for about 3 minutes with a visible
demo cursor, or click around freely.

Everything is sample data. "Evergrove Wellness", every client, order, practitioner
and number is invented. The product names in the shop come from the public
catalogue of Physica Energetics, the client's main supplier. Their prices are
practitioner-only, so every price and cost shown is a placeholder. Emails and orders are simulated and never leave the browser.

## Why it is safe to run next to the live app

- It is a **separate Worker** (`wellness-showcase`) with its own `wrangler.toml`.
- It has **no D1 database, no R2 bucket and no Resend key**. It has no way to reach
  the live intake records or send real email.
- Nothing in `cosmic-intake/` was changed. This folder doesn't import from it.
- Data lives in each visitor's own browser (localStorage). "Reset sample data"
  or Play Showcase restores the original sample set.

## Deploy (about 2 minutes)

```bash
cd wellness-showcase
npx wrangler deploy
```

It prints a URL like `https://wellness-showcase.<your-subdomain>.workers.dev`.

**Same domain as the live app, different hostname:** uncomment the `routes` line
in `wrangler.toml`, set e.g. `showcase.cosmicadventureco.net`, and deploy again.
Cloudflare creates the DNS record for you. The live intake Worker is unaffected.

**Different domain:** same thing, with any domain on your Cloudflare account.

**Local preview:** `npx wrangler dev`, or just open `public/index.html` through
any static server (`python3 -m http.server -d public 8080`).

## Presenting

- **Play Showcase** (top right): restores the sample data, then plays 9 chapters
  (Dashboard, Messaging, Intake, Clients, Schedule, 3-Month Program, Shop &
  drop-ship, Newsletter, Quotes).
  - `Space` pause or resume, `→` next chapter, `Esc` exit.
- Open `/?play` (or `/#play`) to start the tour on load. Handy for a kiosk
  screen or a screen recording.
- Deep links to a section: `/#dashboard`, `/#schedule`, `/#clients`, `/#messages`,
  `/#intake`, `/#agreements`, `/#program`, `/#shop`, `/#newsletter`, `/#videos`.
- For recording, a 1440×900 browser window at 100% zoom looks best.

## What it shows, and what is "proven" versus "custom build"

Each screen has a banner saying whether the feature already runs in production
(the Cosmic Intake app) or is proposed new work for the wellness client.

| Screen | Status | What it demonstrates |
|---|---|---|
| Dashboard | Proven | KPIs, needs-attention list, today's sessions, revenue chart |
| Client messaging | Proven | Template composer with auto-filled wording and live preview |
| Wellness intake | Proven + new | Consent with drawn signature and health screening (proven), then an instant personalised supplement and video plan (new) |
| Clients | Proven | Searchable records, consent audit, sent-email log, client drawer |
| Schedule | Proven | Upcoming sessions with paperwork status per guest, reminders, calendar |
| Quotes & agreements | Proven | Line items with auto-calculated totals, e-signature |
| 3-Month Program | Custom | $2,995 all-inclusive program (or 3 x $1,035): sales page, enrollment with signed agreement, energetics assessment and testing status, 12 weekly modules customised per member with downloads, weekly live Zoom with practitioners, 20% member pricing in the shop |
| Shop & fulfilment | Custom | Client storefront for the Physica Energetics range plus nutritionals, member pricing, and drop-ship fulfilment behind an approval queue |
| Newsletter | Custom | Goal-based segments, per-reader product pick, campaign revenue |
| Video library | Custom | Goal-tagged classes assigned by the intake, watch progress |

### Drop-shipping always needs a person

Every order, including auto-ship refills and starter orders from program
enrollment, stops in the **approval queue** on Shop > Orders. The card shows
each line, which supplier it goes to, the supplier cost and the margin.

1. **Approve order**. For a client with a screening flag (blood thinner,
   pregnancy, thyroid), the button stays disabled until the reviewer ticks
   "I have reviewed ... this order is appropriate".
2. **Yes, send to supplier** confirms what goes to which supplier and for how much.

Only then does routing, tracking email and refill scheduling run. The rule
"A person approves every order" is shown on Automations as always on and has
no switch. Orders can also be put on hold.

The recommendation rules (in `public/data.js`, `recommend()`) are demonstration
logic only: they score products by goal overlap, drop anything the diet or an
allergy rules out, and flag pregnancy, blood thinners and thyroid conditions for
practitioner review. They are not medical advice.

## Files

```
wrangler.toml        separate Worker, static assets only, no bindings
public/index.html    shell: top bar, nav, Play Showcase button
public/app.css       styles (light and dark)
public/data.js       sample data + recommendation engine
public/app.js        the nine screens
public/tour.js       the Play Showcase player (cursor, captions, script)
```

To change the tour, edit `CHAPTERS` in `public/tour.js`. Each step is a plain
`await click(...)`, `await type(...)`, `await spot(...)` or `say(title, text)`.
