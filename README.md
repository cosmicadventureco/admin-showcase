# Evergrove Wellness: platform showcase

An interactive, clickable showcase of the Cosmic Intake platform, rebranded as a
fictional wellness business. Use it to pitch the custom build: press
**Play Showcase** and the app tours itself for about 2.5 minutes with a visible
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

## Presenting

- **Play Showcase** (top right): restores the sample data, then plays 6 chapters
  in about 6 minutes at normal speed: Client app (free account), Client app
  (Premium member), Work queue, Energetic scans, Premium Course, Shop & drop-ship.
  - **« 10s** (or Left arrow) goes back about 10 seconds. The app's data is put
    back the way it was and the tour replays to that point.
  - **» 1×** (or F) speeds up: 1×, 2× (about 3 minutes), 4×.
- Open `/?play` (or `/#play`) to start the tour on load. Handy for a kiosk
  screen or a screen recording.
- The client app opens at `/app` (or `/#client`). The **Team console / Client app**
  switch at the top moves between the two.
- Deep links to a section: `/#queue`, `/#dashboard`, `/#schedule`, `/#clients`, `/#messages`,
  `/#intake`, `/#agreements`, `/#program` (Premium Course), `/#shop`, `/#newsletter`, `/#videos`.
- For recording, a 1440×900 browser window at 100% zoom looks best.

## Two interfaces

**Client app** (`/app`): what clients use, on a phone or computer.

- **New visitor:** a short questionnaire (goals, diet, allergies, health screening,
  consent) creates a **free account** with a personal supplement plan.
- **Free account:** sees their plan, adds it all to the cart in one tap, can
  subscribe and save 15%, watches free classes, and buys **short courses from
  $59 to $119** (theirs to keep, with downloads). They can **book a Certified
  Practitioner**: $99 for 30 minutes, or +$49 for a full hour, paid at booking.
  They also track orders, skip or pause refills, and ask the team a question.
- **Premium Course member ($2,995, or 3 x $1,035):** sees their course week,
  Thursday's live Zoom and member pricing. Benefits shown to clients:
  energetics assessment and work, additional testing, a 12-week course built
  around them, weekly live Zoom, 20% off every supplement, free shipping, every
  short course included, and 25% off one-to-one sessions.

Use "Preview as" beside the phone to switch between a new visitor, a free
account and a Premium member.

**Team console**: the back office. Everything a client does in the app lands
here. Orders go to the approval queue, questions go to a shared inbox, and
purchases appear in the activity log.

### Work queue: handing off the admin role

Built for the situation where one employee does all the admin and is leaving.

- **Needs a person:** one shared list of the only jobs left for people.
  These are order approvals, client questions, a failed payment and test
  results to review. Each is labelled with the role that handles it
  (Assistant, Practitioner, Owner, Anyone).
- **Automations:** twelve automations as working controls, each with an on/off
  switch, its own settings, a log and "Run now". Order approval and the
  scan-report sign-off cannot be switched off. Some settings drive the rest
  of the showcase: the clinic order threshold, the margin warning, how many
  remedies a scan report carries, and whether plan and tracking emails go
  out. Shop > Automations shows the order-related ones.
- **Activity log:** everything the system did on its own.
- **Team & handoff:** who can do what, and a sample handoff checklist.

### Suppliers and ordering (Shop > Suppliers, Clinic orders)

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
- **Clinic orders:** stock collects per supplier, each unit earmarked for a
  client, and goes out as one order (Physica: at $500 for free shipping). The
  pick list says who each unit is for. Small drop-ship orders that lose money
  after shipping can be moved into the clinic order.
- **Policy check:** the Premium "20% off every supplement" benefit conflicts
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

The case for the build, kept off the working screens: what the dashboard is
for, the admin hours it replaces (about 28.5 a week to 4, estimates), the
client journey it runs with what is automatic and where a person steps in,
advertising that stays inside the supplier rules, and a revenue calculator
with illustrative inputs. The tour ends here.

## What it shows, and what is "proven" versus "custom build"

Each screen has a banner saying whether the feature already runs in production
(the Cosmic Intake app) or is proposed new work for the wellness client.

| Screen | Status | What it demonstrates |
|---|---|---|
| Client app | Custom | Free plan from a questionnaire, one-tap ordering, subscribe & save, free classes and $59-$119 short courses, practitioner booking ($99 / 30 min, +$49 for an hour), Premium member home, order tracking, ask the team |
| Energetic scans | Custom (builder exists) | Scan exports to a reviewed, signed-off report in the client app, with remedies linked to the shop |
| Work queue | Custom | Shared to-do list with roles, the automation map of the admin job, activity log, roles and handoff checklist |
| Dashboard | Proven | KPIs, needs-attention list, today's sessions, revenue chart |
| Client messaging | Proven | Template composer with auto-filled wording and live preview |
| Wellness intake | Proven + new | Consent with drawn signature and health screening (proven), then an instant personalised supplement and video plan (new) |
| Clients | Proven | Searchable records, consent audit, sent-email log, client drawer |
| Schedule | Proven | Upcoming sessions with paperwork status per guest, reminders, calendar |
| Quotes & agreements | Proven | Line items with auto-calculated totals, e-signature |
| Premium Course | Custom | $2,995 all-inclusive 3-month course (or 3 x $1,035): sales page, enrollment with signed agreement, energetics assessment and testing status, 12 weekly modules customised per member with downloads, weekly live Zoom with practitioners, 20% member pricing in the shop |
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
public/client.js     the client app
public/queue.js      the Work queue
public/scans.js      energetic scans and the client report
public/tour.js       the Play Showcase player (cursor, captions, script)
```

To change the tour, edit `CHAPTERS` in `public/tour.js`. Each step is a plain
`await click(...)`, `await type(...)`, `await spot(...)` or `say(title, text)`.
