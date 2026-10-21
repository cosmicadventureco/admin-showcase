# Evergrove Wellness: platform showcase

An interactive, clickable showcase of the Cosmic Intake platform, rebranded as a
fictional wellness business. Use it to pitch the custom build: press
**Play Showcase** and the app tours itself for about 6 minutes with a visible
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

## Deploy

**Automatic:** every push to `main` deploys through `.github/workflows/deploy.yml`.
It needs two repository secrets, set once under Settings > Secrets and variables >
Actions: `CLOUDFLARE_API_TOKEN` (a token with "Edit Cloudflare Workers"
permission) and `CLOUDFLARE_ACCOUNT_ID`. Until they exist, the Deploy run fails
with a red cross and nothing is published.

**By hand (about 2 minutes):**

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

## The structure

The showcase is deliberately small: four tools that carry the practice day to
day, plus the client app. Everything else that was prototyped (newsletters,
video library, work queue, automation settings, clinic batching, Shopify,
quotes) is still in the code but hidden, and listed on the Outcome page as
"ready to add later".

**Practice side** (Home shows four big buttons, a Checklist and Upcoming
Appointments for the week; The Outcome sits apart at the bottom of the menu):

1. **Client Portal:** the client list, and one page per client with tabs:
   Basic information, Bookings & packages, Billing & payments, Protocols (the
   PDF of their recommendations), Messages (the thread with the client, who
   writes from their app), Notes, Forms & waivers, Documents (scan reports,
   protocols, uploads).
2. **Shop:** Orders (the approval queue and the order pipeline), Products,
   Suppliers. Nothing reaches a supplier until a person approves it.
3. **Client Report Creator:** step 1 is at the top of the page: pick the
   client and upload the four scan files (RR, RC, SS, IMB). Then review, sign
   off and publish. The report is saved to the client's documents and app, and
   "Next: build the protocol" hands over to the Protocol Creator.
4. **Protocol Creator:** a list of every protocol with "View report" (the
   printable protocol report), plus the creator itself: suggestions from the client's latest report first, then from
   their goals. The practitioner sets dose, weeks, how to take it and the times
   of day (morning, midday, evening, bedtime). Publishing puts the schedule and
   reminders in the client's app and the PDF in their documents. "Order these
   remedies" sends one order to the Shop, sized for the length of the protocol.

**Client view** (`/app`):

- **Free account:** a short questionnaire gives a wellness snapshot (no product
  suggestions: those are what the Premium Course is for), free classes, short
  courses from $59 to $119, and Certified Practitioner booking ($99 / 30 min,
  +$49 for an hour). The shop opens after a consultation or with the course.
- **Premium Course ($6,995, or 3 x $2,395):** today's protocol with tick-offs
  and reminders, the full protocol and one-tap reorder, their scan report, the
  course week and Thursday's live Zoom.
- **Everyone:** a Messages screen (chat icon, top of the app) to write to their
  practitioner. Replies come from the client's Messages tab in the Client Portal.

Data lives in the browser for the showcase; the real build adds a database.

Use "Preview as" beside the phone to switch between a new visitor, a free
account and two Premium members.

## Presenting

- **Play Showcase** (top right): restores the sample data, then plays 8
  chapters in about 6 minutes at normal speed: Home, Client Portal, Client
  Report Creator, Protocol Creator, What the client sees, Free accounts, Shop,
  The Outcome.
  - **« 10s** (or Left arrow) goes back about 10 seconds. The app's data is put
    back the way it was and the tour replays to that point.
  - **» 1×** (or F) speeds up: 1×, 2× (about 3 minutes), 4×.
- Open `/?play` (or `/#play`) to start the tour on load.
- Deep links: `/#dashboard`, `/#clients`, `/#shop`, `/#scans`, `/#protocols`,
  `/#outcome`, `/#client`.
- For recording, a 1440×900 browser window at 100% zoom looks best.

### Suppliers and ordering (Shop > Suppliers)

Physica Energetics, Biotics Research and DesBio, from their public websites
(checked October 2026) and the supplier handoff brief.

| Supplier | Their store | How an approved order reaches them | Patient dispensary |
|---|---|---|---|
| Physica Energetics | BigCommerce | Browser extension fills the cart in the practitioner's logged-in tab | Patient Portal (to confirm) |
| Biotics Research | Shopify | Cart link builds the whole cart in the logged-in account | eStoreRx, Fullscript |
| DesBio | WooCommerce | Extension or add-to-cart links in the logged-in session | dbscript (US only) |

- **Nothing logs in to a supplier with stored passwords.** Every path runs in a
  session the practitioner opened; they click checkout. Suppliers without a
  cart mechanism get an email purchase order or a manual queue task.
- **Physica terms:** practitioner-only; drop-ship to patients allowed; $20 flat
  shipping under $500 (US), free from $500; packing slips show no prices;
  Canada 90-day supply. No public prices, no marketplaces or shopping feeds,
  practitioner-patient relationship before purchase, minimum advertised price.
- **Clinic orders (hidden for now):** stock collects per supplier, each unit earmarked for a
  client, and goes out as one order (Physica: at $500 for free shipping). The
  pick list says who each unit is for. Small drop-ship orders that lose money
  after shipping can be moved into the clinic order.
- **Policy check:** the Premium "20% off every supplement" benefit (still shown in the course benefits) conflicts
  with Physica's minimum advertised price and Biotics' suggested-retail rule.
  Needs written approval from each, or a different benefit.
- **Shopify:** orders from a members-only Shopify store land in the same
  approval queue. These brands must stay behind customer login, unindexed and
  out of Google, Shop app and social channels.
- **Not verified from here:** the Biotics `products.json` and DesBio Store API
  endpoints, the cart mechanisms on a logged-in session, and the DesBio
  policies page. Search results also show an FDA warning letter to DesBio
  dated October 1, 2026 about one product.
- **HIPAA:** if the clinic is a covered entity, client names, remedies and
  addresses are protected health information. Business associate agreements,
  encryption, audit logs and access control then need to be scoped and priced.

### Energetic scans to client reports

The clinic's in-house scan produces four exports (RR resonance/organ readings,
RC root cause, SS symptom support, IMB imbalance markers). Their existing
report builder turns those into a client report on one computer. The showcase
connects that flow to everything else:

1. **Add the exports** to the client's scan (four slots, as in the builder).
2. **Extract:** organ readings with dials, findings sorted into report sections,
   dilution notes on IMB markers ("May be low"...), and remedies ranked RC
   first, then SS, by dilution. Supplier wording with claim language
   ("eliminate", "cures"...) is flagged for rewording.
3. **Review:** untick items, change readings, reorder remedies, set how many
   go in the report.
4. **Sign off and publish:** a practitioner must confirm before it goes out.
   The client is emailed, the report appears in their app, and their
   remedies are one tap from the cart (still through the order approval).

The extraction is simulated with invented sample data and an invented report
name ("Evergrove Resonance Map"). Building it for real needs one or two sets
of real exports with names removed, to confirm the parser against the actual
PDF layout.

### Outcome (last page)

The case for the build, kept off the working screens: the four tools, the
admin hours they replace (about 20 a week to 3, estimates to confirm with the
team), and what can be added later. The tour ends here.

### Drop-shipping always needs a person

Every order (protocol orders, client reorders, Shopify) stops in the approval
queue on Shop > Orders, showing each line, its supplier, cost and margin. For a
client with a screening flag (blood thinner, pregnancy, thyroid) the Approve
button stays disabled until the reviewer confirms. Only then is the supplier
cart filled in the practitioner's own logged-in tab.

The suggestion rules in `public/data.js` (`protoSuggestions()`, `recommend()`)
are demonstration logic only, not medical advice.

## Files

```
wrangler.toml          separate Worker, static assets only, no bindings
public/index.html      shell: top bar, nav, Play Showcase button
public/app.css         styles
public/data.js         sample data, suppliers, suggestion rules
public/app.js          core, Shop, and the hidden extra screens
public/portal.js       Home and the Client Portal
public/scans.js        client report creator
public/protocols.js    protocol creator and the protocol document
public/client.js       the client app
public/outcome.js      the Outcome page
public/queue.js, automations.js   hidden for now ("later" features)
public/tour.js         the Play Showcase player (cursor, captions, script)
```

To change the tour, edit `CHAPTERS` in `public/tour.js`. Each step is a plain
`await click(...)`, `await type(...)`, `await spot(...)` or `say(title, text)`.
